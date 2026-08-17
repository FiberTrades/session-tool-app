// =============================================================================
// FOREX CALENDAR PROXY - Deno Deploy (v17 - Sonnet as extreme last resort only)
// =============================================================================
// ---- (v17.1) runtime logging -----------------------------------------------
//   The rich `debug` object was only ever persisted to Supabase as actuals:debug,
//   and that row is OVERWRITTEN each refresh - so a bad 11:00 run is erased by the
//   16:00 one and there is no history to diagnose from. v17.1 also console.logs the
//   same milestones (cron.tick / refresh.start / refresh.scope / claude.ask /
//   claude.res / merge / sonnet.eligible / refresh.done / *.err). Deno Deploy keeps
//   runtime logs for days, so the per-run trail survives. All lines are prefixed
//   "[eca]" and filterable via the logs API (?query=eca). Behaviour is otherwise
//   unchanged - no extra calls, no extra cost.
//
// WHAT CHANGED FROM v16:
//   v16 escalated to Sonnet whenever ANYTHING was still missing after Haiku -
//   too eager (a number Haiku simply hasn't indexed yet would trigger it). v17
//   makes Sonnet a genuine last resort with PERSISTED per-event miss-counters:
//   Sonnet is used ONLY for an event that (a) was released >= 3h ago (so the data
//   definitely exists), (b) Haiku has already failed in >= 3 separate fetches, and
//   (c) Sonnet hasn't itself already tried twice. Everything else stays pure
//   Haiku. In normal operation Sonnet never runs; it only fires for a genuinely
//   stuck print (e.g. an obscure CHF CPI), and even then a bounded number of
//   times. The counters are stored week-scoped alongside the actuals cache.
//
// ---- (v16) data-only "wanted" set ------------------------------------------
// WHAT CHANGED FROM v15:
//   1. DATA-ONLY WANTED SET. The gap loop was chasing events that have NO actual
//      to find - speeches ("President Trump Speaks"), meetings ("OPEC-JMMC
//      Meetings"), holidays - so "missing" never reached 0 and every scheduled
//      fetch wasted a Claude call retrying them forever. v16 only treats an event
//      as wanted if the FF feed gives it a numeric <forecast> OR <previous> - the
//      reliable signal that it's a DATA RELEASE (speeches/meetings/holidays carry
//      neither). The loop now converges to genuinely-missing releases only.
//   2. TIERED MODEL. Cheap Haiku does the bulk (up to 2 rounds); Sonnet is used
//      ONLY to mop up the handful of releases Haiku still can't fetch (e.g. an
//      obscure CHF CPI print). Because Sonnet sees only those few events, the
//      pricier model stays cheap - and when the cache is already complete NEITHER
//      model is called at all. (Anthropic's web_search uses its own backend, so
//      "search Google" isn't selectable - the Sonnet mop-up is the reliable way
//      to close what Haiku's search misses.)
//
// ---- (v15) gap-driven retry loop -------------------------------------------
// WHAT CHANGED FROM v14:
//   Each individual Haiku call still only surfaces ~6 events per run, so a single
//   fetch could leave released events without an actual. v15 closes the gap
//   deterministically instead of hoping later scheduled runs catch up:
//     - After each Claude round, the WORKER (not the model) computes exactly
//       which wanted+released events still have no actual, by diffing the FF
//       event list against the merged cache.
//     - If any are missing, it runs AGAIN asking ONLY for those missing events
//       (a smaller, sharper list => the search budget lands on the stragglers).
//     - It loops until nothing is missing OR a round finds nothing new (Haiku is
//       tapped out for now), capped at MAX_ROUNDS to bound cost.
//     - When the cache is already complete it makes ZERO Claude calls, so v15 is
//       cheaper than v14 in steady state and only spends when there's a real gap.
//   "Wanted" = High/Medium impact (exactly what the app can display an actual
//   for; Low is dropped in-app, Holiday events have no actual). This is a single
//   SHARED fetch for every user, so it targets that superset and the app filters
//   the view per user - it can't (and shouldn't) read one user's live filter.
//
// ---- (v14 changes, still in effect) ----------------------------------------
//     - Only asks about events whose scheduled time has already PASSED.
//     - Scales the web-search budget to the number of events (min 6, cap 14).
//     - MERGES into the week's existing actuals (week-scoped) - never overwrites.
//     - Logs web_search_requests to the AI meter (~$0.01 each).
//   To push recall even higher still, set ECA_MODEL to "claude-sonnet-5".
//
// ---- (v13 notes, still current) --------------------------------------------
//   Deno KV is unavailable on this deployment ("Deno.openKv is not a function"),
//   so the worker uses SUPABASE (public.worker_cache) as the shared store:
//     - Actuals are fetched at EXACTLY 11:00 / 16:00 / 21:00 Europe/London on
//       weekdays (FETCH_HOURS).
//     - /actuals is READ-ONLY: it serves the shared copy and NEVER triggers a
//       Claude call on user traffic.
//     - Every user/device sees the same actuals (shared, not per-instance).
//   The XML feed (forecast/previous) is per-instance in-memory cached.
//   Requires the one-time table in supabase/worker_cache_setup.sql.
//
// ENV VARS (Deno Deploy -> Settings -> Environment Variables):
//   ANTHROPIC_API_KEY          (required - the Claude call)
//   SUPABASE_SERVICE_ROLE_KEY  (required - shared cache + meter logging)
//
// Endpoints:
//   GET /                        -> FF weekly XML (forecast/previous)
//   GET /actuals                 -> shared actuals (READ-ONLY, never scrapes)
//   GET /actuals?fresh=1&debug=1 -> force one refresh now AND return the log (admin test)
//   GET /status                  -> JSON: keys, cache age, next fetch times, last attempt
// =============================================================================

