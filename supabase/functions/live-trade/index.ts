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
//    { event:"settings", token, login, symbol, ea_version, settings:{...} }   (EA 8.6)
//        -> the EA's own settings right now (risk, stop limits, take profit,
//           break-even, daily trade cap): upsert ea_settings, and when a real
//           setting changed, one ea_settings_log row naming what changed.
//           Sent at start, on every change, and every 5 min as a backstop -
//           the repeat logs nothing, because nothing changed.
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
  const isSettings = event === "settings";          // no ticket: it describes the EA, not a trade
  if (
    !token ||
    (event !== "open" && event !== "close" && !isSettings) ||
    (!isSettings && (!ticketStr || ticketStr === "0" || ticketStr === "null" || ticketStr === "undefined"))
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

  if (isSettings) {
    const login = String(body.login ?? "").trim().slice(0, 32);
    const symbol = (typeof body.symbol === "string") ? body.symbol.trim().slice(0, 32) : "";
    const settings = (body.settings && typeof body.settings === "object" && !Array.isArray(body.settings)) ? body.settings : null;
    if (!login || !settings) return json({ error: "empty settings" }, 400);
    const { data: prev, error: rErr } = await admin
      .from("ea_settings")
      .select("settings")
      .eq("user_id", userId).eq("login", login).eq("symbol", symbol)
      .maybeSingle();
    if (rErr) return json({ error: rErr.message }, 500);
    const { error: uErr } = await admin
      .from("ea_settings")
      .upsert({
        user_id: userId, login, symbol, settings,
        ea_version: (typeof body.ea_version === "string") ? body.ea_version.slice(0, 16) : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,login,symbol" });
    if (uErr) return json({ error: uErr.message }, 500);
    // The first snapshot is a baseline, not a change - there is nothing to compare it with.
    const changed = prev ? changedKeys(prev.settings, settings) : [];
    if (changed.length) {
      const { error: lErr } = await admin
        .from("ea_settings_log")
        .insert({ user_id: userId, login, symbol, changed, before: prev!.settings, after: settings });
      if (lErr) return json({ error: lErr.message }, 500);
    }
    return json({ ok: true, changed }, 200);
  }

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

// Values that move on their own - risk in money follows the balance on a % setting, the day's
// trade count and the currency are facts about the moment - are sent for display, never counted
// as a CHANGE to the settings.
const VOLATILE = new Set(["risk_money", "trades_today", "currency"]);
function changedKeys(a: any, b: any): string[] {
  const out: string[] = [];
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  for (const k of keys) {
    if (VOLATILE.has(k)) continue;
    if (JSON.stringify(a?.[k] ?? null) !== JSON.stringify(b?.[k] ?? null)) out.push(k);
  }
  return out.sort();
}

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