// ============================================================
//  Session Tool : phone nudges + trade alerts (shared by live-trade and nudge-cron)
//
//  Nestor, 2 Oct 2026: nudges that reach the phone when the app is closed, and "nudges for when my trade gets
//  moved to BE, TP hit, SL hit, taken out for BE". The app already raises the nudges on screen from the live
//  feed; this raises the same ones on the server and sends a web push - only when no window showed it. A window
//  that shows a nudge while the member is looking at it records "seen:<key>" in session_voice_claims (the app's
//  cross-device claim table, keyed by UTC day); the server waits a few seconds and pushes only what nobody saw.
//
//  Rules ported from the app (app.html __stNudge), with the same keys (rule:ticket, P<ticket> for the daily stop,
//  E<releaseMs> for a news warning) so a seen claim and a push talk about the same nudge:
//    open:  no_bias / against_bias, reentry, outside / finished (and an off day), limit, big_risk, news_open
//    later: big_risk (the risk arrived after the open), no_stop (a minute in, still no stop)
//    close: streak, daily_hit / daily_left (the member's own daily stop)
//    timer (nudge-cron): news_soon, news_hold
//    trade alerts (EA 8.86): tr_be (stop moved to break-even), tr_tp, tr_sl, tr_beout (stopped at break-even),
//                            tr_slp (stopped out in profit, a trailed stop)
//  A copy made by the EA Trade Copier is the same idea and is judged once, on its first trade.
// ============================================================

import webpush from "npm:web-push@3.6.7";

// deno-lint-ignore no-explicit-any
type Any = any;

// Dry run (nudge-cron's test mode): judge everything, claim and send nothing, wait for nobody.
let DRY = false, DRY_ROWS: Any[] = [], DRY_NOW = 0;
export function setDry(v: boolean, rows?: Any[], now?: number) { DRY = v; DRY_ROWS = v ? (rows || []) : []; DRY_NOW = v ? (Number(now) || 0) : 0; }
const clock = () => (DRY && DRY_NOW) ? DRY_NOW : Date.now();
export const sleep = (ms: number) => DRY ? Promise.resolve() : new Promise((r) => setTimeout(r, ms));

// ---------- time, in the member's own zone ----------
export function parts(tz: string, ms: number) {
  let f: Intl.DateTimeFormat;
  try {
    f = new Intl.DateTimeFormat("en-GB", { timeZone: tz || "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23" });
  } catch {
    f = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23" });
  }
  const o: Record<string, string> = {};
  for (const p of f.formatToParts(new Date(ms))) o[p.type] = p.value;
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(o.weekday);
  return { key: `${o.year}-${o.month}-${o.day}`, mins: Number(o.hour) * 60 + Number(o.minute), hhmm: `${o.hour}:${o.minute}`, dow };
}
export const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
function mins(hhmm: string) { const a = String(hhmm || "").split(":"); return (parseInt(a[0], 10) || 0) * 60 + (parseInt(a[1], 10) || 0); }
function mondayKey(dayKey: string) {
  const d = new Date(dayKey + "T12:00:00Z"); const off = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - off);
  return d.toISOString().slice(0, 10);
}

// ---------- the member's journal, only the parts the rules read ----------
export async function loadJournal(admin: Any, userId: string) {
  const { data } = await admin.from("journals").select(
    "s:data->settings, bs:data->biasSlots, b:data->bias, acc:data->accounts, lm:data->mt5LoginMap, act:data->activeAccountId, " +
    "wc:data->weeklyCommitments, toff:data->timeOff, ad:data->activatedDays, sel:data->sessionEndLog, see:data->_sessionEndedEarly",
  ).eq("user_id", userId).maybeSingle();
  return data || null;
}
export function cfgOf(j: Any) {
  const n = (j && j.s && j.s.nudges) || {};
  const re = parseInt(n.reentryMins, 10), sk = parseInt(n.streak, 10), nw = parseInt(n.newsMins, 10);
  return {
    on: n.on !== false,
    trades: n.trades !== false,                 // trade alerts (BE / TP / SL), their own switch
    reentry: re > 0 ? re : 10,
    streak: sk >= 2 ? sk : 3,
    news: (!isNaN(nw) && nw >= 0 && nw <= 60) ? nw : 15,
  };
}
export const tzOf = (j: Any) => (j && j.s && j.s.tz) || "Europe/London";
export const esOf = (j: Any) => !!(j && j.s && j.s.lang === "es");
function dedupe(arr: Any[]) {
  const kept: Any[] = [];
  for (const x of arr) { const a = mins(x.start), b = mins(x.end); if (!kept.some((k) => a < mins(k.end) && mins(k.start) < b)) kept.push(x); }
  return kept;
}
function sessions(j: Any): { name?: string; start: string; end: string }[] {
  const s = j && j.s;
  if (s && Array.isArray(s.sessions) && s.sessions.length) return dedupe(s.sessions.filter((x: Any) => x && x.start && x.end));
  if (s) return [{ name: "London", start: s.windowStart || "08:00", end: s.windowEnd || "10:00" }];
  return [];
}
function defaultDays(j: Any) { const td = j && j.s && j.s.tradingDays; return (Array.isArray(td) && td.length) ? td.map(Number) : [1, 2, 3, 4, 5]; }
// The week's days: its own saved week ([] = a week off), else the usual days (an unset week since 28 Sep 2026).
function weekDays(j: Any, dayKey: string): number[] {
  const m = (j && j.wc) || {}, wk = mondayKey(dayKey);
  return Array.isArray(m[wk]) ? m[wk].map(Number) : defaultDays(j);
}
function timeOff(j: Any, dayKey: string) {
  return (Array.isArray(j && j.toff) ? j.toff : []).some((r: Any) => r && /^\d{4}-\d{2}-\d{2}$/.test(r.from) && /^\d{4}-\d{2}-\d{2}$/.test(r.to) && dayKey >= r.from && dayKey <= r.to);
}
export function isTradingDay(j: Any, tz: string, ms: number) {
  const p = parts(tz, ms);
  if ((j && Array.isArray(j.ad) ? j.ad : []).some((x: Any) => String(x) === p.key)) return true;
  if (timeOff(j, p.key)) return false;
  return weekDays(j, p.key).indexOf(p.dow) !== -1;
}
function endedToday(j: Any, ms: number): number[] {
  const ee = j && j.see; if (!ee) return [];
  const tk = utcDay(ms);
  if (typeof ee === "string") return ee === tk ? [0] : [];
  return (ee.date === tk && Array.isArray(ee.idxs)) ? ee.idxs.slice() : [];
}
export function liveSessionIndex(j: Any, tz: string, ms: number) {
  if (!isTradingDay(j, tz, ms)) return -1;
  const nm = parts(tz, ms).mins, ended = endedToday(j, ms), ss = sessions(j);
  for (let i = 0; i < ss.length; i++) { if (ended.indexOf(i) !== -1) continue; if (nm >= mins(ss[i].start) && nm < mins(ss[i].end)) return i; }
  return -1;
}
// The start of the live session, or of the last one to start today, else local midnight (ms).
function sessionStartMs(j: Any, tz: string, ms: number) {
  const ss = sessions(j), p = parts(tz, ms);
  let bestStart = -1;
  const li = liveSessionIndex(j, tz, ms);
  if (li >= 0) bestStart = mins(ss[li].start);
  else ss.forEach((s) => { const st = mins(s.start); if (st <= p.mins && st > bestStart) bestStart = st; });
  const back = (bestStart >= 0 ? (p.mins - bestStart) : p.mins) * 60000;
  return ms - back - (ms % 60000);
}

