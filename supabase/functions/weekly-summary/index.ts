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
  return {
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

Write 70 to 110 words of plain text in the language given in the data (English or Spanish), in three short paragraphs:
1. Open with the best thing about their week, warmly and specifically (a winning setup, rules kept, showing up, a clean review). Good news first, always.
2. The week in numbers: trades, wins / losses / break-evens and net R; the setup that worked best; their bias posts and reviews; the rule of the week if there is one.
3. One thing to focus on next week, as a friendly suggestion drawn only from the data.

Rules:
- Use only the facts in the data. Every sentence must rest on a field in the data: never invent trades, numbers, setups, tools, habits or reasons.
- Never state a mistake as fact or blame. Nudges are reminders the app showed during the week, not proof that anything went wrong. Mention them at most once, softly, by topic ("the app reminded you about your trades per day on two days - worth a look"). Never write that the member broke, exceeded, moved, widened or ignored anything.
- Name a weekday only if it is given in the data.
- R means risk multiple, already net of costs. Write +2.4R / -1R. No money amounts.
- Use their first name once if given. No greeting line like "Hi" on its own, no sign-off, no headings, no bullet points, no emojis, no markdown.
- Never mention ICT, SMC or liquidity.
- If they did not trade, praise the preparation they did (biases, reviews) and keep it short.
- Sitting a day out (an Observation day, or no trade) is a disciplined choice. Never suggest trading more days or taking more trades.
- Say a rule was kept only when the data says so (ruleOfTheWeek.followed true, or traded days without any nudge).
- English is British English (colour, totalling). Check your grammar and spelling before you answer.`;

function fallback(f: Any): string {
  const es = f.language === "Spanish", n = f.name ? f.name + ", " : "";
  const r = (f.netR >= 0 ? "+" : "") + Number(f.netR).toFixed(1) + "R";
  if (!f.trades) {
    return es ? `${n}esta semana te preparaste: ${f.biasesPosted} sesgos publicados. La próxima semana, sigue con la misma rutina y elige con calma tus operaciones.`
      : `${n}you showed up this week: ${f.biasesPosted} bias posts. Next week, keep the same routine and pick your trades with the same calm.`;
  }
  const best = f.setups && f.setups[0] && f.setups[0].r > 0 ? f.setups[0].setup : null;
  return es
    ? `${n}${f.trades} operaciones esta semana: ${f.wins} ganadas, ${f.losses} perdidas y ${f.breakEvens} en break-even, ${r} en total.${best ? ` Tu mejor setup fue ${best}.` : ""} Publicaste ${f.biasesPosted} sesgos y revisaste ${f.reviewedTrades} operaciones.\n\nLa próxima semana, repite lo que funcionó y revisa cada operación el mismo día.`
    : `${n}${f.trades} trades this week: ${f.wins} won, ${f.losses} lost and ${f.breakEvens} at break-even, ${r} in all.${best ? ` ${best} was your best setup.` : ""} You posted ${f.biasesPosted} biases and reviewed ${f.reviewedTrades} trades.\n\nNext week, repeat what worked and review each trade the same day.`;
}
async function write(userId: string, f: Any, tryNo = 1): Promise<{ text: string; model: string }> {
  if (!ANTHROPIC_API_KEY) return { text: fallback(f), model: "template" };
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      // Sonnet 5 thinks by default and the thinking counts against max_tokens: at 420 a dry run came back cut mid-sentence, once
      // with no text at all (24 Oct 2026). Low effort, room to finish; the summary itself stays 70-110 words by the prompt.
      body: JSON.stringify({ model: MODEL, max_tokens: 4000, output_config: { effort: "low" }, system: SYSTEM, messages: [{ role: "user", content: "The member's week, as data:\n" + JSON.stringify(f) }] }),
    });
    const d: Any = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((d && d.error && d.error.message) || ("Claude API " + r.status));
    if (d.stop_reason === "refusal" || d.stop_reason === "max_tokens") throw new Error("stopped: " + d.stop_reason);
    try {
      if (d.usage) await admin.from("ai_usage").insert({ user_id: userId, model: MODEL, mode: "weekly", input_tokens: d.usage.input_tokens ?? 0, output_tokens: d.usage.output_tokens ?? 0,
        cache_creation_tokens: d.usage.cache_creation_input_tokens ?? 0, cache_read_tokens: d.usage.cache_read_input_tokens ?? 0, web_search_requests: 0 });
    } catch (_) { /* the meter never blocks the summary */ }
    const text = (Array.isArray(d.content) ? d.content : []).filter((c: Any) => c && c.type === "text").map((c: Any) => c.text).join("").trim();
    if (text.length < 40) throw new Error("too short: " + JSON.stringify({ stop: d.stop_reason, types: (d.content || []).map((c: Any) => c && c.type), text: text.slice(0, 80) }));
    return { text: text.replace(/\*\*/g, "").replace(/^#+\s*/gm, ""), model: MODEL };
  } catch (e) {
    console.warn("weekly-summary write", userId, tryNo, String(e));
    if (tryNo < 2) { await new Promise((r) => setTimeout(r, 4000)); return write(userId, f, tryNo + 1); }
    return { text: fallback(f), model: "template" };
  }
}
// The push: whole sentences from the first paragraph, at least 60 characters where there are, 160 at most.
function firstLine(text: string): string {
  const p = String(text).split(/\n/)[0].trim(), parts = p.match(/.+?[.!?]+(\s+|$)/g) || [p];
  let out = "";
  for (const x of parts) { if (out && (out.length >= 60 || (out + x).length > 160)) break; out += x; }
  out = out.trim();
  return out.length > 160 ? out.slice(0, 157).trim() + "..." : out;
}

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
  const w = o.noModel ? { text: fallback(f), model: "template" } : await write(userId, f);
  const es = f.language === "Spanish";
  if (o.dry) return { user: userId, dry: true, facts: f, text: w.text, model: w.model, push: { title: es ? "Tu semana" : "Your week", body: firstLine(w.text) } };
  const { data: ins } = await admin.from("weekly_summaries")
    .upsert({ user_id: userId, week_key: week, lang: es ? "es" : "en", body: w.text, facts: f, model: w.model }, { onConflict: "user_id,week_key", ignoreDuplicates: true })
    .select("id");
  if (!ins || !ins.length) return { user: userId, skipped: "already sent" };
  const pushed = await sendPush(admin, userId, "weekly", es ? "Tu semana" : "Your week", firstLine(w.text), "st-weekly-" + week);
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
