// ─────────────────────────────────────────────────────────────────────────────
// ingest-candles — Trade Replay candle intake (Stage 1: pre-fetch, no load-more).
//
// The MinimalistManager EA POSTs batches of OHLC bars pulled from MT5 (one POST
// per timeframe, chunked). This upserts them into public.candles (keyed by
// symbol, tf, t) with the service-role key. Candles are shared market data, so
// there is no per-user ownership — the sync token only gates who may write.
//
// Deploy WITHOUT JWT verification (the EA sends the publishable key + a token in
// the body, exactly like ingest-trade):
//     supabase functions deploy ingest-candles --no-verify-jwt
// Requires public.candles (see supabase/candles_setup.sql).
//
// Body: { token, symbol, tf, bars:[[t,o,h,l,c,v], …] }   (t = bar open, unix secs UTC; v = MT5 tick volume, EA 9.00+)
// ─────────────────────────────────────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const MAX_BARS = 5000;   // reject oversized batches (the EA chunks to ~3000)

// Storage guard (15 Oct 2026). EA 8.95 fills a year of M1 and M5 per symbol - about 50 MB of M1 each - and the project is
// on the free plan, whose database holds 500 MB (over it, everything goes read-only, members' journals included). Past
// DEEP_CAP the DEEP part of an M1 / M5 batch (older than DEEP_AGE) is dropped; recent candles always go in, so today's
// days never go empty. The EA is told "ok" either way, so it moves on instead of retrying the same batch.
const DEEP_CAP = 400 * 1024 * 1024;
const DEEP_AGE = 100 * 86400;
let sizeAt = 0, sizeBytes = 0;
async function dbBytes(): Promise<number> {
  if (Date.now() - sizeAt < 10 * 60000) return sizeBytes;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/st_db_bytes`, { method: "POST", headers: { "content-type": "application/json", apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` }, body: "{}" });
    if (r.ok) { sizeBytes = Number(await r.json()) || 0; sizeAt = Date.now(); }
  } catch { /* unknown: let it through */ }
  return sizeBytes;
}

// Why a batch can't be from a sound clock, or "" when it can. Brokers sit whole or half hours from UTC, so a bar of 5
// minutes or more opens on its own boundary (an hour or more: on the half hour at least). The newest 300 bars are also
// compared with the stored ones nearby: the same candle stored k minutes away (k != 0), for most of them, is a shifted copy.
async function clockOff(symbol: string, tf: number, rows: Array<Record<string, number | string>>): Promise<string> {
  const step = (tf >= 60 ? 30 : tf) * 60;
  if (tf >= 5 && rows.some((x) => Number(x.t) % step !== 0)) return "bar off its timeframe boundary";
  if (rows.some((x) => Number(x.t) > Date.now() / 1000 + tf * 60)) return "bar from the future";
  const last = rows.slice().sort((a, b) => Number(a.t) - Number(b.t)).slice(-300).filter((x) => x.h !== x.l);
  if (last.length < 3) return "";
  const lo = Number(last[0].t) - 3600, hi = Number(last[last.length - 1].t) + 3600;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/candles?select=t,o,h,l,c&symbol=eq.${encodeURIComponent(symbol)}&tf=eq.${tf}&t=gte.${lo}&t=lte.${hi}&limit=1000`,
      { headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` } });
    if (!r.ok) return "";
    const have: Array<{ t: number; o: number; h: number; l: number; c: number }> = await r.json();
    const at: Record<string, number[]> = {};
    for (const s of have) if (s.h !== s.l) (at[`${s.o}|${s.h}|${s.l}|${s.c}`] = at[`${s.o}|${s.h}|${s.l}|${s.c}`] || []).push(Number(s.t));
    // a late copy repeats them all at ONE distance; a quiet market repeats a candle by chance, at any distance
    let same = 0, most = 0;
    const lag: Record<number, number> = {};
    for (const x of last) {
      const ts = at[`${x.o}|${x.h}|${x.l}|${x.c}`];
      if (!ts) continue;
      if (ts.includes(Number(x.t))) { same++; continue; }
      for (const t of ts) {
        const d = Number(x.t) - t;
        if (d && Math.abs(d) <= 3600) { lag[d] = (lag[d] || 0) + 1; most = Math.max(most, lag[d]); }
      }
    }
    if (most >= 3 && most > same) return "candles already stored at other times (clock off)";
  } catch { /* can't check: let it through */ }
  return "";
}

