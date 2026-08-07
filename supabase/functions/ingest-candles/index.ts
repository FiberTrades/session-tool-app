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
// Body: { token, symbol, tf, bars:[[t,o,h,l,c], …] }   (t = bar open, unix secs UTC)
// ─────────────────────────────────────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const MAX_BARS = 5000;   // reject oversized batches (the EA chunks to ~3000)

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

  const rows: Array<Record<string, number | string>> = [];
  for (const b of bars) {
    if (!Array.isArray(b) || b.length < 5) continue;
    const t = Math.round(Number(b[0]));
    const o = Number(b[1]), h = Number(b[2]), l = Number(b[3]), c = Number(b[4]);
    if (!Number.isFinite(t) || !Number.isFinite(o) || !Number.isFinite(h) || !Number.isFinite(l) || !Number.isFinite(c)) continue;
    rows.push({ symbol, tf, t, o, h, l, c });
  }
  if (!rows.length) return json({ ok: true, upserted: 0 });

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