// ---------- accounts and rules ----------
function accounts(j: Any): Any[] { return Array.isArray(j && j.acc) ? j.acc : []; }
// The account a trade belongs to: its own login (EA 8.86), else the one account the running EAs map to, else the active one.
export function accountFor(ctx: Ctx, login: string | null) {
  const j = ctx.j, accs = accounts(j), lm = (j && j.lm) || {};
  const byId = (id: Any) => accs.find((x) => x && x.id === id) || null;
  if (login && lm[String(login)]) { const a = byId(lm[String(login)]); if (a) return a; }
  const ids: string[] = [];
  ctx.ea.forEach((r: Any) => { const id = lm[String(r.login)]; if (id && ids.indexOf(id) === -1) ids.push(id); });
  if (!login && ids.length === 1) { const a = byId(ids[0]); if (a) return a; }
  return byId(j && j.act) || accs.find((a) => a && (a.status || "active") === "active") || null;
}
function moneyRule(rules: Any, mk: string, pk: string, ak: string, sb: number) {
  rules = rules || {};
  const mode = (rules[mk] === "amount" || rules[mk] === "pct") ? rules[mk] : ((rules[ak] > 0 && !(rules[pk] > 0)) ? "amount" : "pct");
  if (mode === "amount") return Number(rules[ak]) > 0 ? Number(rules[ak]) : 0;
  const p = Number(rules[pk]);
  if (p > 100) return p;
  return (p > 0 && sb > 0) ? sb * p / 100 : 0;
}
function beBand(acc: Any, j: Any) {
  const rr = (acc && acc.riskRules) || (j && j.s && j.s.riskRules) || {};
  if (rr.beThresholdMode === "amount") { const a = parseFloat(rr.beThresholdAmount); return a > 0 ? a : 0; }
  const p = parseFloat(rr.beThresholdPct); if (!(p > 0)) return 0;
  let bal = acc && (acc.startingBalance != null ? acc.startingBalance : (acc.balance != null ? acc.balance : null));
  if (bal == null) bal = (j && j.s && j.s.startingBalance) || 0;
  bal = parseFloat(bal) || 0;
  return bal > 0 ? bal * p / 100 : 0;
}
export function resultOf(pnl: number, acc: Any, j: Any) {
  const n = Number(pnl) || 0, band = beBand(acc, j), eps = band > 0 ? band : 0.005;
  if (Math.abs(n) <= eps) return "BE";
  return n > 0 ? "Win" : "Lose";
}