const FF_XML_URL      = "https://nfs.faireconomy.media/ff_calendar_thisweek.xml";
const FF_XML_NEXT_URL = "https://nfs.faireconomy.media/ff_calendar_nextweek.xml";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const ECA_MODEL = "claude-haiku-4-5";           // primary (cheap) - does the bulk of the fetching
const ECA_MODEL_FALLBACK = "claude-sonnet-5";   // mop-up ONLY for events Haiku couldn't fetch (targeted, so still cheap)

const SUPABASE_URL = "https://figozyxoyobixadhqewr.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ECA_SYSTEM_UID = "00000000-0000-0000-0000-000000000eca";

// ---- Fetch schedule (Europe/London, weekdays) ------------------------------
const FETCH_HOURS = [11, 16, 21];   // exactly these 3 hours -> 3 Claude calls/day
const REFRESH_TZ  = "Europe/London";
const REFRESH_WEEKDAYS_ONLY = true;

// ---- Freshness ties ---------------------------------------------------------
const ACTUALS_MAX_AGE_MS = 6 * 60 * 60 * 1000; // >6h old => label HIT-STALE
const SHARED_MEM_TTL_MS  = 60 * 1000;          // re-read Supabase at most 1x/min per instance
const XML_FRESH_TTL      = 60 * 60;            // 1h
const STALE_TTL          = 7 * 24 * 60 * 60;   // 7 days
const XML_BROWSER_MAXAGE     = 15 * 60;
const ACTUALS_BROWSER_MAXAGE = 3 * 60;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Access-Control-Expose-Headers": "X-Proxy-Cache",
};
const UPSTREAM_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/xml,*/*;q=0.9",
  "Accept-Language": "en-US,en;q=0.5",
};
const XML_FETCHERS: Array<(u: string) => string> = [
  (u) => u,
  (u) => "https://api.allorigins.win/raw?url=" + encodeURIComponent(u),
  (u) => "https://api.codetabs.com/v1/proxy/?quest=" + encodeURIComponent(u),
];

// =============================================================================
// RUNTIME LOGGING
// =============================================================================
// The `debug` object below is persisted to Supabase (actuals:debug) but that row is
// OVERWRITTEN every refresh, so only the newest attempt survives - a bad 11:00 run is
// erased by 16:00 before anyone looks. Deno Deploy retains runtime logs for days, so
// these lines are the per-run HISTORY. Every line is prefixed "[eca]" and tagged, so
// the logs API can filter them: /v2/apps/<app>/logs?query=eca.
function log(tag: string, data?: Record<string, unknown>): void {
  try { console.log(`[eca] ${tag}` + (data ? " " + JSON.stringify(data) : "")); } catch { /* never let logging break a fetch */ }
}

// =============================================================================
// XML CACHE - per-instance in-memory only (fine; XML is cheap + not user-shared).
// =============================================================================
interface MemRec { body: string; cachedAt: number; }
const mem = new Map<string, MemRec>();

// =============================================================================
// SUPABASE SHARED CACHE (the actuals live here so every instance agrees).
// =============================================================================
const SB_HEADERS = { apikey: SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "content-type": "application/json" };
// deno-lint-ignore no-explicit-any
async function sbGet(key: string): Promise<{ value: any; updatedAt: number } | null> {
  if (!SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const r = await fetchWithTimeout(`${SUPABASE_URL}/rest/v1/worker_cache?key=eq.${encodeURIComponent(key)}&select=value,updated_at`, 15000, SB_HEADERS);
    if (!r.ok) return null;
    const rows = await r.json();
    if (!Array.isArray(rows) || !rows.length) return null;
    return { value: rows[0].value, updatedAt: Date.parse(rows[0].updated_at) };
  } catch { return null; }
}
// deno-lint-ignore no-explicit-any
async function sbSet(key: string, value: any): Promise<boolean> {
  if (!SUPABASE_SERVICE_ROLE_KEY) return false;
  try {
    const r = await fetchWithTimeout(`${SUPABASE_URL}/rest/v1/worker_cache?on_conflict=key`, 15000,
      { ...SB_HEADERS, Prefer: "resolution=merge-duplicates,return=minimal" },
      JSON.stringify({ key, value, updated_at: new Date().toISOString() }));
    return r.ok;
  } catch { return false; }
}

