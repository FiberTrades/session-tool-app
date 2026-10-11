// ============================================================
//  Session Terminal : actuals-quick  (Supabase Edge Function)
//
//  The released figure of a red or orange news event, minutes after the release (12 Oct 2026).
//  Nestor: "the fetching of the actual column, why dont we change it for when news that expect to have an
//  actual number get release so the actual numbers appear almost instantly?"
//
//  pg_cron (actuals-quick-timer) looks every minute and calls this only while a release that carries a
//  forecast or a previous is 3 to 40 minutes old and still has no figure - see supabase/actuals_quick.sql.
//  st_actuals_take() hands over what is due and counts the try (at most three per event, at about +3, +8 and
//  +18 minutes), Claude reads the figure off the web, and it is written to calendar_events.actual. The app
//  reads that table while a release is fresh, and nudge-cron announces a red release's figure.
//
//  The Deno worker's fixed-hour read is untouched and does not know about this one, so each release still
//  gets a second, independent read about an hour later; a different number there becomes a correction.
//
//  Guarded by the x-cron-key header (NUDGE_CRON_KEY, the same key as nudge-cron). Deploy with "Verify JWT" OFF.
//
//  { mode:"dry", events:[{ currency, title, at, forecast, previous }] } asks about the given events and returns
//  what it would have written, without touching the database - for testing the reading on past releases.
// ============================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

// deno-lint-ignore no-explicit-any
type Any = any;
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL = "claude-haiku-4-5";
const ECA_SYSTEM_UID = "00000000-0000-0000-0000-000000000eca";   // the calendar's own row in ai_usage (AI Meter: ECA fetch)
const MAX_SEARCHES = 3;
const CLAUDE_TIMEOUT_MS = 75_000;

type Ev = { event_date?: string; at: string; currency: string; title: string; impact?: string; forecast: string | null; previous: string | null; tries?: number };

Deno.serve(async (req) => {
  const key = Deno.env.get("NUDGE_CRON_KEY");
  if (!key || req.headers.get("x-cron-key") !== key) return json({ error: "forbidden" }, 403);
  let body: Any = {};
  try { body = await req.json(); } catch (_) { body = {}; }
  try {
    if (body && body.mode === "dry") {
      const evs: Ev[] = (Array.isArray(body.events) ? body.events : []).slice(0, 6);
      const r = await ask(evs, Number(body.now) || Date.now());
      return json({ dry: true, found: r.found, raw: r.raw, usage: r.usage, ms: r.ms, error: r.error || null }, 200);
    }
    const work = run(key);
    try { EdgeRuntime.waitUntil(work); } catch (_) { /* not on the edge runtime */ }
    return json(await work, 200);
  } catch (e) {
    console.error("actuals-quick", String(e && (e as Error).stack || e));
    return json({ error: "failed" }, 500);
  }
});

async function run(cronKey: string) {
  const { data, error } = await admin.rpc("st_actuals_take");
  if (error) { console.error("actuals-quick take", error.message); return { asked: 0, error: "take" }; }
  const evs: Ev[] = data || [];
  if (!evs.length) return { asked: 0 };
  const now = Date.now();
  const r = await ask(evs, now);
  const wrote: string[] = [];
  let red = false;
  for (const f of r.found) {
    // Only where there is still no figure: the worker's own read may have landed in the meantime.
    const { data: up } = await admin.from("calendar_events").update({ actual: f.actual, actual_src: "quick" })
      .eq("event_date", f.ev.event_date).eq("currency", f.ev.currency).eq("title", f.ev.title).is("actual", null).select("title");
    if (up && up.length) {
      wrote.push(`${f.ev.currency} ${f.ev.title}=${f.actual}`);
      if (String(f.ev.impact || "").toLowerCase() === "high") red = true;
    }
  }
  const line = {
    at: new Date(now).toISOString(), ms: r.ms, error: r.error || null,
    asked: evs.map((e) => `${e.currency} ${e.title} @${String(e.at).slice(11, 16)} try ${e.tries}`),
    wrote, in: r.usage?.input_tokens ?? 0, out: r.usage?.output_tokens ?? 0, searches: r.usage?.server_tool_use?.web_search_requests ?? 0,
  };
  console.log("[quick]", JSON.stringify(line));
  await keepLog(line);
  // A red release's figure is announced by nudge-cron; tell it now rather than wait for its next minute.
  if (red) {
    const tell = fetch(`${SUPABASE_URL}/functions/v1/nudge-cron`, {
      method: "POST", headers: { "content-type": "application/json", "x-cron-key": cronKey }, body: JSON.stringify({ mode: "results" }),
    }).then((x) => x.text()).catch(() => "");
    try { EdgeRuntime.waitUntil(tell); } catch (_) { /* */ }
  }
  return { asked: evs.length, wrote };
}