// 4h and 1D bars off the New York-close grid (27 Oct 2026). MT5 opens them from its server's midnight - 17:00 New York on FTMO and
// most brokers - and the app builds its 4h, 12h and 1D on that grid. A broker whose server keeps another clock sends them an hour or
// more off it, and they were stored beside the others under the same symbol: EUR/USD's 4h held two series an hour apart, and every
// 4h bar on the chart mixed the two (Nestor: "the 4h bars look strange?"). Such bars are left out where the symbol has bars on the
// grid (in the batch, or stored within a week of it); a symbol only such a broker sends keeps its own.
const NYF = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
function onNyGrid(t: number, tf: number): boolean {
  const p: Record<string, string> = {};
  for (const x of NYF.formatToParts(new Date(t * 1000))) p[x.type] = x.value;
  const ny = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) / 1000;   // New York's wall clock at t
  const s = tf * 60;
  return (((ny - 17 * 3600) % s) + s) % s === 0;
}
async function offGrid(symbol: string, tf: number, rows: Array<Record<string, number | string>>): Promise<Array<Record<string, number | string>>> {
  if (tf !== 240 && tf !== 1440) return rows;
  const on = rows.filter((x) => onNyGrid(Number(x.t), tf));
  if (on.length) return on;   // all on the grid, or the batch has the grid's own: those
  const ts = rows.map((x) => Number(x.t)), lo = Math.min(...ts) - 7 * 86400, hi = Math.max(...ts) + 7 * 86400;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/candles?select=t&symbol=eq.${encodeURIComponent(symbol)}&tf=eq.${tf}&t=gte.${lo}&t=lte.${hi}&limit=500`,
      { headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` } });
    if (!r.ok) return rows;
    const have: Array<{ t: number }> = await r.json();
    return have.some((x) => onNyGrid(Number(x.t), tf)) ? [] : rows;
  } catch { return rows; }
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json" } });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST")    return json({ error: "POST only" }, 405);
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: "server not configured" }, 500);
  // Paused (29 Oct 2026: the database ran out of its disk IO budget, and the cloud MT5s were posting ~2.5M bars an hour into it):
  // while the INGEST_PAUSED secret is "1" every batch is answered at once, before anything touches the database. Nothing is lost:
  // on anything but 200 the EA keeps the batch and sends it again on a later bar (deep history and the hourly top-up keep their
  // markers, a closed trade's export keeps its queue row). Unset the secret to resume.
  if (Deno.env.get("INGEST_PAUSED") === "1") return json({ error: "paused", retry: true }, 503);

  // deno-lint-ignore no-explicit-any
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }

  const token  = body?.token;
  const symbol = body?.symbol;
  const tf     = Number(body?.tf);
  const bars   = body?.bars;
  if (!token || typeof token !== "string") return json({ error: "missing token" }, 401);
  if (!symbol || typeof symbol !== "string" || !tf || !Array.isArray(bars))
    return json({ error: "missing symbol / tf / bars" }, 400);
  if (bars.length > MAX_BARS) return json({ error: `batch too large (max ${MAX_BARS})` }, 413);

  // NOTE: candles are non-sensitive market data and the token gates writes. If you
  // want parity with ingest-trade, validate `token` against your accounts table here
  // and 403 on an unknown token.

  let rows: Array<Record<string, number | string>> = [];
  for (const b of bars) {
    if (!Array.isArray(b) || b.length < 5) continue;
    // Every timeframe opens on a whole minute. Older EA builds sent some bars a second early,
    // which the (symbol, tf, t) key stored as a SECOND copy of the same candle - 35k of them
    // were deleted on 2026-09-25. Snapping to the minute makes that impossible.
    const t = Math.round(Number(b[0]) / 60) * 60;
    const o = Number(b[1]), h = Number(b[2]), l = Number(b[3]), c = Number(b[4]);
    if (!Number.isFinite(t) || !Number.isFinite(o) || !Number.isFinite(h) || !Number.isFinite(l) || !Number.isFinite(c)) continue;
    rows.push({ symbol, tf, t, o, h, l, c, v: b.length > 5 ? Math.round(Number(b[5])) : NaN });
  }
  // One row per minute: two bars of a batch landing on the same minute (a repeated bar, or two that snap together) made
  // the whole upsert fail - "ON CONFLICT DO UPDATE command cannot affect row a second time", every batch of the demo's
  // BTCUSD chart on 24 Oct 2026. The later bar wins.
  const byT = new Map<number, Record<string, number | string>>();
  for (const x of rows) byT.set(Number(x.t), x);
  if (byT.size !== rows.length) rows = [...byT.values()];
  // The tick volume (the Minimalist's volume profile): kept when every bar of the batch has it. A batch from an older EA
  // has none and leaves the stored volume alone (every row of one POST must name the same columns).
  const allV = rows.length > 0 && rows.every((x) => Number.isFinite(Number(x.v)) && Number(x.v) >= 0);
  for (const x of rows) if (!allV) delete x.v;
  if (!rows.length) return json({ ok: true, upserted: 0 });
  // A batch from an EA whose clock is off (23 Oct 2026). Before its first live tick an EA worked out the broker's time
  // from the last price it had - frozen since the close for a terminal started after it - so every bar went out minutes
  // late: his cloud 70K's 12, the demo's 2, and months of 1/2/12/17-minute copies beside the real candles. Such a batch is
  // refused whole (the EA is told ok, so it moves on): a 5-minute-or-longer bar off its boundary, a bar from the future, or
  // a batch that repeats the candles already stored a few minutes away.
  const bad = await clockOff(symbol, tf, rows);
  if (bad) return json({ ok: true, upserted: 0, rejected: rows.length, reason: bad });
  const nOff = rows.length;
  rows = await offGrid(symbol, tf, rows);
  if (!rows.length) return json({ ok: true, upserted: 0, rejected: nOff, reason: "4h / 1D bars off the New York-close grid" });
  if (tf <= 5) {
    const edge = Date.now() / 1000 - DEEP_AGE, deep = rows.filter((x) => Number(x.t) < edge).length;
    if (deep && (await dbBytes()) > DEEP_CAP) {
      // Past the cap the old candles are not stored again - but their volume still goes onto the ones already there (an
      // update, no new rows): that is what a volume profile asked for (Nestor, 20 Oct 2026: "yes do 1, 2 and 3").
      let volSet = 0;
      if (allV) {
        try {
          const vr = await fetch(`${SUPABASE_URL}/rest/v1/rpc/st_candles_set_v`, {
            method: "POST",
            headers: { "content-type": "application/json", apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` },
            body: JSON.stringify({ p_symbol: symbol, p_tf: tf, p_rows: rows.filter((x) => Number(x.t) < edge).map((x) => [x.t, x.v]) }),
          });
          if (vr.ok) volSet = Number(await vr.json()) || 0;
        } catch { /* the volume waits for the next ask */ }
      }
      rows = rows.filter((x) => Number(x.t) >= edge);
      if (!rows.length) return json({ ok: true, upserted: 0, skipped: deep, vol_set: volSet, reason: "storage cap" });
    }
  }

  const r = await fetch(`${SUPABASE_URL}/rest/v1/candles?on_conflict=symbol,tf,t`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: SERVICE_KEY,
      authorization: `Bearer ${SERVICE_KEY}`,
      prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!r.ok) {
    const detail = (await r.text()).slice(0, 300);
    return json({ error: "db upsert failed", detail }, 500);
  }
  return json({ ok: true, upserted: rows.length });
});