// =============================================================================
// CALENDAR EVENTS — persisted for the app's Trade Replay news strip.
// =============================================================================
// The FF feed carries THIS week and next only, and worker_cache keeps just the matched
// actuals — week-scoped and overwritten every fetch. So nothing survived to tell a replay
// what news landed during a trade, even though this worker parses all of it and throws
// most of it away. These rows are the durable record.
//
// Only High/Medium/Holiday are stored. Low impact is noise on a chart; holidays are exactly
// what a trader wants flagged, even though they never carry a number to fetch.
// deno-lint-ignore no-explicit-any
async function sbUpsertEvents(rows: any[]): Promise<boolean> {
  if (!SUPABASE_SERVICE_ROLE_KEY || !rows.length) return false;
  try {
    const r = await fetchWithTimeout(
      `${SUPABASE_URL}/rest/v1/calendar_events?on_conflict=event_date,currency,title`, 20000,
      { ...SB_HEADERS, Prefer: "resolution=merge-duplicates,return=minimal" },
      JSON.stringify(rows));
    return r.ok;
  } catch { return false; }
}

async function persistEvents(ffEvents: FFEvent[], byKey: Map<string, ActualEntry>): Promise<number> {
  const keep = ffEvents.filter((e) => /high|medium|holiday/i.test(e.impact));
  if (!keep.length) return 0;
  const base = (e: FFEvent) => ({
    event_date: e.dateKey, at: new Date(e.whenMs).toISOString(), timed: e.timed,
    currency: e.currency, title: e.title, impact: e.impact,
    forecast: e.forecast || null, previous: e.previous || null,
    updated_at: new Date().toISOString(),
  });
  // SPLIT BY WHETHER THE ACTUAL IS KNOWN. One batch would have to send actual:null for the
  // unknowns, and merge-duplicates would then wipe a value fetched on an earlier run — the
  // precise regression this table exists to prevent. Rows with no known actual omit the
  // column entirely, so an existing value is left alone.
  // deno-lint-ignore no-explicit-any
  const withA: any[] = [], withoutA: any[] = [];
  for (const e of keep) {
    const hit = byKey.get(`${e.dateKey}|${e.currency}|${e.title}`);
    if (hit && hit.actual) withA.push({ ...base(e), actual: hit.actual });
    else withoutA.push(base(e));
  }
  let n = 0;
  if (withoutA.length && await sbUpsertEvents(withoutA)) n += withoutA.length;
  if (withA.length    && await sbUpsertEvents(withA))    n += withA.length;
  return n;
}

// Short per-instance memo over the shared actuals so we don't hit Supabase on every request.
// deno-lint-ignore no-explicit-any
let memActuals: { value: any; updatedAt: number; readAt: number } | null = null;
// deno-lint-ignore no-explicit-any
async function getSharedActuals(): Promise<{ value: any; updatedAt: number } | null> {
  if (memActuals && (Date.now() - memActuals.readAt) < SHARED_MEM_TTL_MS) return memActuals;
  const rec = await sbGet("actuals");
  if (rec) { memActuals = { ...rec, readAt: Date.now() }; return rec; }
  return memActuals ? { value: memActuals.value, updatedAt: memActuals.updatedAt } : null;
}

// =============================================================================
// FF XML PARSING
// =============================================================================
const ET_FMT = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "America/New_York" });
interface FFEvent { currency: string; title: string; dateKey: string; whenMs: number; impact: string; hasNumeric: boolean; forecast: string; previous: string; timed: boolean; }

function xmlTag(block: string, name: string): string {
  const m = block.match(new RegExp("<" + name + ">([\\s\\S]*?)</" + name + ">", "i"));
  return m ? cdata(m[1]) : "";
}
function cdata(s: string): string {
  const m = s.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return (m ? m[1] : s).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#0?39;/g, "'").trim();
}
function ffWhenMs(dateStr: string, timeStr: string): number | null {
  const dm = dateStr.split("-"); const mo = parseInt(dm[0], 10), d = parseInt(dm[1], 10), y = parseInt(dm[2], 10);
  if (isNaN(mo) || isNaN(d) || isNaN(y)) return null;
  const timed = !!timeStr && /\d/.test(timeStr) && !/all day|tentative/i.test(timeStr);
  if (timed) {
    const tm = timeStr.toLowerCase().match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
    if (tm) { let h = parseInt(tm[1], 10); const mi = parseInt(tm[2], 10); if (tm[3] === "pm" && h !== 12) h += 12; if (tm[3] === "am" && h === 12) h = 0; return Date.UTC(y, mo - 1, d, h, mi, 0); }
  }
  return Date.UTC(y, mo - 1, d, 12, 0, 0);
}
function parseFFEvents(xml: string): FFEvent[] {
  const out: FFEvent[] = [];
  const blocks = xml.match(/<event>[\s\S]*?<\/event>/gi) || [];
  for (const b of blocks) {
    const title = xmlTag(b, "title");
    const currency = xmlTag(b, "country").toUpperCase();
    const dateStr = xmlTag(b, "date");
    const timeStr = xmlTag(b, "time");
    const impact = xmlTag(b, "impact");
    if (!title || !currency || !dateStr) continue;
    const whenMs = ffWhenMs(dateStr, timeStr);
    if (whenMs == null) continue;
    // A DATA RELEASE carries a numeric forecast or previous; speeches, meetings
    // and holidays carry neither, so they have no "actual" to chase.
    const forecast = xmlTag(b, "forecast");
    const previous = xmlTag(b, "previous");
    const hasNumeric = /\d/.test(forecast) || /\d/.test(previous);
    // Same test ffWhenMs uses to decide whether to trust the time: "All Day" and "Tentative"
    // carry no clock, and get parked at 12:00 UTC. The calendar strip needs to know that the
    // timestamp is a placeholder rather than draw a holiday at midday as if it were a release.
    // (timeStr is already read above for ffWhenMs — do not redeclare it.)
    const timed = !!timeStr && /\d/.test(timeStr) && !/all day|tentative/i.test(timeStr);
    out.push({ currency, title, dateKey: ET_FMT.format(new Date(whenMs)), whenMs, impact, hasNumeric, forecast, previous, timed });
  }
  return out;
}
async function fetchFFXml(feedUrl: string, debug: string[]): Promise<string | null> {
  for (const build of XML_FETCHERS) {
    const target = build(feedUrl);
    try {
      const resp = await fetchWithTimeout(target, 20_000, UPSTREAM_HEADERS);
      if (!resp.ok) { debug.push(`${hostOf(target)}: HTTP ${resp.status}`); continue; }
      const body = await resp.text();
      if (body && body.length > 50 && body.indexOf("<event") !== -1) return body;
      debug.push(`${hostOf(target)}: invalid body (len=${body.length})`);
    } catch (e) { debug.push(`${hostOf(target)}: ${msg(e)}`); }
  }
  return null;
}