// The last 40 quick reads, for looking at how long a figure really takes to appear (worker_cache 'actuals:quick').
async function keepLog(line: Any) {
  try {
    const { data } = await admin.from("worker_cache").select("value").eq("key", "actuals:quick").maybeSingle();
    const prev = (data && data.value && Array.isArray(data.value.runs)) ? data.value.runs : [];
    await admin.from("worker_cache").upsert({ key: "actuals:quick", value: { runs: prev.concat([line]).slice(-40) }, updated_at: new Date().toISOString() }, { onConflict: "key" });
  } catch (_) { /* a log line never stops a read */ }
}

const hhmmUtc = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? String(iso) : d.toISOString().slice(0, 16).replace("T", " "); };

async function ask(evs: Ev[], nowMs: number): Promise<{ found: { ev: Ev; actual: string }[]; raw: Any; usage: Any; ms: number; error?: string }> {
  const t0 = Date.now();
  if (!ANTHROPIC_API_KEY) return { found: [], raw: null, usage: null, ms: 0, error: "ANTHROPIC_API_KEY not set" };
  if (!evs.length) return { found: [], raw: null, usage: null, ms: 0 };
  const list = evs.map((e) => `${e.currency} | ${e.title} | ${hhmmUtc(e.at)} | ${e.forecast || "-"} | ${e.previous || "-"}`).join("\n");
  const prompt =
    `You are reading economic data that has just been released. The time now is ${hhmmUtc(new Date(nowMs).toISOString())} UTC.\n\n` +
    `Events (CURRENCY | EVENT | released at, UTC | forecast | previous):\n${list}\n\n` +
    `Use web search to find the ACTUAL figure published in THIS release for each event. Good sources: the office that ` +
    `publishes it (BLS, BEA, Census, ISM, ONS, Eurostat, Destatis, Statistics Canada, ABS, Stats NZ, a central bank), ` +
    `Reuters, CNBC, MarketWatch, FXStreet, Trading Economics, Investing.com, Forex Factory.\n\n` +
    `Rules:\n` +
    `- Give a figure ONLY if a source reports it as the result of this release, published at or after the release time above. ` +
    `If it is not out yet or you are not sure, leave that event out - a number often takes a few minutes to appear.\n` +
    `- The forecast and the previous are shown so you can tell them apart from the actual. NEVER return the forecast or the ` +
    `previous as the actual unless a source states that the actual came in at that same value.\n` +
    `- Do not use an older release (last month's or last quarter's figure), and do not use a preview written before the release. ` +
    `If the newest figure you can find was published before the release date above, it belongs to the PREVIOUS release: leave the event out.\n` +
    `- For each figure give "published": the date (YYYY-MM-DD) on which the source published it.\n` +
    `- m/m, q/q and y/y matter, and so does "Core": give the figure for exactly the measure named.\n` +
    `- Each event has its own figure - never reuse one event's number for another.\n` +
    `- Write the figure in the same style as the forecast and previous (for example 0.3%, 195K, 52.4, -1.2B).\n\n` +
    `Return ONLY a JSON array, no prose and no markdown: ` +
    `[{"currency":"USD","event":"<the EVENT text exactly as given>","actual":"<figure>","published":"YYYY-MM-DD"}]. Return [] if nothing is out yet.`;
  let data: Any;
  try {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), CLAUDE_TIMEOUT_MS);
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal: ctl.signal,
      headers: { "content-type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODEL, max_tokens: 1500,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: MAX_SEARCHES }],
        messages: [{ role: "user", content: prompt }],
      }),
    });
    clearTimeout(timer);
    const txt = await resp.text();
    try { data = JSON.parse(txt); } catch { return { found: [], raw: txt.slice(0, 200), usage: null, ms: Date.now() - t0, error: "non-json " + resp.status }; }
    if (!resp.ok) return { found: [], raw: null, usage: null, ms: Date.now() - t0, error: data?.error?.message || ("HTTP " + resp.status) };
  } catch (e) {
    return { found: [], raw: null, usage: null, ms: Date.now() - t0, error: String((e as Error)?.message || e) };
  }
  try { await recordUsage(data?.usage); } catch (_) { /* */ }
  const text = (data?.content ?? []).filter((b: Any) => b?.type === "text").map((b: Any) => b.text || "").join("\n").trim();
  const arr = extractJsonArray(text);
  if (!arr) return { found: [], raw: text.slice(0, 200), usage: data?.usage || null, ms: Date.now() - t0, error: "no-json-array" };
  return { found: match(evs, arr), raw: arr, usage: data?.usage || null, ms: Date.now() - t0 };
}