// ---------- symbols, currencies ----------
function symKey(x: Any) { return String(x || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
export function symCore(x: Any) {
  let o = String(x || "").toUpperCase().replace(/^[^A-Z0-9]+/, "").replace(/^([A-Z]{3})\/([A-Z]{3})/, "$1$2").replace(/[^A-Z0-9].*$/, "");
  if (/^GOLD/.test(o)) return "XAUUSD";
  if (/^SILVER/.test(o)) return "XAGUSD";
  if (o.length > 6 && /^(USD|EUR|GBP|JPY|CHF|AUD|NZD|CAD|XAU|XAG)(USD|EUR|GBP|JPY|CHF|AUD|NZD|CAD)/.test(o)) o = o.slice(0, 6);
  return o;
}
const CURS = ["USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF", "CNY"];
export function cursOf(sym: Any) {
  const x = String(sym || "").toUpperCase().replace(/[^A-Z0-9]/g, ""), out: string[] = [];
  CURS.forEach((c) => { if (x.indexOf(c) !== -1) out.push(c); });
  const add = (c: string) => { if (out.indexOf(c) === -1) out.push(c); };
  if (/XAU|XAG|GOLD|SILVER|OIL|WTI|BRENT|US30|US100|US500|NAS|NDX|SPX|SP500|DOW|DJI|US2000/.test(x)) add("USD");
  if (/GER|DAX|DE40|EU50|STOXX|FRA40|CAC/.test(x)) add("EUR");
  if (/UK100|FTSE/.test(x)) add("GBP");
  if (/JP225|NIKKEI|NKY/.test(x)) add("JPY");
  return out;
}
export function myCurs(j: Any) {
  const s = (j && j.s) || {}, syms = (Array.isArray(s.symbols) && s.symbols.length) ? s.symbols : [s.pair || "EUR/USD"];
  const out: string[] = [];
  syms.forEach((y: Any) => cursOf(y).forEach((c) => { if (out.indexOf(c) === -1) out.push(c); }));
  return out;
}

// ---------- words ----------
const SYM: Record<string, string> = { GBP: "£", EUR: "€", USD: "$", JPY: "¥", CHF: "CHF ", CAD: "C$", AUD: "A$" };
export function money(j: Any, v: number) {
  const code = (j && j.s && j.s.currency) || "GBP";
  return (SYM[code] || "£") + Math.abs(v).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
const signed = (j: Any, v: number) => (v > 0 ? "+" : v < 0 ? "−" : "") + money(j, v);
const T: Record<string, [string, string]> = {
  revenge: ["You entered {M} after a loss. Is this trade in your plan, or are you trying to win it back?", "Has entrado {M} después de una pérdida. ¿Esta operación está en tu plan o intentas recuperar lo perdido?"],
  min: ["{N} min", "{N} min"],
  under_min: ["under a minute", "menos de un minuto"],
  streak: ["{N} losses in a row. Step away from the screen before the next trade.", "{N} pérdidas seguidas. Apártate de la pantalla antes de la siguiente operación."],
  offday: ["Today is not one of your trading days. This trade is outside your plan.", "Hoy no es uno de tus días de trading. Esta operación está fuera de tu plan."],
  finished: ["You finished your session at {T}. This trade is outside your plan.", "Terminaste tu sesión a las {T}. Esta operación está fuera de tu plan."],
  finished_nt: ["You already finished today’s session. This trade is outside your plan.", "Ya terminaste la sesión de hoy. Esta operación está fuera de tu plan."],
  outside: ["Your session is {W}. This trade is outside it.", "Tu sesión es {W}. Esta operación está fuera de ella."],
  limit: ["This is trade {N} this session. Your limit is {L}.", "Esta es la operación {N} de la sesión. Tu límite es {L}."],
  big_risk: ["This trade risks {R}. Your max per trade is {P}.", "Esta operación arriesga {R}. Tu máximo por operación es {P}."],
  risk_up: ["You raised your risk after a loss: {NEW} on this trade, {OLD} on the one you lost. Is that in your plan?", "Has subido el riesgo después de una pérdida: {NEW} en esta operación, {OLD} en la que perdiste. ¿Está en tu plan?"],
  widen: ["Your risk on this trade grew from {OLD} to {NEW}. Did you move your stop away?", "El riesgo de esta operación ha pasado de {OLD} a {NEW}. ¿Has alejado el stop?"],
  no_stop: ["No stop loss on this trade? A minute after entry the EA still sees no stop.", "¿Operación sin stop loss? Un minuto después de entrar, el EA sigue sin ver un stop."],
  no_bias: ["No bias logged today. What’s the plan for this trade?", "No has registrado sesgo hoy. ¿Cuál es el plan de esta operación?"],
  against_bias: ["This {SIDE} is against your {DIR} {TF} bias on {SYM}.", "Este {SIDE} va contra tu sesgo {DIR} {TF} en {SYM}."],
  w_long: ["long", "largo"], w_short: ["short", "corto"], w_bullish: ["bullish", "alcista"], w_bearish: ["bearish", "bajista"],
  w_long_f: ["long", "larga"], w_short_f: ["short", "corta"],
  news_open: ["You opened a trade {M} min before red news: {N} at {T}.", "Has abierto una operación {M} min antes de una noticia roja: {N} a las {T}."],
  news_hold: ["Red news in {M} min: {N} at {T}, and you’re still in a trade. Your plan: be flat before it.", "Noticia roja en {M} min: {N} a las {T}, y sigues dentro de una operación. Tu plan: estar fuera antes."],
  news_soon: ["Red news in {M} min: {N} at {T}. Don’t open a trade into it.", "Noticia roja en {M} min: {N} a las {T}. No abras una operación antes."],
  daily_hit: ["You’ve hit your daily loss limit ({LIM}). Stop trading for today.", "Has alcanzado tu límite de pérdida diaria ({LIM}). Deja de operar por hoy."],
  daily_left: ["{LEFT} left before your daily loss limit ({LIM}) — less than one full trade ({RISK}). One more loss breaks it.", "Te quedan {LEFT} antes de tu límite de pérdida diaria ({LIM}), menos que una operación completa ({RISK}). Una pérdida más lo rompe."],
  // Trade alerts (EA 8.86)
  tr_be: ["Stop moved to break-even on your {SYM} {SIDE}.", "Stop movido a break-even en tu operación {SIDEF} de {SYM}."],
  tr_tp: ["Take profit hit on your {SYM} {SIDE}: {PNL}.", "Take profit alcanzado en tu operación {SIDEF} de {SYM}: {PNL}."],
  tr_sl: ["Stop loss hit on your {SYM} {SIDE}: {PNL}.", "Stop loss alcanzado en tu operación {SIDEF} de {SYM}: {PNL}."],
  tr_beout: ["Taken out at break-even on your {SYM} {SIDE}: {PNL}.", "Tu operación {SIDEF} de {SYM} se cerró en break-even: {PNL}."],
  tr_slp: ["Stopped out in profit on your {SYM} {SIDE}: {PNL}.", "Tu operación {SIDEF} de {SYM} tocó el stop con beneficio: {PNL}."],
  title: ["Nudge", "Aviso"],
  title_tr: ["Trade alert", "Aviso de operación"],
};
export const tr = (k: string, es: boolean) => (T[k] ? T[k][es ? 1 : 0] : k);
const RANK: Record<string, number> = { daily_hit: 0, daily_left: 0, no_stop: 0, finished: 0, outside: 0, news_hold: 0, against_bias: 1, big_risk: 1, risk: 1, widen: 1, news_open: 1, news_soon: 1, no_bias: 2, reentry: 2, limit: 3, streak: 4 };

// ---------- red news ----------
export type News = { at: number; curs: string[]; titles: string[] };
export async function redNews(admin: Any, fromMs: number, toMs: number): Promise<News[]> {
  const { data } = await admin.from("calendar_events").select("at, timed, currency, title, impact")
    .gte("at", new Date(fromMs).toISOString()).lte("at", new Date(toMs).toISOString());
  const groups: Record<string, News> = {};
  for (const e of (data || [])) {
    if (String(e.impact || "").toLowerCase() !== "high" || e.timed === false) continue;
    const ms = Date.parse(e.at); if (!Number.isFinite(ms)) continue;
    const g = groups[ms] || (groups[ms] = { at: ms, curs: [], titles: [] });
    const c = String(e.currency || "").toUpperCase();
    if (c && g.curs.indexOf(c) === -1) g.curs.push(c);
    if (e.title && g.titles.indexOf(e.title) === -1) g.titles.push(e.title);
  }
  return Object.values(groups).sort((a, b) => a.at - b.at);
}
// The group as the app shows it for these currencies (only the releases on them).
export function forCurs(g: News, cs: string[]): News | null {
  return g.curs.some((c) => cs.indexOf(c) !== -1) ? { ...g, curs: g.curs.filter((c) => cs.indexOf(c) !== -1) } : null;
}
const newsName = (g: News) => g.titles.slice(0, 2).join(", ") + (g.titles.length > 2 ? " +" + (g.titles.length - 2) : "") + " (" + g.curs.join("/") + ")";
const minsTo = (ms: number) => String(Math.max(1, Math.round(ms / 60000)));
export function newsLine(key: string, es: boolean, g: News, ms: number, tz: string) {
  return tr(key, es).replace("{M}", minsTo(ms)).replace("{N}", newsName(g)).replace("{T}", parts(tz, g.at).hhmm);
}
export function newsMatters(j: Any, tz: string, g: News, nowMs: number) {
  if (!isTradingDay(j, tz, g.at)) return false;
  if (liveSessionIndex(j, tz, nowMs) >= 0) return true;
  const m = parts(tz, g.at).mins;
  return sessions(j).some((x) => m >= mins(x.start) && m <= mins(x.end));
}

// ---------- what the server knows about the member right now ----------
export type Row = { ticket: number; login: string | null; symbol: string | null; direction: string | null; opened_at: string; risk0: number | null; risk: number | null; be_at: string | null; closed_at: string | null; pnl: number | null; close_reason: string | null };
export type Ctx = { userId: string; j: Any; ea: Any[]; copier: boolean; rows: Row[]; now: number };
export async function loadCtx(admin: Any, userId: string): Promise<Ctx | null> {
  const [j, ea, nt] = await Promise.all([
    loadJournal(admin, userId),
    admin.from("ea_settings").select("login, settings, updated_at").eq("user_id", userId).then((r: Any) => r.data || []),
    admin.from("nudge_trades").select("ticket, login, symbol, direction, opened_at, risk0, risk, be_at, closed_at, pnl, close_reason")
      .eq("user_id", userId).or("opened_at.gte." + new Date(Date.now() - 4 * 86400000).toISOString() + ",closed_at.is.null").then((r: Any) => r.data || []),
  ]);
  if (!j) return null;
  const copier = ea.some((r: Any) => r && r.settings && (r.settings.copy_role === "lead" || r.settings.copy_role === "follow"));
  const all = DRY ? nt.filter((r: Any) => !DRY_ROWS.some((x) => Number(x.ticket) === Number(r.ticket))).concat(DRY_ROWS) : nt;
  return { userId, j, ea, copier, rows: all.map((r: Any) => ({ login: null, risk0: null, risk: null, be_at: null, closed_at: null, pnl: null, close_reason: null, ...r, ticket: Number(r.ticket) })), now: clock() };
}
const todayOf = (ctx: Ctx, iso: string | null) => !!iso && parts(tzOf(ctx.j), Date.parse(iso)).key === parts(tzOf(ctx.j), ctx.now).key;
// The idea a trade belongs to: rows of the same pair and direction opened within 15 s (only while a copier runs).
export function mates(ctx: Ctx, me: Row): Row[] {
  if (!ctx.copier) return [me];
  const at = Date.parse(me.opened_at), c = symCore(me.symbol);
  const m = ctx.rows.filter((r) => symCore(r.symbol) === c && r.direction === me.direction && Math.abs(Date.parse(r.opened_at) - at) <= 15000);
  if (!m.some((r) => r.ticket === me.ticket)) m.push(me);
  return m.sort((a, b) => (Date.parse(a.opened_at) - Date.parse(b.opened_at)) || (a.ticket - b.ticket));
}
export const isCopy = (ctx: Ctx, r: Row) => mates(ctx, r)[0].ticket !== r.ticket;
// Today's closes, oldest first: the live feed's, plus the EA sync's for any the feed missed.
async function closesToday(admin: Any, ctx: Ctx) {
  const tz = tzOf(ctx.j), since = new Date(ctx.now - 36 * 3600 * 1000).toISOString();
  const { data } = await admin.from("trades_inbox").select("ticket, login, symbol, direction, open_time, close_time, pnl").eq("token", ctx.userId).gte("close_time", since);
  const today = parts(tz, ctx.now).key, seen = new Set<string>();
  const out: { ticket: number; at: number; res: string; pnl: number; login: string | null; copy: boolean }[] = [];
  const loginOf: Record<string, string> = {};
  (data || []).forEach((r: Any) => { if (r.login != null) loginOf[String(r.ticket)] = String(r.login); });
  ctx.rows.filter((r) => r.closed_at && r.pnl != null && todayOf(ctx, r.closed_at)).forEach((r) => {
    const login = r.login || loginOf[String(r.ticket)] || null;
    out.push({ ticket: r.ticket, at: Date.parse(r.closed_at!), pnl: Number(r.pnl), login, res: resultOf(Number(r.pnl), accountFor(ctx, login), ctx.j), copy: isCopy(ctx, r) });
    seen.add(String(r.ticket));
  });
  (data || []).forEach((r: Any) => {
    if (seen.has(String(r.ticket)) || !r.close_time || parts(tz, Date.parse(r.close_time)).key !== today) return;
    const login = r.login != null ? String(r.login) : null;
    out.push({ ticket: Number(r.ticket), at: Date.parse(r.close_time), pnl: Number(r.pnl) || 0, login, res: resultOf(Number(r.pnl) || 0, accountFor(ctx, login), ctx.j), copy: false });
  });
  return out.sort((a, b) => a.at - b.at);
}

// ---------- the rules ----------
export type Item = { rule: string; key: string; text: string; alts?: string[] };
function item(rule: string, id: string, text: string, group: Row[] | null, prefix = ""): Item {
  const it: Item = { rule, key: rule + ":" + prefix + id, text };
  if (group && group.length > 1) it.alts = group.map((r) => rule + ":" + prefix + r.ticket);
  return it;
}
function onOpenRules(ctx: Ctx, me: Row, closes: Any[], news: News[]): Item[] {
  const j = ctx.j, es = esOf(j), tz = tzOf(j), c = cfgOf(j), k = String(me.ticket), at = Date.parse(me.opened_at), out: Item[] = [], grp = mates(ctx, me);
  const push = (rule: string, text: string) => out.push(item(rule, k, text, grp));
  // re-entry soon after a loss: the last trade to close before this one lost, within the window
  let last: Any = null;
  closes.forEach((x) => { if (String(x.ticket) !== k && x.at <= at && (!last || x.at > last.at)) last = x; });
  if (last && last.res === "Lose" && (at - last.at) <= c.reentry * 60000) {
    const m = Math.floor((at - last.at) / 60000);
    push("reentry", tr("revenge", es).replace("{M}", m < 1 ? tr("under_min", es) : tr("min", es).replace("{N}", String(m))));
  }
  // outside the plan: an off day, after Finish session, or outside every window
  if (liveSessionIndex(j, tz, ctx.now) < 0) {
    const ss = sessions(j), p = parts(tz, ctx.now); let inWin = -1;
    ss.forEach((s, i) => { if (p.mins >= mins(s.start) && p.mins < mins(s.end)) inWin = i; });
    if (!isTradingDay(j, tz, ctx.now)) push("outside", tr("offday", es));
    else if (inWin >= 0 && endedToday(j, ctx.now).indexOf(inWin) !== -1) {
      const t0 = (j.sel && j.sel[p.key]) || "";
      push("finished", t0 ? tr("finished", es).replace("{T}", t0) : tr("finished_nt", es));
    } else if (ss.length) push("outside", tr("outside", es).replace("{W}", ss.map((s) => s.start + "–" + s.end).join(", ")));
  }
  // over the max trades this session (the trade's account)
  const acc = accountFor(ctx, me.login), rules = (acc && acc.riskRules) || {}, sb = Number(acc && acc.startingBalance) || 0;
  const lim = Number(rules.maxTrades) || 0;
  if (lim > 0) {
    const from = sessionStartMs(j, tz, ctx.now);
    const n = ctx.rows.filter((r) => Date.parse(r.opened_at) >= from && !isCopy(ctx, r)).length;
    if (n > lim) push("limit", tr("limit", es).replace("{N}", String(n)).replace("{L}", String(lim)));
  }
  // today's bias: none logged (the day's first trade), or this trade goes against it
  const slots = (Array.isArray(j.bs) && j.bs.length) ? j.bs : (j.b ? [j.b] : []), td = parts(tz, ctx.now).key;
  const isT = (v: Any) => { const ms = Date.parse(v); return !!v && Number.isFinite(ms) && parts(tz, ms).key === td; };
  const today = slots.filter((b: Any) => b && (b.direction || b.directionLtf) && (b.sessionDate === td || isT(b.date) || isT(b.copiedAt)));
  const w = symKey(me.symbol);
  let hit = today.find((b: Any) => { const k2 = symKey(b.symbol); return k2 && w && (w.indexOf(k2) === 0 || k2.indexOf(w) === 0); });
  if (!hit && today.length === 1 && !today[0].symbol) hit = today[0];
  if (!today.length) push("no_bias", tr("no_bias", es));
  else if (hit && (me.direction === "long" || me.direction === "short")) {
    let bdir = hit.direction, btf = "HTF";
    if (bdir !== "Bullish" && bdir !== "Bearish") { bdir = hit.directionLtf; btf = "LTF"; }
    if ((bdir === "Bullish" || bdir === "Bearish") && me.direction !== (bdir === "Bullish" ? "long" : "short")) {
      push("against_bias", tr("against_bias", es).replace("{SIDE}", tr(me.direction === "long" ? "w_long" : "w_short", es))
        .replace("{DIR}", tr(bdir === "Bullish" ? "w_bullish" : "w_bearish", es)).replace("{TF}", btf).replace("{SYM}", hit.symbol || me.symbol || ""));
    }
  }
  // opened into red news on this pair's currencies
  if (c.news > 0) {
    const cs = cursOf(me.symbol);
    for (const g0 of news) {
      const g = forCurs(g0, cs);
      if (g && g.at > at && g.at - at <= c.news * 60000) { push("news_open", newsLine("news_open", es, g, g.at - at, tz)); break; }
    }
  }
  // bigger than the plan, and more than the trade just lost (when the risk is already known)
  const big = bigRisk(ctx, me, rules, sb); if (big) out.push(big);
  const up = riskUp(ctx, me, closes); if (up) out.push(up);
  return out;
}
// Risk raised after a loss: the last idea to close before this one lost, and this one risks more than 10% above it
// (the 10% absorbs lot rounding). Copies are left out, so a smaller account's copy is never "the one you lost".
function riskUp(ctx: Ctx, me: Row, closes: Any[]): Item | null {
  const at = Date.parse(me.opened_at), now = Number(me.risk) || Number(me.risk0) || 0; if (!(now > 0)) return null;
  let last: Any = null;
  closes.forEach((x) => { if (!x.copy && x.ticket !== me.ticket && x.at <= at && (!last || x.at > last.at)) last = x; });
  if (!last || last.res !== "Lose") return null;
  const lr = ctx.rows.find((r) => r.ticket === last.ticket), was = lr ? (Number(lr.risk) || Number(lr.risk0) || 0) : 0;
  if (!(was > 0) || !(now > was * 1.1)) return null;
  return item("risk", String(me.ticket), tr("risk_up", esOf(ctx.j)).replace("{NEW}", money(ctx.j, now)).replace("{OLD}", money(ctx.j, was)), mates(ctx, me));
}
function bigRisk(ctx: Ctx, me: Row, rules: Any, sb: number): Item | null {
  const planMax = moneyRule(rules, "maxRiskMode", "maxRiskPct", "maxRiskAmount", sb), risk = Number(me.risk) || Number(me.risk0) || 0;
  if (!(planMax > 0 && risk > planMax * 1.005)) return null;
  return item("big_risk", String(me.ticket), tr("big_risk", esOf(ctx.j)).replace("{R}", money(ctx.j, risk)).replace("{P}", money(ctx.j, planMax)), mates(ctx, me));
}

// ---------- the push itself ----------
let vapidSet = false;
function vapid() {
  if (vapidSet) return;
  webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT")!, Deno.env.get("VAPID_PUBLIC")!, Deno.env.get("VAPID_PRIVATE")!);
  vapidSet = true;
}
export async function sendPush(admin: Any, userId: string, kind: string, title: string, body: string, tag: string) {
  const { data: ok, error } = await admin.rpc("st_push_targets", { p_kind: kind, p_user_ids: [userId], p_channel_id: null });
  if (error || !ok || !ok.length) return "filtered";
  const { data: subs } = await admin.from("push_subscriptions").select("endpoint, subscription").eq("user_id", userId);
  if (!subs || !subs.length) return "no-device";
  vapid();
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(s.subscription, JSON.stringify({ title, body, url: "./", tag, type: kind }), { TTL: 600, urgency: "high" });
      sent++;
    } catch (e: Any) {
      if (e && (e.statusCode === 404 || e.statusCode === 410)) await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
    }
  }
  return sent ? "sent" : "failed";
}

/* Deliver a batch: each key is claimed once (nudge_pushes), the window that showed it is given time to say so
   (seen:<key> in session_voice_claims - any of the idea's tickets counts), and only the unseen ones go to the
   phone, as one notification. */
export async function deliver(admin: Any, userId: string, kind: "nudge" | "trade", items: Item[], es: boolean, waitMs: number) {
  if (!items.length) return [];
  items.sort((a, b) => (RANK[a.rule] ?? 9) - (RANK[b.rule] ?? 9));
  if (DRY) return items.map((x) => kind + " " + x.key + (x.alts ? " (" + x.alts.join(",") + ")" : "") + ": " + x.text);
  const day = utcDay(Date.now()), mine: Item[] = [];
  for (const it of items) {
    const { error } = await admin.from("nudge_pushes").insert({ user_id: userId, day, key: it.key, status: "pending" });
    if (!error) mine.push(it);
  }
  if (!mine.length) return [];
  if (waitMs > 0) await sleep(waitMs);
  const keysOf = (x: Item) => (x.alts || []).concat([x.key]);
  const kinds: string[] = [];
  mine.forEach((x) => keysOf(x).forEach((k) => { if (kinds.indexOf("seen:" + k) === -1) kinds.push("seen:" + k); }));
  const days = [day, utcDay(Date.now() - 6 * 3600 * 1000)].filter((d, i, a) => a.indexOf(d) === i);
  const { data: seen } = await admin.from("session_voice_claims").select("kind").eq("user_id", userId).in("day", days).in("kind", kinds);
  const seenSet = new Set((seen || []).map((r: Any) => String(r.kind).slice(5)));
  const wasSeen = (x: Item) => keysOf(x).some((k) => seenSet.has(k));
  const unseen = mine.filter((x) => !wasSeen(x));
  const mark = async (list: Item[], status: string) => { if (list.length) await admin.from("nudge_pushes").update({ status }).eq("user_id", userId).eq("day", day).in("key", list.map((x) => x.key)); };
  await mark(mine.filter(wasSeen), "seen");
  if (!unseen.length) return mine.map((x) => x.key + "=seen");
  const title = tr(kind === "trade" ? "title_tr" : "title", es);
  const res = await sendPush(admin, userId, kind, title, unseen.map((x) => x.text).join("\n"), (kind === "nudge" ? "st-nudge-" : "st-trade-") + unseen[0].key);
  await mark(unseen, res);
  return unseen.map((x) => x.key + "=" + res);
}

// ---------- entry points (live-trade) ----------
// A trade the server is seeing for the first time (judged ~8 s later, once the copies and the app have had their say).
export async function afterOpen(admin: Any, userId: string, ticket: number) {
  await sleep(8000);
  const ctx = await loadCtx(admin, userId); if (!ctx || !cfgOf(ctx.j).on) return;
  const me = ctx.rows.find((r) => r.ticket === ticket); if (!me || me.closed_at) return;
  if (isCopy(ctx, me)) return;                      // its first trade is judged instead
  const closes = await closesToday(admin, ctx);
  const news = await redNews(admin, ctx.now - 60000, ctx.now + 61 * 60000);
  const items = onOpenRules(ctx, me, closes, news);
  // "No bias" once a day, as in the app: not if the app or the server already raised it today.
  const nb = items.find((x) => x.rule === "no_bias");
  if (nb) {
    const day = utcDay(ctx.now);
    const [a, b] = await Promise.all([
      admin.from("nudge_pushes").select("key").eq("user_id", userId).eq("day", day).like("key", "no_bias:%").limit(1),
      admin.from("session_voice_claims").select("kind").eq("user_id", userId).eq("day", day).like("kind", "seen:no_bias:%").limit(1),
    ]);
    if ((a.data && a.data.length) || (b.data && b.data.length)) items.splice(items.indexOf(nb), 1);
  }
  return await deliver(admin, userId, "nudge", items, esOf(ctx.j), 0);
}

// The risk arrived after the open: over the plan's max per trade.
export async function afterRisk(admin: Any, userId: string, ticket: number) {
  await sleep(8000);
  const ctx = await loadCtx(admin, userId); if (!ctx || !cfgOf(ctx.j).on) return;
  const me = ctx.rows.find((r) => r.ticket === ticket); if (!me || me.closed_at || isCopy(ctx, me)) return;
  const acc = accountFor(ctx, me.login), rules = (acc && acc.riskRules) || {}, sb = Number(acc && acc.startingBalance) || 0;
  const items: Item[] = [], big = bigRisk(ctx, me, rules, sb), up = riskUp(ctx, me, await closesToday(admin, ctx));
  if (big) items.push(big); if (up) items.push(up);
  return await deliver(admin, userId, "nudge", items, esOf(ctx.j), 0);
}

// The stop moved away: an open trade's money at risk grew more than 10% above what it was taken with.
export async function afterWiden(admin: Any, userId: string, ticket: number) {
  await sleep(8000);
  const ctx = await loadCtx(admin, userId); if (!ctx || !cfgOf(ctx.j).on) return;
  const me = ctx.rows.find((r) => r.ticket === ticket); if (!me || me.closed_at || isCopy(ctx, me)) return;
  const r0 = Number(me.risk0) || 0, r = Number(me.risk) || 0;
  if (!(r0 > 0 && r > r0 * 1.1)) return;
  return await deliver(admin, userId, "nudge", [item("widen", String(ticket), tr("widen", esOf(ctx.j)).replace("{OLD}", money(ctx.j, r0)).replace("{NEW}", money(ctx.j, r)), mates(ctx, me))], esOf(ctx.j), 0);
}

// A minute in and the EA still reports no stop (only while an EA that sends risk is online).
export async function checkNoStop(admin: Any, userId: string, ticket: number) {
  const ctx = await loadCtx(admin, userId); if (!ctx || !cfgOf(ctx.j).on) return;
  if (!ctx.ea.some((r: Any) => ctx.now - Date.parse(r.updated_at) < 10 * 60000)) return;
  const me = ctx.rows.find((r) => r.ticket === ticket); if (!me || me.closed_at || Number(me.risk0) > 0) return;
  const age = ctx.now - Date.parse(me.opened_at); if (age < 60000 || age > 30 * 60000) return;
  if (isCopy(ctx, me)) return;
  return await deliver(admin, userId, "nudge", [item("no_stop", String(ticket), tr("no_stop", esOf(ctx.j)), mates(ctx, me))], esOf(ctx.j), 8000);
}

// A close: a run of losses, and the member's own daily stop on that trade's account.
export async function afterClose(admin: Any, userId: string, ticket: number) {
  await sleep(8000);
  const ctx = await loadCtx(admin, userId); if (!ctx || !cfgOf(ctx.j).on) return;
  const es = esOf(ctx.j), me = ctx.rows.find((r) => r.ticket === ticket);
  if (!me || me.pnl == null || isCopy(ctx, me)) return;
  const closes = await closesToday(admin, ctx), mine = closes.find((x) => x.ticket === ticket); if (!mine) return;
  const items: Item[] = [], grp = mates(ctx, me);
  // losses in a row (copies left out; a break-even neither counts nor resets)
  if (mine.res === "Lose") {
    const solo = closes.filter((x) => !x.copy);
    let run = 0;
    for (let i = solo.length - 1; i >= 0; i--) { if (solo[i].res === "Lose") run++; else if (solo[i].res === "Win") break; }
    if (run >= cfgOf(ctx.j).streak) items.push(item("streak", String(ticket), tr("streak", es).replace("{N}", String(run)), grp));
  }
  // the member's own daily stop, on this trade's account
  if (mine.pnl < 0) {
    const acc = accountFor(ctx, mine.login), rules = (acc && acc.riskRules) || {}, sb = Number(acc && acc.startingBalance) || 0;
    const dLim = moneyRule(rules, "maxLossMode", "maxLossPct", "maxLossAmount", sb);
    if (dLim > 0) {
      const net = closes.filter((x) => { const a = accountFor(ctx, x.login); return !acc || !a || a.id === acc.id; }).reduce((s, x) => s + x.pnl, 0);
      const left = dLim - Math.max(0, -net);
      const eaRow = ctx.ea.find((r: Any) => mine.login && String(r.login) === String(mine.login)) || (ctx.ea.length === 1 ? ctx.ea[0] : null);
      const one = (eaRow && Number(eaRow.settings && eaRow.settings.risk_money) > 0) ? Number(eaRow.settings.risk_money) : moneyRule(rules, "maxRiskMode", "maxRiskPct", "maxRiskAmount", sb);
      if (left <= 0) items.push(item("daily_hit", String(ticket), tr("daily_hit", es).replace("{LIM}", money(ctx.j, dLim)), grp, "P"));
      else if (one > 0 && left < one) items.push(item("daily_left", String(ticket), tr("daily_left", es).replace("{LEFT}", money(ctx.j, left)).replace("{LIM}", money(ctx.j, dLim)).replace("{RISK}", money(ctx.j, one)), grp, "P"));
    }
  }
  return await deliver(admin, userId, "nudge", items, es, 0);
}

// ---------- trade alerts (EA 8.86) ----------
function tradeWords(ctx: Ctx, me: Row, key: string, pnl?: number) {
  const es = esOf(ctx.j), long = me.direction !== "short";
  return tr(key, es).replace("{SYM}", symCore(me.symbol) || String(me.symbol || ""))
    .replace("{SIDE}", tr(long ? "w_long" : "w_short", es)).replace("{SIDEF}", tr(long ? "w_long_f" : "w_short_f", es))
    .replace("{PNL}", pnl == null ? "" : signed(ctx.j, pnl));
}
// Which alert a close is: the broker's take profit, or its stop - at a loss, at break-even, or locked in profit.
export function closeAlert(ctx: Ctx, me: Row): string | null {
  const why = me.close_reason, pnl = Number(me.pnl) || 0;
  if (why === "tp") return "tr_tp";
  if (why !== "sl") return null;                     // closed by hand or by the EA: you did it, no alert
  const res = resultOf(pnl, accountFor(ctx, me.login), ctx.j);
  if (res === "Lose") return "tr_sl";
  if (res === "BE") return "tr_beout";
  // A stop past the entry: a break-even offset (a small win) reads as break-even; a trailed stop as profit.
  const r0 = Number(me.risk0) || 0;
  return (me.be_at && (!(r0 > 0) || pnl <= r0 * 0.5)) ? "tr_beout" : "tr_slp";
}
export async function afterBE(admin: Any, userId: string, ticket: number) {
  await sleep(8000);
  const ctx = await loadCtx(admin, userId); if (!ctx || !cfgOf(ctx.j).trades) return;
  const me = ctx.rows.find((r) => r.ticket === ticket); if (!me || !me.be_at || isCopy(ctx, me)) return;
  if (me.closed_at) return;                          // already closed: the close says it
  return await deliver(admin, userId, "trade", [item("tr_be", String(ticket), tradeWords(ctx, me, "tr_be"), mates(ctx, me))], esOf(ctx.j), 0);
}
export async function afterCloseTrade(admin: Any, userId: string, ticket: number) {
  await sleep(8000);
  const ctx = await loadCtx(admin, userId); if (!ctx || !cfgOf(ctx.j).trades) return;
  const me = ctx.rows.find((r) => r.ticket === ticket); if (!me || me.pnl == null || isCopy(ctx, me)) return;
  const rule = closeAlert(ctx, me); if (!rule) return;
  return await deliver(admin, userId, "trade", [item(rule, String(ticket), tradeWords(ctx, me, rule, Number(me.pnl)), mates(ctx, me))], esOf(ctx.j), 0);
}

// ---------- the red-news timer (nudge-cron, every minute while red news is under an hour away) ----------
export async function newsTick(admin: Any) {
  const now = clock(), news = await redNews(admin, now, now + 61 * 60000);
  if (!news.length) return { news: 0 };
  // Members a phone push can reach.
  const { data: subs } = await admin.from("push_subscriptions").select("user_id");
  const users = Array.from(new Set((subs || []).map((r: Any) => String(r.user_id))));
  const out: string[] = [];
  await Promise.all(users.map(async (userId) => {
    try {
      const ctx = await loadCtx(admin, userId); if (!ctx) return;
      const c = cfgOf(ctx.j); if (!c.on || !(c.news > 0)) return;
      const tz = tzOf(ctx.j), es = esOf(ctx.j);
      // Open now: the server's open rows that the EA is still announcing (seen in the last 2 minutes).
      const open0 = ctx.rows.filter((r) => !r.closed_at);
      let open: Row[] = [];
      if (open0.length) {
        const { data: lt } = await admin.from("live_trades").select("ticket, seen_at, closed_at").eq("account", userId).in("ticket", open0.map((r) => r.ticket));
        const live = new Set((lt || []).filter((x: Any) => !x.closed_at && x.seen_at && now - Date.parse(x.seen_at) < 120000).map((x: Any) => Number(x.ticket)));
        if (DRY) DRY_ROWS.forEach((x) => { if (!x.closed_at) live.add(Number(x.ticket)); });
        open = open0.filter((r) => live.has(r.ticket) && !isCopy(ctx, r));
      }
      const curs = myCurs(ctx.j);
      open.forEach((o) => cursOf(o.symbol).forEach((x) => { if (curs.indexOf(x) === -1) curs.push(x); }));
      const items: Item[] = [];
      for (const g0 of news) {
        if (!(g0.at > now && g0.at - now <= c.news * 60000)) continue;
        const g = forCurs(g0, curs); if (!g) continue;
        const holders = open.filter((o) => cursOf(o.symbol).some((x) => g.curs.indexOf(x) !== -1));
        if (holders.length) holders.forEach((o) => items.push(item("news_hold", String(o.ticket), newsLine("news_hold", es, g, g.at - now, tz), mates(ctx, o))));
        else if (newsMatters(ctx.j, tz, g, now)) items.push({ rule: "news_soon", key: "news_soon:E" + g.at, text: newsLine("news_soon", es, g, g.at - now, tz) });
      }
      // The app shows these on a 20 s timer: give an open window time to claim them first.
      const r = await deliver(admin, userId, "nudge", items, es, 30000);
      if (r && r.length) out.push(userId.slice(0, 6) + ":" + r.join(","));
    } catch (_) { /* one member never stops the rest */ }
  }));
  return { news: news.length, users: users.length, sent: out };
}