// =============================================================================
// CLAUDE WEB-SEARCH ACTUALS
// =============================================================================
function weekRange(): { from: string; to: string } {
  const now = new Date();
  const day = now.getUTCDay();
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const mon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diffToMon));
  const sun = new Date(mon.getTime() + 6 * 24 * 3600 * 1000);
  const fmt = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  return { from: fmt(mon), to: fmt(sun) };
}

// Ask Claude for the actuals of a SPECIFIC target list (the caller decides what to
// ask for - on later rounds that's only the still-missing events). Returns the raw
// parsed array, or null on error. Per-round debug is pushed to debug.rounds and the
// latest round is mirrored to debug.claude for the /status page.
// deno-lint-ignore no-explicit-any
async function fetchActualsViaClaude(targets: FFEvent[], debug: any, round: number, model: string): Promise<any[] | null> {
  // deno-lint-ignore no-explicit-any
  const rd: any = { round, asked: targets.length, model };
  (debug.rounds = debug.rounds || []).push(rd);
  debug.claude = rd;   // latest round, for /status back-compat
  if (!ANTHROPIC_API_KEY) { rd.error = "ANTHROPIC_API_KEY not set"; log("claude.err", { round, error: "ANTHROPIC_API_KEY not set" }); return null; }
  if (!targets.length) { rd.note = "nothing to ask"; return []; }
  const { from, to } = weekRange();
  const list = targets.map((e) => `${e.currency} | ${e.title} | ${e.dateKey}`).join("\n");
  // Give the model enough search budget to reach every target event - one search
  // usually only surfaces the day's headline print. Billed per search performed
  // (~$0.01), and the model only uses what it needs, so a generous cap is cheap.
  const maxSearches = Math.min(14, Math.max(6, Math.ceil(targets.length / 2)));
  log("claude.ask", { round, model, asked: targets.length, maxSearches });

  const prompt =
    `You are filling in the ACTUAL released values on an economic calendar for the week ${from} to ${to}.\n\n` +
    `Here is the list of events (CURRENCY | EVENT | DATE):\n${list}\n\n` +
    `Use web search to find each event's ACTUAL (released) value. Reputable sources: MarketWatch, ` +
    `Investing.com, Trading Economics, FXStreet, Forex Factory.\n\n` +
    `Be EXHAUSTIVE. The list spans several days. If one search does not surface every event, run ` +
    `additional searches (e.g. one per day, or per release) until you have located the actual for ` +
    `EVERY event in the list that has been released - not only the prominent ones like Non-Farm ` +
    `Payrolls, CPI or ISM Manufacturing. Mid-tier releases (ADP, ISM Services PMI, JOLTS, Unemployment ` +
    `Claims, PMIs) matter just as much and are the ones most often missed.\n\n` +
    `Return ONLY a JSON array (no prose, no markdown) of objects for events whose actual HAS been released:\n` +
    `[{"currency":"USD","event":"<echo the EVENT text exactly as given above>","date":"YYYY-MM-DD","actual":"<value as shown, e.g. 55.6, -0.1%, 44K, -$73.3B>"}]\n\n` +
    `Rules: include an event ONLY if you find a confirmed released actual; omit anything not yet released or uncertain. ` +
    `Do NOT guess. Each event has its OWN distinct value - NEVER reuse one event's number for another (e.g. ADP is not Non-Farm Payrolls; ISM Manufacturing is not ISM Services). ` +
    `Echo the EVENT text, CURRENCY and DATE exactly as given so they can be matched.`;

  const reqBody = {
    model,
    max_tokens: 4000,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: maxSearches }],
    messages: [{ role: "user", content: prompt }],
  };
  // deno-lint-ignore no-explicit-any
  let data: any;
  try {
    const resp = await fetchWithTimeout("https://api.anthropic.com/v1/messages", 120_000, {
      "content-type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01",
    }, JSON.stringify(reqBody));
    const txt = await resp.text();
    try { data = JSON.parse(txt); } catch { rd.status = resp.status; rd.raw = txt.slice(0, 300); log("claude.err", { round, model, status: resp.status, error: "non-json response", raw: txt.slice(0, 120) }); return null; }
    rd.status = resp.status;
    if (!resp.ok) { rd.error = data?.error?.message || `HTTP ${resp.status}`; log("claude.err", { round, model, status: resp.status, error: rd.error }); return null; }
  } catch (e) { rd.error = msg(e); log("claude.err", { round, model, error: msg(e) }); return null; }

  try { await recordEcaUsage(data?.usage, model); } catch { /* */ }

  const text = (data?.content ?? []).filter((b: any) => b?.type === "text").map((b: any) => b.text || "").join("\n").trim();
  rd.usage = data?.usage || null;
  rd.textSample = text.slice(0, 200);
  const arr = extractJsonArray(text);
  // Cost is driven by web_search_requests (~$0.01 each) as much as by tokens, so log
  // both - this is the only per-run record of what a fetch actually cost.
  log("claude.res", {
    round, model, status: rd.status, parsed: arr ? arr.length : null,
    in: data?.usage?.input_tokens ?? 0, out: data?.usage?.output_tokens ?? 0,
    searches: data?.usage?.server_tool_use?.web_search_requests ?? 0,
  });
  if (!arr) { rd.parse = "no-json-array"; log("claude.err", { round, model, error: "no-json-array", textSample: text.slice(0, 120) }); return null; }
  rd.parsed = arr.length;
  return arr;
}
// deno-lint-ignore no-explicit-any
function extractJsonArray(text: string): any[] | null {
  let t = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const i = t.indexOf("["), j = t.lastIndexOf("]");
  if (i < 0 || j < 0 || j <= i) return null;
  t = t.slice(i, j + 1);
  try { const v = JSON.parse(t); return Array.isArray(v) ? v : null; } catch { return null; }
}
// deno-lint-ignore no-explicit-any
async function recordEcaUsage(usage: any, model: string): Promise<void> {
  if (!usage || !SUPABASE_SERVICE_ROLE_KEY) return;
  await fetch(`${SUPABASE_URL}/rest/v1/ai_usage`, {
    method: "POST",
    headers: { ...SB_HEADERS, "prefer": "return=minimal" },
    body: JSON.stringify({
      user_id: ECA_SYSTEM_UID, model, mode: "ecafetch",
      input_tokens: usage.input_tokens ?? 0, output_tokens: usage.output_tokens ?? 0,
      cache_creation_tokens: usage.cache_creation_input_tokens ?? 0, cache_read_tokens: usage.cache_read_input_tokens ?? 0,
      web_search_requests: usage.server_tool_use?.web_search_requests ?? 0,   // billed separately from tokens (~$0.01 each)
    }),
  });
}

