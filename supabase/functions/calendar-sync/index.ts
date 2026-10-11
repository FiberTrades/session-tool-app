// ============================================================
//  Session Terminal : calendar-sync  (Supabase Edge Function)
//
//  Keeps calendar_events - the table the red-news warnings, the fast actuals and the result nudges all
//  read - in step with the public calendar feed, every hour (12 Oct 2026).
//
//  Until now the only writer was the Deno worker, and only on its weekday runs from 09:00 London. So a new
//  week's events were not in the table until Monday 09:00: a Monday 07:00 UK release, or anything on Sunday
//  night, got no phone warning, no fast figure and no result nudge. Nestor: "im not sure what this means but
//  cant you fix this?"
//
//  It also covers a week the worker cannot store at all. The table's key is (event_date, currency, title),
//  and the worker sends the whole week in one batch: when the feed carries the same title twice on one
//  Eastern date (two "BOE Gov Bailey Speaks" in the week of 12 Oct 2026), that batch is refused as a whole.
//  Here such a pair is told apart by giving the later one another date key, so both are kept.
//
//  Rows are written WITHOUT the actual column, so a released figure is never touched (the table's trigger
//  refuses to wipe one anyway). Parsing mirrors worker/forex-worker-v17.ts exactly, so both writers produce
//  the same rows.
//
//  pg_cron (calendar-sync-timer) calls this at seven minutes past every hour. Guarded by the x-cron-key
//  header (NUDGE_CRON_KEY). Deploy with "Verify JWT" OFF.  { mode:"dry" } reads and parses, writes nothing.
// ============================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

// deno-lint-ignore no-explicit-any
type Any = any;

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const FF_XML_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.xml";
// The feed itself, then the app's own worker, which serves the same file to every open app.
const SOURCES = [FF_XML_URL, "https://smooth-quail-95.fibertrades.deno.net/"];
const UPSTREAM_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/xml,*/*;q=0.9",
  "Accept-Language": "en-US,en;q=0.5",
};

Deno.serve(async (req) => {
  const key = Deno.env.get("NUDGE_CRON_KEY");
  if (!key || req.headers.get("x-cron-key") !== key) return json({ error: "forbidden" }, 403);
  let body: Any = {};
  try { body = await req.json(); } catch (_) { body = {}; }
  try {
    return json(await sync(!!(body && body.mode === "dry")), 200);
  } catch (e) {
    console.error("calendar-sync", String(e && (e as Error).stack || e));
    return json({ error: "failed" }, 500);
  }
});

async function sync(dry: boolean) {
  const tried: string[] = [];
  let xml: string | null = null, from = "";
  for (const url of SOURCES) {
    try {
      const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 20_000);
      const resp = await fetch(url, { headers: UPSTREAM_HEADERS, signal: ctl.signal });
      clearTimeout(timer);
      if (!resp.ok) { tried.push(`${new URL(url).host}: HTTP ${resp.status}`); continue; }
      const text = await resp.text();
      if (text && text.length > 50 && text.indexOf("<event") !== -1) { xml = text; from = new URL(url).host; break; }
      tried.push(`${new URL(url).host}: invalid body (len=${text.length})`);
    } catch (e) { tried.push(`${new URL(url).host}: ${String((e as Error)?.message || e)}`); }
  }
  if (!xml) { console.error("calendar-sync no feed", tried.join(" | ")); return { ok: false, tried }; }

  const all = parseFFEvents(xml);
  // A whole week is some eighty events. A handful means a broken or half-served file: write nothing.
  if (all.length < 10) return { ok: false, from, parsed: all.length, note: "too few events" };
  const keep = all.filter((e) => /high|medium|holiday/i.test(e.impact)).sort((a, b) => a.whenMs - b.whenMs || a.title.localeCompare(b.title));

  // One row per (event_date, currency, title). The same title twice on one Eastern date: the earlier keeps the
  // Eastern date (what the worker writes), the later takes the next free of its UTC date, +1 day, +2 days.
  const seen = new Set<string>(), rows: Any[] = [], moved: string[] = [], dropped: string[] = [];
  const stamp = new Date().toISOString();
  for (const e of keep) {
    const utcDate = new Date(e.whenMs).toISOString().slice(0, 10);
    const cands = [e.dateKey, utcDate, plusDays(e.dateKey, 1), plusDays(e.dateKey, 2)];
    const date = cands.find((d) => !seen.has(`${d}|${e.currency}|${e.title}`));
    if (!date) { dropped.push(`${e.currency} ${e.title} ${e.dateKey}`); continue; }
    if (date !== e.dateKey) moved.push(`${e.currency} ${e.title} ${e.dateKey} -> ${date}`);
    seen.add(`${date}|${e.currency}|${e.title}`);
    rows.push({
      event_date: date, at: new Date(e.whenMs).toISOString(), timed: e.timed,
      currency: e.currency, title: e.title, impact: e.impact,
      forecast: e.forecast || null, previous: e.previous || null,
      source: "ff", updated_at: stamp,
    });
  }
  const span = rows.length ? [rows[0].at, rows[rows.length - 1].at] : [];
  if (dry) return { ok: true, dry: true, from, parsed: all.length, rows: rows.length, span, moved, dropped, sample: rows.slice(0, 3) };

  // A row whose release moved keeps its key (same date, currency, title) and simply takes the new time.
  const { error } = await admin.from("calendar_events").upsert(rows, { onConflict: "event_date,currency,title" });
  if (error) { console.error("calendar-sync upsert", error.message); return { ok: false, from, rows: rows.length, error: error.message }; }
  console.log("[sync]", JSON.stringify({ from, parsed: all.length, rows: rows.length, moved: moved.length, dropped: dropped.length }));
  return { ok: true, from, parsed: all.length, rows: rows.length, span, moved, dropped };
}

function plusDays(dateKey: string, n: number): string {
  const d = new Date(dateKey + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// ---------- the feed, parsed exactly as the worker parses it ----------
const ET_FMT = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "America/New_York" });
interface FFEvent { currency: string; title: string; dateKey: string; whenMs: number; impact: string; forecast: string; previous: string; timed: boolean }

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
    const timed = !!timeStr && /\d/.test(timeStr) && !/all day|tentative/i.test(timeStr);
    out.push({ currency, title, dateKey: ET_FMT.format(new Date(whenMs)), whenMs, impact, forecast: xmlTag(b, "forecast"), previous: xmlTag(b, "previous"), timed });
  }
  return out;
}

function json(obj: unknown, status: number) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
