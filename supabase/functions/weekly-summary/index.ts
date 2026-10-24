// ============================================================
//  Session Terminal : weekly-summary  (Supabase Edge Function)
//
//  The assistant's weekly summary (24 Oct 2026, Nestor: "A weekly summary from the assistant" - "i like this plan do it!").
//  Every Sunday at 18:00 London time (cron job st-weekly-summary -> st_weekly_summary_tick(), which only calls this at 18:xx
//  London on a Sunday), each member who traded, posted a bias or reviewed a trade that week gets a short summary written from
//  their own week: the trades and their R, the rules kept, the setups that worked, one thing to focus on next week. Good news
//  first; a mistake is never stated as fact (the greetings' rule).
//
//  It is stored in weekly_summaries (one row per member and week - a second run the same evening skips who already has one),
//  pushed to the member's phone (kind "weekly": quiet hours respected), and shown in the app on Session Bias as an assistant
//  card until they press Got it (read_at).
//
//  Since 24 Oct 2026 (Nestor: "good but very text heavy ... doesnt have any charts or data displays") the card is mostly data: the
//  week's numbers (net R, trades, win rate, days traded of planned, R per day, the best trade, the rule checks) are worked out here
//  and stored in the row's `card`, so the card and the words always agree, and the words are two short lines - a highlight and a
//  focus for next week - returned as JSON.
//
//  Budget: members whose plan has the AI greetings (paid, trial, the chat plans), one call each at low effort, and a
//  ceiling of MAX_MEMBERS a run. Each call is logged in ai_usage (mode "weekly"), so the AI meter counts it.
//
//  Guarded by the x-cron-key header (NUDGE_CRON_KEY, the vault's nudge_cron_key). Deploy with "Verify JWT" OFF:
//    supabase functions deploy weekly-summary --no-verify-jwt --project-ref figozyxoyobixadhqewr
//
//  { mode:"dry", user, now?, noModel?, lang? } builds one member's week and returns the facts and the text - nothing stored, nothing
//  sent. For testing on Nestor's own data only.
// ============================================================

import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendPush } from "../_shared/nudges.ts";

// deno-lint-ignore no-explicit-any
type Any = any;
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
// The strong model (st-assistant's MODEL_SMART): on 24 Oct 2026 the light one invented a reason in Spanish ("trading without outside
// indicators was your best tool") on a dry run. One call per member a week: a few pence.
const MODEL = "claude-sonnet-5";
const ALLOW_ID: Record<string, 1> = { "ccaf6a5e-69ed-443c-8d92-bc7fdd464f49": 1, "94f5945f-d819-4abb-bb87-95646906302f": 1 };   // Nestor, + st-assistant's ALLOW_ID
const CHAT_PLANS = new Set(["bundle", "mentorship", "comp"]);
const TRIAL_DAYS = 14;                            // as st-assistant / app.html
const MAX_MEMBERS = 300;

Deno.serve(async (req) => {
  const key = Deno.env.get("NUDGE_CRON_KEY");
  if (!key || req.headers.get("x-cron-key") !== key) return json({ error: "forbidden" }, 403);
  let body: Any = {};
  try { body = await req.json(); } catch (_) { body = {}; }
  try {
    const now = body && body.now ? Date.parse(String(body.now)) || Date.now() : Date.now();
    if (body && body.mode === "dry") {
      if (!body.user) return json({ error: "user required" }, 400);
      return json(await runOne(String(body.user), now, { dry: true, noModel: !!body.noModel, lang: body.lang === "es" ? "es" : body.lang === "en" ? "en" : undefined }), 200);
    }
    return json(await runAll(now), 200);
  } catch (e) {
    console.error("weekly-summary", String(e && (e as Error).stack || e));
    return json({ error: "failed" }, 500);
  }
});