// =============================================================================
// MATCHING (exact normalized-title; Claude echoes FF titles)
// =============================================================================
const STOP = new Set(["the", "of", "a", "and", "rate", "index", "data", "report", "s", "for", "in"]);
function normTokens(s: string): string[] {
  return s.toLowerCase().replace(/&amp;/g, "&")
    .replace(/\bm\/m\b/g, "mom").replace(/\by\/y\b/g, "yoy").replace(/\bq\/q\b/g, "qoq")
    .replace(/non[- ]?farm/g, "nonfarm")
    .replace(/[^a-z0-9]+/g, " ").split(" ").filter((w) => w && !STOP.has(w));
}
function normStr(s: string): string { return normTokens(s).slice().sort().join(" "); }
function jaccard(a: string, b: string): number {
  const A = new Set(normTokens(a)), B = new Set(normTokens(b));
  if (!A.size || !B.size) return 0;
  let inter = 0; for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}
interface ActualEntry { country: string; title: string; dateKey: string; actual: string; }
// deno-lint-ignore no-explicit-any
function matchActuals(ffEvents: FFEvent[], claude: any[], debug: any): ActualEntry[] {
  const cl = claude.map((x) => ({
    ccy: String(x.currency || x.country || "").toUpperCase(),
    event: String(x.event || ""), date: String(x.date || "").trim(),
    actual: String(x.actual ?? "").trim(),
  })).filter((x) => x.ccy && x.event && x.actual && x.actual.toLowerCase() !== "null");
  debug.claudeRaw = cl;

  const ffByKey = new Map<string, FFEvent[]>();
  for (const ev of ffEvents) { const k = ev.currency + "|" + normStr(ev.title); if (!ffByKey.has(k)) ffByKey.set(k, []); ffByKey.get(k)!.push(ev); }

  const entries: ActualEntry[] = [];
  // deno-lint-ignore no-explicit-any
  const unmatched: any[] = [];
  const seen = new Set<string>();
  for (const c of cl) {
    let cands = ffByKey.get(c.ccy + "|" + normStr(c.event)) || [];
    if (!cands.length) {
      let best: FFEvent | null = null, bs = 0;
      for (const ev of ffEvents) { if (ev.currency !== c.ccy) continue; const s = jaccard(ev.title, c.event); if (s > bs) { bs = s; best = ev; } }
      if (best && bs >= 0.8) cands = [best];
    }
    if (cands.length > 1) { const byDate = cands.filter((ev) => ev.dateKey === c.date); cands = byDate.length ? byDate : [cands[0]]; }
    if (cands.length === 1) {
      const ev = cands[0]; const k = `${ev.dateKey}|${ev.currency}|${ev.title}`;
      if (!seen.has(k)) { seen.add(k); entries.push({ dateKey: ev.dateKey, country: ev.currency, title: ev.title, actual: c.actual }); }
    } else { unmatched.push(c); }
  }
  debug.ffCount = ffEvents.length; debug.matched = entries.length; debug.unmatchedClaude = unmatched.slice(0, 30);
  return entries;
}