function extractJsonArray(text: string): Any[] | null {
  let t = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const i = t.indexOf("["), j = t.lastIndexOf("]");
  if (i < 0 || j < 0 || j <= i) return null;
  t = t.slice(i, j + 1);
  try { const v = JSON.parse(t); return Array.isArray(v) ? v : null; } catch { return null; }
}

// A figure, not a sentence: it has a digit, it is short, and it carries no words beyond a unit.
function cleanFigure(v: Any): string | null {
  const s = String(v ?? "").trim().replace(/^["']|["']$/g, "").replace(/\s*\(?\b[mqy]\/[mqy]\)?$/i, "").trim();
  if (!s || s.length > 14 || !/\d/.test(s)) return null;
  if (/[a-z]{2,}/i.test(s.replace(/\b(bn|mn|tn|bln|mln)\b/gi, ""))) return null;   // "not released", "see note"
  return s;
}

// Matching as the worker does it: currency + the title's own words, a near match accepted at 0.8.
const STOP = new Set(["the", "of", "a", "and", "rate", "index", "data", "report", "s", "for", "in"]);
function normTokens(s: string): string[] {
  return s.toLowerCase().replace(/&amp;/g, "&")
    .replace(/\bm\/m\b/g, "mom").replace(/\by\/y\b/g, "yoy").replace(/\bq\/q\b/g, "qoq")
    .replace(/non[- ]?farm/g, "nonfarm")
    .replace(/[^a-z0-9]+/g, " ").split(" ").filter((w) => w && !STOP.has(w));
}
const normStr = (s: string) => normTokens(s).slice().sort().join(" ");
function jaccard(a: string, b: string): number {
  const A = new Set(normTokens(a)), B = new Set(normTokens(b));
  if (!A.size || !B.size) return 0;
  let inter = 0; for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}
function match(evs: Ev[], arr: Any[]): { ev: Ev; actual: string }[] {
  const out: { ev: Ev; actual: string }[] = [], used = new Set<Ev>();
  for (const x of arr) {
    const ccy = String(x?.currency || x?.country || "").toUpperCase(), name = String(x?.event || x?.title || ""), fig = cleanFigure(x?.actual);
    if (!ccy || !name || !fig) continue;
    let hit = evs.find((e) => !used.has(e) && e.currency.toUpperCase() === ccy && normStr(e.title) === normStr(name)) || null;
    if (!hit) {
      let bs = 0;
      for (const e of evs) { if (used.has(e) || e.currency.toUpperCase() !== ccy) continue; const s = jaccard(e.title, name); if (s > bs) { bs = s; hit = e; } }
      if (bs < 0.8) hit = null;
    }
    // The figure must have been published on the day of the release (a day either side, for time zones). Asked a
    // few minutes after a release, a search can surface the previous one - which the source dates weeks earlier.
    if (hit && !sameRelease(hit.at, x?.published)) { used.add(hit); continue; }
    if (hit) { used.add(hit); out.push({ ev: hit, actual: fig }); }
  }
  return out;
}
function sameRelease(at: string, published: Any): boolean {
  const rel = Date.parse(at), m = String(published || "").match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!Number.isFinite(rel) || !m) return false;
  const pub = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return Math.abs(pub - rel) <= 36 * 3600 * 1000;
}

async function recordUsage(usage: Any) {
  if (!usage) return;
  await admin.from("ai_usage").insert({
    user_id: ECA_SYSTEM_UID, model: MODEL, mode: "ecafetch",
    input_tokens: usage.input_tokens ?? 0, output_tokens: usage.output_tokens ?? 0,
    cache_creation_tokens: usage.cache_creation_input_tokens ?? 0, cache_read_tokens: usage.cache_read_input_tokens ?? 0,
    web_search_requests: usage.server_tool_use?.web_search_requests ?? 0,
  });
}

function json(obj: unknown, status: number) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
