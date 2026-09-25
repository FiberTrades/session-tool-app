// ============================================================
//  Session Tool : live-trade  (Supabase Edge Function)
//
//  The MT5 EA POSTs a LIVE status event here (open / close). This
//  function mirrors ingest-trade's auth exactly:
//    1. looks up the account by its sync_token (per-user secret)
//    2. checks that account is on a PAID plan (any tier)
//    3. writes to live_trades (service role), keyed by the real UUID
//
//  Two event types:
//    { event:"open",  token, ticket, symbol, direction, lots?, risk? }
//        -> upsert a row (direction = 'long' | 'short')
//           lots / risk (money lost at the stop) from EA 8.6, stored only
//           when sent - so an older EA, or a re-announce with the stop at
//           break-even, never nulls a value already stored.
//    { event:"close", token, ticket, pnl }
//        -> set pnl + closed_at on that ticket's row
//
//  BE / win / lose is decided in the APP (from your risk rules),
//  not here — this only stores the raw money P&L.
//
//  Deploy with "Verify JWT" turned OFF (the sync_token in the body
//  is the security check, same as ingest-trade).
// ============================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors() });
  }
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad json" }, 400);
  }

  const { token, event, ticket } = body ?? {};
  const ticketStr = (ticket === undefined || ticket === null) ? "" : String(ticket).trim();
  if (
    !token ||
    (event !== "open" && event !== "close") ||
    !ticketStr || ticketStr === "0" || ticketStr === "null" || ticketStr === "undefined"
  ) {
    return json({ error: "empty or malformed live event" }, 400);
  }

  // 1. Resolve the sync_token to an account (same as ingest-trade).
  const { data: prof, error: pErr } = await admin
    .from("profiles")
    .select("id, is_paid")
    .eq("sync_token", String(token))
    .maybeSingle();
  if (pErr)  return json({ error: "profile lookup failed" }, 500);
  if (!prof) return json({ error: "unknown token" }, 403);

  // 2. Paid gate (enforced server-side, same as auto-sync).
  if (prof.is_paid !== true) {
    return json({ error: "live status requires a paid plan" }, 402);
  }

  const userId = String(prof.id); // real account UUID

  if (event === "open") {
    const dir = (body.direction === "short" || body.direction === "sell") ? "short" : "long";
    const row = {
      account:   userId,
      ticket:    Number(ticket),
      symbol:    (typeof body.symbol === "string") ? body.symbol : null,
      direction: dir,
      pnl:       null,
      closed_at: null,
    } as Record<string, unknown>;
    const lots = numOrNull(body.lots), risk = numOrNull(body.risk);
    if (lots !== null && lots > 0) row.lots = lots;
    if (risk !== null && risk > 0) row.risk = risk;
    // Upsert so a re-sent "open" (EA restart) doesn't create duplicates.
    const { error } = await admin
      .from("live_trades")
      .upsert(row, { onConflict: "account,ticket", ignoreDuplicates: false });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true }, 200);
  }

  // event === "close": stamp the money P&L + close time on that ticket's row.
  const { error } = await admin
    .from("live_trades")
    .update({ pnl: numOrNull(body.pnl), closed_at: new Date().toISOString() })
    .eq("account", userId)
    .eq("ticket", Number(ticket));
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true }, 200);
});

function numOrNull(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(obj: unknown, status: number) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", ...cors() },
  });
}