// =============================================================================
// REFRESH (writes to the Supabase shared cache)
// =============================================================================
let actualsInFlight: Promise<boolean> | null = null;
// deno-lint-ignore no-explicit-any
let lastDebug: any = null;

async function refreshActuals(): Promise<boolean> {
  if (actualsInFlight) return actualsInFlight;
  actualsInFlight = (async () => {
    // deno-lint-ignore no-explicit-any
    const debug: any = { at: Date.now(), anthropicKeySet: !!ANTHROPIC_API_KEY, xml: [] };
    log("refresh.start", { week: currentWeekKey(), anthropicKeySet: !!ANTHROPIC_API_KEY, supabaseKeySet: !!SUPABASE_SERVICE_ROLE_KEY });
    try {
      let xml: string | null = null;
      const xc = mem.get(`xml:${currentWeekKey()}`);
      if (xc && (Date.now() - xc.cachedAt) / 1000 < STALE_TTL) { xml = xc.body; debug.xml.push("cache"); }
      if (!xml) { xml = await fetchFFXml(FF_XML_URL, debug.xml); if (xml) mem.set(`xml:${currentWeekKey()}`, { body: xml, cachedAt: Date.now() }); }
      if (!xml) { debug.result = "no-xml"; log("refresh.err", { error: "no-xml", attempts: debug.xml }); return false; }

      const ffEvents = parseFFEvents(xml);

      // Seed the merged set + the miss-counters from this week's existing cache
      // (week-scoped so both reset cleanly on a new week). Keyed by date|ccy|title.
      const wk = currentWeekKey();
      const prevRec = await sbGet("actuals");
      const sameWeek = prevRec?.value?.weekKey === wk;
      const prevSameWeek: ActualEntry[] = (sameWeek && Array.isArray(prevRec.value.actuals)) ? prevRec.value.actuals : [];
      const byKey = new Map<string, ActualEntry>();
      for (const e of prevSameWeek) byKey.set(`${e.dateKey}|${e.country}|${e.title}`, e);
      // misses[key] = { h, s } : how many FETCHES Haiku / Sonnet have failed this event.
      // deno-lint-ignore no-explicit-any
      const misses: Record<string, { h: number; s: number }> = (sameWeek && prevRec.value.misses && typeof prevRec.value.misses === "object") ? { ...prevRec.value.misses } : {};

      // What the app can show an actual for = High/Medium impact, and only events
      // whose scheduled time has already passed (so the actual exists to be found).
      const nowMs = Date.now();
      const ffKey = (e: FFEvent) => `${e.dateKey}|${e.currency}|${e.title}`;
      const wantedReleased = ffEvents.filter((e) => /high|medium/i.test(e.impact) && e.hasNumeric && e.whenMs <= nowMs);
      debug.wantedReleased = wantedReleased.length;
      log("refresh.scope", { ffEvents: ffEvents.length, wantedReleased: wantedReleased.length, cachedThisWeek: prevSameWeek.length, sameWeek });

      // Persist the calendar BEFORE the Claude phase, deliberately. The event list, its times,
      // forecasts and impacts come straight from the XML and owe nothing to the actuals — and
      // on 2026-08-17 the 16:00 London run was killed mid-Claude-call, taking everything after
      // it with it (no usage row, no cache write, not even the finally block). Anything placed
      // after that phase inherits its mortality. Actuals are the one part that can safely be
      // late: byKey already carries whatever earlier runs found, and a later run updates the
      // same rows in place.
      try {
        const n = await persistEvents(ffEvents, byKey);
        debug.eventsStored = n;
        log("events.stored", { n, ofFF: ffEvents.length });
      } catch (e) { log("events.err", { error: msg(e) }); }

      const mergeIn = (entries: ActualEntry[]): number => {
        let n = 0;
        for (const e of entries) { const k = `${e.dateKey}|${e.country}|${e.title}`; if (!byKey.has(k)) n++; byKey.set(k, e); }
        if (debug.rounds && debug.rounds.length) debug.rounds[debug.rounds.length - 1].newFound = n;
        log("merge", { matched: entries.length, new: n, total: byKey.size });
        return n;
      };
      let roundIdx = 0;

      // PHASE 1 - Haiku does ALL normal work: up to 2 gap-driven rounds, asking
      // only for the still-missing events each round, stopping early if a round
      // finds nothing new. Zero calls if the cache is already complete.
      for (let r = 0; r < 2; r++) {
        const missing = wantedReleased.filter((e) => !byKey.has(ffKey(e)));
        if (!missing.length) break;
        const claude = await fetchActualsViaClaude(missing, debug, roundIdx++, ECA_MODEL);
        if (claude === null) break;
        if (mergeIn(matchActuals(ffEvents, claude, debug)) === 0) break;
      }

      // Update the persisted miss-counters: clear found events, and for events
      // Haiku STILL hasn't got this fetch, bump their Haiku-fail count by one.
      for (const e of wantedReleased) {
        const k = ffKey(e);
        if (byKey.has(k)) { delete misses[k]; }
        else { misses[k] = misses[k] || { h: 0, s: 0 }; misses[k].h += 1; }
      }

      // PHASE 2 - Sonnet: EXTREME LAST RESORT only. An event qualifies only if it
      //   (a) has been released long enough that the data definitely exists,
      //   (b) Haiku has already failed it in several separate fetches, and
      //   (c) Sonnet hasn't itself already given up on it.
      // So freshly-released numbers Haiku just hasn't indexed yet never hit Sonnet;
      // only genuinely stuck prints do, and each is retried a bounded number of times.
      const SONNET_MIN_RELEASED_AGE_MS = 3 * 60 * 60 * 1000;   // released >= 3h ago
      const SONNET_AFTER_HAIKU_FAILS   = 3;                    // Haiku missed it in >= 3 fetches
      const SONNET_MAX_TRIES           = 2;                    // then give Sonnet at most 2 attempts
      const sonnetTargets = wantedReleased.filter((e) => {
        const k = ffKey(e);
        if (byKey.has(k)) return false;
        const m = misses[k] || { h: 0, s: 0 };
        return (nowMs - e.whenMs) >= SONNET_MIN_RELEASED_AGE_MS && m.h >= SONNET_AFTER_HAIKU_FAILS && m.s < SONNET_MAX_TRIES;
      });
      debug.sonnetEligible = sonnetTargets.length;
      // Sonnet firing at all is the signal that an event is genuinely stuck - worth a
      // line of its own so it stands out in the log history.
      if (sonnetTargets.length) log("sonnet.eligible", { count: sonnetTargets.length, events: sonnetTargets.slice(0, 10).map((e) => `${e.currency} ${e.title} (${e.dateKey})`) });
      if (sonnetTargets.length) {
        const claude = await fetchActualsViaClaude(sonnetTargets, debug, roundIdx++, ECA_MODEL_FALLBACK);
        if (claude !== null) mergeIn(matchActuals(ffEvents, claude, debug));
        for (const e of sonnetTargets) {
          const k = ffKey(e);
          if (byKey.has(k)) delete misses[k];
          else { misses[k] = misses[k] || { h: 0, s: 0 }; misses[k].s += 1; }
        }
      }

      const merged = Array.from(byKey.values());
      const missingAfter = wantedReleased.filter((e) => !byKey.has(ffKey(e)));

      const payload = { actuals: merged, weekKey: wk, misses, fetchedAt: Date.now() };
      const ok = await sbSet("actuals", payload);
      memActuals = { value: payload, updatedAt: Date.now(), readAt: Date.now() };
      debug.mergedTotal = merged.length;
      debug.missingAfter = missingAfter.length;
      debug.missingList = missingAfter.slice(0, 20).map((e) => `${e.currency} ${e.title} (${e.dateKey})`);
      debug.result = `${merged.length}/${wantedReleased.length} wanted, ${missingAfter.length} still missing`;
      debug.stored = ok;
      log("refresh.done", {
        merged: merged.length, wanted: wantedReleased.length, missing: missingAfter.length,
        rounds: (debug.rounds || []).length, stored: ok,
        missingList: missingAfter.slice(0, 10).map((e) => `${e.currency} ${e.title} (${e.dateKey})`),
      });
      if (!ok) log("refresh.err", { error: "supabase write failed (actuals not persisted)" });
      return true;
    } catch (e) { debug.result = "error: " + msg(e); log("refresh.err", { error: msg(e) }); return false; }
    finally { lastDebug = debug; try { await sbSet("actuals:debug", debug); } catch { /* */ } actualsInFlight = null; }
  })();
  return actualsInFlight;
}