// ---------- the week, in the member's own time zone ----------
function dayKey(ms: number, tz: string): string {
  try { return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms)); }
  catch (_) { return new Date(ms).toISOString().slice(0, 10); }
}
function addDays(key: string, n: number): string { const d = new Date(key + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function mondayOf(key: string): string { const d = new Date(key + "T12:00:00Z"); return addDays(key, -((d.getUTCDay() + 6) % 7)); }
function isoWeek(monday: string): string {
  const d = new Date(monday + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 3);   // that week's Thursday
  const y = d.getUTCFullYear(), jan4 = new Date(Date.UTC(y, 0, 4, 12));
  const wk = 1 + Math.round(((d.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return y + "-W" + String(wk).padStart(2, "0");
}

// ---------- who may get one ----------
async function eligible(ids: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  if (!ids.length) return out;
  const { data } = await admin.from("profiles").select("id, plan, is_paid, created_at, trial_days, trial_ended_at").in("id", ids);
  for (const p of (data || [])) {
    const days = Number(p.trial_days) > 0 ? Number(p.trial_days) : TRIAL_DAYS;
    const created = p.created_at ? Date.parse(p.created_at) : NaN, ended = p.trial_ended_at ? Date.parse(p.trial_ended_at) : NaN;
    const trial = p.is_paid !== true && (!isFinite(created) || Date.now() < created + days * 86400000) && !(isFinite(ended) && Date.now() >= ended);
    if (ALLOW_ID[p.id] || p.is_paid === true || trial || CHAT_PLANS.has(String(p.plan))) out.add(String(p.id));
  }
  for (const id of ids) if (ALLOW_ID[id]) out.add(id);
  return out;
}

// ---------- the member's week, from their journal ----------
async function loadWeekJournal(userId: string) {
  const { data } = await admin.from("journals").select(
    "s:data->settings, un:data->userName, acc:data->accounts, cs:data->currentSeries, h:data->history, rs:data->reviewSlots, " +
    "bh:data->biasHistory, wr:data->weeklyRules, nl:data->nudgeLog, wc:data->weeklyCommitments, toff:data->timeOff",
  ).eq("user_id", userId).maybeSingle();
  return data || null;
}
function allTrades(j: Any): Any[] {
  const out: Any[] = [], seen = new Set<string>();
  const sep = new Set<string>((Array.isArray(j.acc) ? j.acc : []).filter((a: Any) => a && a.separate).map((a: Any) => String(a.id)));
  const keysOf = (t: Any) => [t.id, t.seriesId, t.mt5Ticket ? "tk" + t.mt5Ticket : null].filter(Boolean).map(String);
  const add = (t: Any) => {
    if (!t || !t.result || (t.accountId && sep.has(String(t.accountId)))) return;   // a test account stays out of combined figures
    const ks = keysOf(t);
    if (ks.some((k) => seen.has(k))) return;
    ks.forEach((k) => seen.add(k));
    out.push(t);
  };
  (Array.isArray(j.cs) ? j.cs : []).forEach(add);
  (Array.isArray(j.h) ? j.h : []).forEach((s: Any) => (s && Array.isArray(s.trades) ? s.trades : []).forEach(add));
  // the Trade Log's trades not saved yet (an undated one takes its review's day at noon, as saving it does)
  const slots = Array.isArray(j.rs) ? j.rs : (j.rs && typeof j.rs === "object" ? Object.values(j.rs) : []);
  slots.forEach((r: Any) => (r && Array.isArray(r.trades) ? r.trades : []).forEach((t: Any) => add(t && !t.date && r.sessionDate ? Object.assign({}, t, { date: r.sessionDate + "T12:00:00" }) : t)));
  return out;
}
// A trade's realised R, as the app's tradeRforMath: net money (the real result when imported, else the logged R) over the money
// risked; a loss stays negative; with no risk logged, the logged R for a win, -1 for a loss, 0 for a break-even.
function realR(t: Any): number {
  const res = t && t.result; if (res !== "Win" && res !== "Lose" && res !== "BE") return 0;
  const risk = parseFloat(t.risk) || 0, r = parseFloat(t.r) || 0;
  if (risk > 0) {
    const gross = t.actualGross != null ? Number(t.actualGross) : (res === "Win" ? r * risk : res === "Lose" ? -risk : 0);
    const rr = (gross - Math.abs(parseFloat(t.costs) || 0)) / risk;
    if (isFinite(rr)) return res === "Lose" ? (rr < 0 ? rr : -1) : rr;
  }
  return res === "Win" ? r : res === "Lose" ? -1 : 0;
}
// The week's planned trading days: its own saved week ([] = a week off), else the usual days, without days off.
function plannedDays(j: Any, monday: string, upTo: string): number {
  const wc = (j && j.wc) || {}, td = j && j.s && Array.isArray(j.s.tradingDays) && j.s.tradingDays.length ? j.s.tradingDays.map(Number) : [1, 2, 3, 4, 5];
  const days: number[] = Array.isArray(wc[monday]) ? wc[monday].map(Number) : td;
  const off = Array.isArray(j && j.toff) ? j.toff : [];
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const k = addDays(monday, i); if (k > upTo) break;
    const dow = new Date(k + "T12:00:00Z").getUTCDay();
    if (days.indexOf(dow) < 0) continue;
    if (off.some((r: Any) => r && r.from && r.to && k >= r.from && k <= r.to)) continue;
    n++;
  }
  return n;
}
// The rule checks on the card: each one is kept (green) unless a nudge about it was shown that week (amber, with how many days).
// The rules a member sets per account (trades a day, daily loss, risk per trade) show only when one is set; the others always.
// Only nudges that mean the rule was crossed count - "less than one trade left before your daily loss" is a heads-up, not a flag.
const RULE_CHIPS: [string, string[]][] = [
  ["session", ["outside", "finished"]], ["trades", ["limit", "ea_trades"]], ["daily", ["daily_hit"]], ["risk", ["big_risk", "widen", "ea_risk"]],
  ["stop", ["no_stop", "ea_sl"]], ["news", ["news_open", "news_hold"]], ["bias", ["against_bias", "no_bias"]],
];
function ruleChecks(j: Any, nl: Any, inWeek: (k: string) => boolean) {
  const rr = (Array.isArray(j && j.acc) ? j.acc : []).filter((a: Any) => a && !a.separate).map((a: Any) => a.riskRules || {});
  const on = (mode: Any, amt: Any, pct: Any) => mode === "pct" ? parseFloat(pct) > 0 : mode === "amount" ? parseFloat(amt) > 0 : (parseFloat(amt) > 0 || parseFloat(pct) > 0);
  const set: Record<string, boolean> = {
    trades: rr.some((r: Any) => parseFloat(r.maxTrades) > 0),
    daily: rr.some((r: Any) => on(r.maxLossMode, r.maxLossAmount, r.maxLossPct) || on(r.firmDailyMode, r.firmDailyAmount, r.firmDailyPct)),
    risk: rr.some((r: Any) => on(r.maxRiskMode, r.maxRiskAmount, r.maxRiskPct)),
  };
  return RULE_CHIPS.map(([id, rules]) => ({
    id,
    flagged: Object.keys(nl).filter((k) => inWeek(k) && Object.keys(nl[k] || {}).some((x) => x.indexOf("sample:") !== 0 && rules.indexOf(String(nl[k][x] && nl[k][x].rule)) >= 0)).length,
  })).filter((c) => c.flagged > 0 || !(c.id in set) || set[c.id]);
}
const NUDGE_TOPIC: Record<string, string> = {
  daily_hit: "daily loss limit", daily_left: "daily loss limit", dd_left: "maximum drawdown", target_hit: "profit target reached",
  consistency: "consistency rule", ea_risk: "risk per trade", big_risk: "risk per trade", risk: "risk per trade", widen: "risk per trade",
  ea_trades: "trades per day", limit: "trades per day", finished: "trades per day", ea_sl: "stop loss", no_stop: "stop loss",
  outside: "trading outside the session", news_hold: "red news", news_open: "red news", news_soon: "red news",
  against_bias: "the morning bias", no_bias: "the morning bias", reentry: "re-entering soon after a loss", streak: "losing streak",
};
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function dayName(key: string): string { const d = new Date(key + "T12:00:00Z"); return isNaN(d.getTime()) ? key : DAYS[d.getUTCDay()] + " " + key; }
export function weekFacts(j: Any, now: number) {
  const tz = (j && j.s && j.s.tz) || "Europe/London", today = dayKey(now, tz), monday = mondayOf(today);
  const inWeek = (k: string) => k >= monday && k <= today;
  const trades = allTrades(j).filter((t) => { const ms = Date.parse(String(t.date || "")); return isFinite(ms) && inWeek(dayKey(ms, tz)); })
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const rOf = realR;
  const wins = trades.filter((t) => t.result === "Win"), losses = trades.filter((t) => t.result === "Lose"), bes = trades.filter((t) => t.result === "BE");
  const netR = trades.reduce((a, t) => a + rOf(t), 0);
  const bySetup: Record<string, Any> = {};
  trades.forEach((t) => { const k = String(t.setup || "").trim(); if (!k) return; const g = bySetup[k] = bySetup[k] || { setup: k, trades: 0, wins: 0, losses: 0, bes: 0, r: 0 }; g.trades++; g.r += rOf(t); if (t.result === "Win") g.wins++; else if (t.result === "Lose") g.losses++; else g.bes++; });
  const setups = Object.values(bySetup).sort((a: Any, b: Any) => b.r - a.r).slice(0, 4).map((g: Any) => Object.assign(g, { r: Math.round(g.r * 100) / 100 }));
  const best = trades.slice().sort((a, b) => rOf(b) - rOf(a))[0];
  const dayOf = (t: Any) => dayKey(Date.parse(t.date), tz);
  const tradedDays = Array.from(new Set(trades.map(dayOf)));
  const reviewed = trades.filter((t) => t.reviewSnap && (t.reviewSnap.execution || t.reviewSnap.reflection || (t.reviewSnap.mindset || []).length));
  const flawless = trades.filter((t) => t.reviewSnap && t.reviewSnap.execution === "Flawless").length;
  const biases = (Array.isArray(j.bh) ? j.bh : []).filter((b: Any) => b && b.dateKey && inWeek(String(b.dateKey)));
  const nl = (j && j.nl && typeof j.nl === "object") ? j.nl : {};
  const nDays = Object.keys(nl).filter((k) => inWeek(k) && Object.keys(nl[k] || {}).some((x) => x.indexOf("sample:") !== 0));
  // what the nudges were about, by topic and how many - never their wording: a nudge is a reminder, not proof (greetings' rule)
  const topics: Record<string, number> = {};
  nDays.forEach((k) => Object.keys(nl[k] || {}).forEach((x) => { const rl = nl[k][x] && nl[k][x].rule, tp = x.indexOf("sample:") !== 0 && NUDGE_TOPIC[String(rl)]; if (tp) topics[tp] = (topics[tp] || 0) + 1; }));
  const rule = j && j.wr && j.wr[isoWeek(monday)];
  const r2 = (v: number) => Math.round(v * 100) / 100, wl = wins.length + losses.length;
  const perDay = [0, 1, 2, 3, 4, 5, 6].map((i) => { const k = addDays(monday, i), ts = trades.filter((t) => dayOf(t) === k); return { key: k, dow: i + 1, r: r2(ts.reduce((a, t) => a + rOf(t), 0)), n: ts.length }; });
  const card = {
    week: monday, netR: r2(netR), trades: trades.length, wins: wins.length, losses: losses.length, bes: bes.length,
    winRate: wl ? Math.round(wins.length / wl * 100) : null, daysTraded: tradedDays.length, plannedDays: plannedDays(j, monday, addDays(monday, 6)),
    days: perDay.filter((d) => d.dow <= 5 || d.n > 0),   // Monday to Friday, and a weekend day only when it was traded
    best: best && rOf(best) > 0 ? { r: r2(rOf(best)), key: dayOf(best) } : null,
    rules: ruleChecks(j, nl, inWeek),
  };
  return {
    card,
    name: String((j && j.un) || "").trim().split(/\s+/)[0] || null,
    language: (j && j.s && j.s.lang === "es") ? "Spanish" : "English",
    week: { from: monday, to: addDays(monday, 6), today },
    trades: trades.length, wins: wins.length, losses: losses.length, breakEvens: bes.length, netR: Math.round(netR * 100) / 100,
    bestTrade: best && rOf(best) > 0 ? { r: Math.round(rOf(best) * 100) / 100, setup: best.setup || null, day: dayName(dayOf(best)) } : null,
    setups,
    reviewedTrades: reviewed.length, flawlessExecutions: flawless,
    daysTraded: tradedDays.length,
    biasesPosted: biases.length,
    observationDays: biases.filter((b: Any) => b.mode === "Observation").length, executionDays: biases.filter((b: Any) => b.mode === "Execution").length,
    tradedDaysWithoutAnyNudge: tradedDays.filter((d) => nDays.indexOf(d) < 0).length,
    daysWithNudges: nDays.length, nudgeTopics: Object.keys(topics).map((t) => ({ about: t, times: topics[t] })),
    ruleOfTheWeek: rule && rule.rule ? { rule: String(rule.rule), followed: rule.followed === true ? true : rule.followed === false ? false : null } : null,
  };
}

// ---------- the words ----------
const SYSTEM = `You write a member's weekly summary for Session Terminal, a trading journal. It arrives as a phone notification and an in-app card on Sunday evening.

The card already shows their numbers (net R, trades, win rate, days traded, R per day, the rule checks), so you write only two short lines, in the language given in the data (English or Spanish):
- highlight: the best thing about their week, warm and specific (a winning setup, rules kept, showing up, a clean review). Good news first, always. 25 words or fewer.
- focus: one thing to focus on next week, a friendly suggestion drawn only from the data. 25 words or fewer.

Answer with JSON only, nothing before or after it: {"highlight": "...", "focus": "..."}

Rules:
- Use only the facts in the data. Every sentence must rest on a field in the data: never invent trades, numbers, setups, tools, habits or reasons.
- Never state a mistake as fact or blame. Nudges are reminders the app showed during the week, not proof that anything went wrong. Mention them at most once, softly, by topic ("the app reminded you about your trades per day on two days - worth a look"). Never write that the member broke, exceeded, moved, widened or ignored anything.
- Name a weekday only if it is given in the data.
- R means risk multiple, already net of costs. Write +2.4R / -1R. No money amounts.
- Use their first name once at most, in the highlight. No greeting, no sign-off, no emojis, no markdown.
- Never mention ICT, SMC or liquidity.
- If they did not trade, praise the preparation they did (biases, reviews) and keep it short.
- Sitting a day out (an Observation day, or no trade) is a disciplined choice. Never suggest trading more days or taking more trades.
- Say a rule was kept only when the data says so (ruleOfTheWeek.followed true, or traded days without any nudge).
- English is British English (colour, totalling). Check your grammar and spelling before you answer.`;

type Lines = { highlight: string; focus: string; model: string };
function fallback(f: Any): Lines {
  const es = f.language === "Spanish", n = f.name ? f.name + ", " : "";
  const best = f.bestTrade ? "+" + Number(f.bestTrade.r).toFixed(2) + "R" : null;
  const highlight = f.trades
    ? (best ? (es ? `${n}tu mejor operación de la semana hizo ${best}.` : `${n}your best trade this week made ${best}.`)
      : (es ? `${n}registraste ${f.trades} operaciones y ${f.biasesPosted} sesgos esta semana.` : `${n}you logged ${f.trades} trades and ${f.biasesPosted} biases this week.`))
    : (es ? `${n}esta semana te preparaste: ${f.biasesPosted} sesgos publicados.` : `${n}you showed up this week: ${f.biasesPosted} bias posts.`);
  const focus = es ? "La próxima semana, sigue con la misma rutina y revisa cada operación el mismo día." : "Next week, keep the same routine and review each trade the same day.";
  return { highlight: highlight.charAt(0).toUpperCase() + highlight.slice(1), focus, model: "template" };
}
const words = (x: string) => String(x).trim().split(/\s+/).filter(Boolean).length;
async function write(userId: string, f: Any, tryNo = 1): Promise<Lines> {
  if (!ANTHROPIC_API_KEY) return fallback(f);
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      // Sonnet 5 thinks by default and the thinking counts against max_tokens: at 420 a dry run came back cut mid-sentence, once
      // with no text at all (24 Oct 2026). Low effort, room to finish; the summary itself stays 70-110 words by the prompt.
      body: JSON.stringify({ model: MODEL, max_tokens: 4000, output_config: { effort: "low" }, system: SYSTEM, messages: [{ role: "user", content: "The member's week, as data:\n" + JSON.stringify(Object.assign({}, f, { card: undefined })) }] }),
    });
    const d: Any = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((d && d.error && d.error.message) || ("Claude API " + r.status));
    if (d.stop_reason === "refusal" || d.stop_reason === "max_tokens") throw new Error("stopped: " + d.stop_reason);
    try {
      if (d.usage) await admin.from("ai_usage").insert({ user_id: userId, model: MODEL, mode: "weekly", input_tokens: d.usage.input_tokens ?? 0, output_tokens: d.usage.output_tokens ?? 0,
        cache_creation_tokens: d.usage.cache_creation_input_tokens ?? 0, cache_read_tokens: d.usage.cache_read_input_tokens ?? 0, web_search_requests: 0 });
    } catch (_) { /* the meter never blocks the summary */ }
    const text = (Array.isArray(d.content) ? d.content : []).filter((c: Any) => c && c.type === "text").map((c: Any) => c.text).join("").trim();
    const a = text.indexOf("{"), b = text.lastIndexOf("}");
    const o = a >= 0 && b > a ? JSON.parse(text.slice(a, b + 1)) : null;
    const clean = (x: Any) => String(x || "").replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
    const highlight = clean(o && o.highlight), focus = clean(o && o.focus);
    if (highlight.length < 15 || focus.length < 15 || words(highlight) > 32 || words(focus) > 32) throw new Error("not two short lines: " + text.slice(0, 160));
    return { highlight, focus, model: MODEL };
  } catch (e) {
    console.warn("weekly-summary write", userId, tryNo, String(e));
    if (tryNo < 2) { await new Promise((r) => setTimeout(r, 4000)); return write(userId, f, tryNo + 1); }
    return fallback(f);
  }
}
// The push: the highlight, 160 characters at most.
function pushLine(text: string): string { const t = String(text).trim(); return t.length > 160 ? t.slice(0, 157).trim() + "..." : t; }

// ---------- one member, all members ----------
async function runOne(userId: string, now: number, o: { dry?: boolean; noModel?: boolean; lang?: string }) {
  const j = await loadWeekJournal(userId);
  if (!j) return { user: userId, skipped: "no journal" };
  const f = weekFacts(j, now);
  if (o.dry && o.lang) f.language = o.lang === "es" ? "Spanish" : "English";   // a dry run may try the other language
  if (!f.trades && !f.biasesPosted && !f.reviewedTrades) return { user: userId, skipped: "quiet week", facts: o.dry ? f : undefined };
  const week = f.week.from;
  if (!o.dry) {
    const { data: had } = await admin.from("weekly_summaries").select("id").eq("user_id", userId).eq("week_key", week).maybeSingle();
    if (had) return { user: userId, skipped: "already sent" };
  }
  const w = o.noModel ? fallback(f) : await write(userId, f);
  const es = f.language === "Spanish";
  const card = Object.assign({}, f.card, { highlight: w.highlight, focus: w.focus });
  const facts = Object.assign({}, f, { card: undefined });
  if (o.dry) return { user: userId, dry: true, facts, card, model: w.model, push: { title: es ? "Tu semana" : "Your week", body: pushLine(w.highlight) } };
  const { data: ins } = await admin.from("weekly_summaries")
    .upsert({ user_id: userId, week_key: week, lang: es ? "es" : "en", body: w.highlight + "\n\n" + w.focus, facts, card, model: w.model }, { onConflict: "user_id,week_key", ignoreDuplicates: true })
    .select("id");
  if (!ins || !ins.length) return { user: userId, skipped: "already sent" };
  const pushed = await sendPush(admin, userId, "weekly", es ? "Tu semana" : "Your week", pushLine(w.highlight), "st-weekly-" + week);
  await admin.from("weekly_summaries").update({ pushed }).eq("id", ins[0].id);
  return { user: userId, week, pushed, model: w.model };
}
async function runAll(now: number) {
  const { data: js } = await admin.from("journals").select("user_id");
  const ids = (js || []).map((r: Any) => String(r.user_id));
  const ok = await eligible(ids);
  const list = ids.filter((id) => ok.has(id)).slice(0, MAX_MEMBERS);
  const out: Any[] = [];
  for (let i = 0; i < list.length; i += 4) {
    const part = await Promise.all(list.slice(i, i + 4).map((id) => runOne(id, now, {}).catch((e) => ({ user: id, error: String(e) }))));
    out.push(...part);
  }
  return { members: ids.length, eligible: list.length, results: out };
}

function json(obj: unknown, status: number) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