function windowState(): { hour: number; weekday: string; isWeekend: boolean } {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: REFRESH_TZ, hour: "2-digit", hourCycle: "h23", weekday: "short" }).formatToParts(new Date());
  const hour = parseInt(parts.find((p) => p.type === "hour")!.value, 10);
  const weekday = parts.find((p) => p.type === "weekday")!.value;
  return { hour, weekday, isWeekend: weekday === "Sat" || weekday === "Sun" };
}

// Fires every hour on the hour (UTC); the handler gates to the London FETCH_HOURS,
// so it runs exactly at 11:00 / 16:00 / 21:00 London (handles BST/GMT) on weekdays.
Deno.cron("refresh-actuals", "0 * * * *", async () => {
  const ws = windowState();
  // One line per tick (24/day) - cheap, and it is the only proof the cron fires at
  // all. Without it a silently-dead schedule looks identical to "nothing to fetch".
  const due = !(REFRESH_WEEKDAYS_ONLY && ws.isWeekend) && FETCH_HOURS.includes(ws.hour);
  log("cron.tick", { hour: ws.hour, weekday: ws.weekday, due });
  if (!due) return;
  await refreshActuals();
});

// =============================================================================
// SERVER
// =============================================================================
Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (request.method !== "GET") return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  const url = new URL(request.url);
  const forceFresh = url.searchParams.has("fresh") || url.searchParams.has("nocache");
  const wantDebug = url.searchParams.has("debug");
  if (url.pathname.startsWith("/status")) return serveStatus();
  if (url.pathname.startsWith("/actuals")) return serveActuals(forceFresh, wantDebug);
  return serveXml(forceFresh, url.searchParams.get("week") === "next");
});

async function serveXml(forceFresh: boolean, next: boolean): Promise<Response> {
  const feedUrl = next ? FF_XML_NEXT_URL : FF_XML_URL;
  const key = `${next ? "xmlnext" : "xml"}:${currentWeekKey()}`;
  const cached = mem.get(key);
  if (!forceFresh && cached && (Date.now() - cached.cachedAt) / 1000 < XML_FRESH_TTL) return out(cached.body, "application/xml; charset=utf-8", "HIT-FRESH", XML_BROWSER_MAXAGE);
  const debug: string[] = [];
  const body = await fetchFFXml(feedUrl, debug);
  if (body) { mem.set(key, { body, cachedAt: Date.now() }); return out(body, "application/xml; charset=utf-8", "MISS", XML_BROWSER_MAXAGE); }
  if (cached && (Date.now() - cached.cachedAt) / 1000 < STALE_TTL) return out(cached.body, "application/xml; charset=utf-8", "HIT-STALE", 60);
  return new Response(`All upstream fetchers failed:\n${debug.join("\n")}`, { status: 502, headers: CORS_HEADERS });
}

// READ-ONLY: serves the shared copy; only ?fresh=1 (admin) triggers a Claude call.
async function serveActuals(forceFresh: boolean, wantDebug: boolean): Promise<Response> {
  if (forceFresh) {
    await refreshActuals();
    const rec = await getSharedActuals();
    const val = rec?.value || { actuals: [], note: "refresh produced nothing" };
    return out(JSON.stringify(wantDebug ? { ...val, debug: lastDebug } : val), "application/json; charset=utf-8", "MISS", ACTUALS_BROWSER_MAXAGE);
  }
  const rec = await getSharedActuals();
  if (rec && rec.value) {
    const age = Date.now() - rec.updatedAt;
    return out(JSON.stringify(rec.value), "application/json; charset=utf-8", age < ACTUALS_MAX_AGE_MS ? "HIT-FRESH" : "HIT-STALE", ACTUALS_BROWSER_MAXAGE);
  }
  return out(JSON.stringify({ actuals: [], note: "warming up - no cached actuals yet" }), "application/json; charset=utf-8", "EMPTY", 30);
}

async function serveStatus(): Promise<Response> {
  const rec = await getSharedActuals();
  const dbg = await sbGet("actuals:debug");
  // deno-lint-ignore no-explicit-any
  let lastAttempt: any = null;
  try { const d = dbg?.value || lastDebug; lastAttempt = d ? { at: d.at ? new Date(d.at).toISOString() : null, result: d.result, stored: d.stored, wantedReleased: d.wantedReleased, mergedTotal: d.mergedTotal, missingAfter: d.missingAfter, missingList: d.missingList, sonnetEligible: d.sonnetEligible, rounds: d.rounds, claude: d.claude, ffCount: d.ffCount, unmatchedClaude: d.unmatchedClaude } : null; } catch { /* */ }
  const ws = windowState();
  const status = {
    anthropicKeySet: !!ANTHROPIC_API_KEY,
    supabaseKeySet: !!SUPABASE_SERVICE_ROLE_KEY,
    ecaModel: ECA_MODEL, ecaModelFallback: ECA_MODEL_FALLBACK,
    fetchTimes: FETCH_HOURS.map((h) => `${String(h).padStart(2, "0")}:00`).join(", ") + ` ${REFRESH_TZ}` + (REFRESH_WEEKDAYS_ONLY ? " (weekdays)" : ""),
    localHour: ws.hour, localWeekday: ws.weekday,
    actualsCount: rec?.value?.actuals?.length ?? 0,
    actualsAgeSec: rec ? Math.round((Date.now() - rec.updatedAt) / 1000) : null,
    lastAttempt,
  };
  return out(JSON.stringify(status, null, 2), "application/json; charset=utf-8", "STATUS", 30);
}

// =============================================================================
// HELPERS
// =============================================================================
function currentWeekKey(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const mon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diffToMon));
  return `${mon.getUTCFullYear()}-${String(mon.getUTCMonth() + 1).padStart(2, "0")}-${String(mon.getUTCDate()).padStart(2, "0")}`;
}
async function fetchWithTimeout(target: string, ms: number, headers?: HeadersInit, body?: string): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(target, { method: body ? "POST" : "GET", headers, body, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}
function hostOf(u: string): string { try { return new URL(u).host; } catch { return u.slice(0, 40); } }
function msg(e: unknown): string { return e instanceof Error ? e.message : String(e); }
function out(body: string, contentType: string, cacheStatus: string, maxAge: number): Response {
  return new Response(body, { status: 200, headers: { ...CORS_HEADERS, "Content-Type": contentType, "X-Proxy-Cache": cacheStatus, "Cache-Control": `public, max-age=${maxAge}, stale-while-revalidate=600` } });
}
