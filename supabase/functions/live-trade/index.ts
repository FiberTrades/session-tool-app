// ============================================================
//  Session Tool : live-trade  (Supabase Edge Function)
//
//  The MT5 EA POSTs a LIVE status event here (open / close). This
//  function mirrors ingest-trade's auth exactly:
//    1. looks up the account by its sync_token (per-user secret)
//    2. checks that account is on a PAID plan (any tier)
//    3. writes to live_trades (service role), keyed by the real UUID
//
//  Event types:
//    { event:"open",  token, ticket, symbol, direction, lots?, risk?, login? }
//        -> upsert a row (direction = 'long' | 'short')
//           lots / risk (money lost at the stop) from EA 8.6, stored only
//           when sent - so an older EA, or a re-announce with the stop at
//           break-even, never nulls a value already stored.
//    { event:"close", token, ticket, pnl, reason?, login? }
//        -> set pnl + closed_at (and, EA 8.86, why it closed: sl / tp / so / manual / ea) on that ticket's row
//    { event:"be", token, ticket, login, symbol, direction }   (EA 8.86)
//        -> the stop reached the entry: be_at on that ticket's row (the first time only)
//    { event:"settings", token, login, symbol, ea_version, settings:{...} }   (EA 8.6; 8.83 adds copy_*)
//        -> the EA's own settings right now (risk, stop limits, take profit,
//           break-even, daily trade cap): upsert ea_settings, and when a real
//           setting changed, one ea_settings_log row naming what changed.
//           Sent at start, on every change, and every 5 min as a backstop -
//           the repeat logs nothing, because nothing changed.
//
//  BE / win / lose is decided in the APP (from your risk rules),
//  not here — this only stores the raw money P&L.
//
//  Phone nudges + trade alerts (2 Oct 2026, see ../_shared/nudges.ts): every open / close / be also
//  updates nudge_trades (the server's own memory of the member's trades - live_trades is cleared by
//  the app) and, after the response, judges the event a few seconds later and pushes to the phone
//  whatever no open window showed.
//
//  Deploy with "Verify JWT" turned OFF (the sync_token in the body
//  is the security check, same as ingest-trade).
// ============================================================

import { createClient } from "jsr:@supabase/supabase-js@2";
import { afterBE, afterClose, afterCloseTrade, afterEaChange, afterOpen, afterRisk, afterWiden, checkNoStop, utcDay } from "../_shared/nudges.ts";

// deno-lint-ignore no-explicit-any
declare const EdgeRuntime: { waitUntil(p: Promise<any>): void } | undefined;
// Work that runs after the EA has its answer (the EA never waits on the nudges).
function later(what: string, p: Promise<unknown>) {
  const q = p.then((r) => { if (r && (r as unknown[]).length) console.log("nudge", what, JSON.stringify(r)); })
    .catch((e) => console.error("nudge", what, String(e && (e as Error).stack || e)));
  try { if (typeof EdgeRuntime !== "undefined" && EdgeRuntime) EdgeRuntime.waitUntil(q); } catch (_) { /* local runs */ }
}
const FRESH_MS = 5 * 60 * 1000;   // an open older than this is history, not news (as in the app)

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
    (event !== "open" && event !== "close" && event !== "be" && !isSettings) ||
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
      const { data: lRow, error: lErr } = await admin
        .from("ea_settings_log")
        .insert({ user_id: userId, login, symbol, changed, before: prev!.settings, after: settings })
        .select("id, changed_at")
        .maybeSingle();
      if (lErr) return json({ error: lErr.message }, 500);
      // Loosening the EA mid-session or after a loss: a phone nudge too (as the app's eaChanged).
      if (lRow) later("ea", afterEaChange(admin, userId, Number(lRow.id), prev!.settings, settings, Date.parse(lRow.changed_at) || Date.now()));
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
      // Every re-announce (every 20s while the EA runs) refreshes this, so an old seen_at means the
      // EA / PC / MT5 is off and the app says so instead of showing the trade as active.
      seen_at:   new Date().toISOString(),
    } as Record<string, unknown>;
    const lots = numOrNull(body.lots), risk = numOrNull(body.risk), login = loginOf(body.login);
    if (lots !== null && lots > 0) row.lots = lots;
    if (risk !== null && risk > 0) row.risk = risk;
    if (login) row.login = login;
    // Upsert so a re-sent "open" (EA restart) doesn't create duplicates.
    const { error } = await admin
      .from("live_trades")
      .upsert(row, { onConflict: "account,ticket", ignoreDuplicates: false });
    if (error) return json({ error: error.message }, 500);
    try { await rememberOpen(userId, Number(ticket), row.symbol as string | null, dir, login, (risk !== null && risk > 0) ? risk : null); }
    catch (e) { console.error("nudge open", String(e)); }
    return json({ ok: true }, 200);
  }

  if (event === "be") {
    const t = Number(ticket), at = new Date().toISOString(), login = loginOf(body.login);
    await admin.from("live_trades").update({ be_at: at }).eq("account", userId).eq("ticket", t).is("be_at", null);
    try {
      const { data: nt } = await admin.from("nudge_trades").select("be_at, closed_at").eq("user_id", userId).eq("ticket", t).maybeSingle();
      if (!nt) {
        const dir = (body.direction === "short" || body.direction === "sell") ? "short" : "long";
        const openedAt = await liveOpenedAt(userId, t);
        const { error: iErr } = await admin.from("nudge_trades").insert({ user_id: userId, ticket: t, login, symbol: strOrNull(body.symbol), direction: dir, opened_at: openedAt, be_at: at });
        if (!iErr) later("be", afterBE(admin, userId, t));
      } else if (!nt.be_at && !nt.closed_at) {
        await admin.from("nudge_trades").update({ be_at: at }).eq("user_id", userId).eq("ticket", t).is("be_at", null);
        later("be", afterBE(admin, userId, t));
      }
    } catch (e) { console.error("nudge be", String(e)); }
    return json({ ok: true }, 200);
  }

  // event === "close": stamp the money P&L + close time on that ticket's row.
  const closedAt = new Date().toISOString(), reason = reasonOf(body.reason), cLogin = loginOf(body.login);
  const upd: Record<string, unknown> = { pnl: numOrNull(body.pnl), closed_at: closedAt };
  if (reason) upd.close_reason = reason;
  if (cLogin) upd.login = cLogin;
  const { error } = await admin
    .from("live_trades")
    .update(upd)
    .eq("account", userId)
    .eq("ticket", Number(ticket));
  if (error) return json({ error: error.message }, 500);
  try { await rememberClose(userId, Number(ticket), numOrNull(body.pnl), closedAt, reason, cLogin); }
  catch (e) { console.error("nudge close", String(e)); }
  return json({ ok: true }, 200);
});

// ---- The server's memory of the member's trades (nudge_trades), and the checks each event starts ----
async function liveOpenedAt(userId: string, t: number) {
  const { data } = await admin.from("live_trades").select("opened_at").eq("account", userId).eq("ticket", t).maybeSingle();
  return (data && data.opened_at) || new Date().toISOString();
}
async function rememberOpen(userId: string, t: number, symbol: string | null, dir: string, login: string | null, risk: number | null) {
  const { data: nt } = await admin.from("nudge_trades").select("opened_at, risk0, risk, login, closed_at").eq("user_id", userId).eq("ticket", t).maybeSingle();
  if (!nt) {
    // First sight. A position the feed lost and the EA re-announced keeps its row, so it is never "new" again.
    const openedAt = await liveOpenedAt(userId, t);
    const { error } = await admin.from("nudge_trades").insert({ user_id: userId, ticket: t, login, symbol, direction: dir, opened_at: openedAt, risk0: risk, risk });
    if (!error && Date.now() - Date.parse(openedAt) <= FRESH_MS) later("open", afterOpen(admin, userId, t));
    return;
  }
  if (nt.closed_at) return;
  const set: Record<string, unknown> = {};
  if (login && !nt.login) set.login = login;
  if (risk !== null && !(Number(nt.risk0) > 0)) { set.risk0 = risk; set.risk = risk; }
  else if (risk !== null && risk > (Number(nt.risk) || 0)) set.risk = risk;
  if (Object.keys(set).length) await admin.from("nudge_trades").update(set).eq("user_id", userId).eq("ticket", t);
  const age = Date.now() - Date.parse(nt.opened_at);
  // The risk arrived after the open (the stop goes on a moment after the fill).
  if (set.risk0 && age <= FRESH_MS) later("risk", afterRisk(admin, userId, t));
  // The stop moved away: more than 10% above the risk the trade was taken with (each new high is checked once).
  if (!set.risk0 && set.risk && Number(nt.risk0) > 0 && (set.risk as number) > Number(nt.risk0) * 1.1) later("widen", afterWiden(admin, userId, t));
  // A minute in, still announced, never a stop: once per trade (a quick look before the full check).
  if (risk === null && !(Number(nt.risk0) > 0) && age >= 60000 && age <= 30 * 60000) {
    const { data: done } = await admin.from("nudge_pushes").select("key").eq("user_id", userId).eq("day", utcDay(Date.now())).eq("key", "no_stop:" + t).maybeSingle();
    if (!done) later("no_stop", checkNoStop(admin, userId, t));
  }
}
async function rememberClose(userId: string, t: number, pnl: number | null, closedAt: string, reason: string | null, login: string | null) {
  const { data: nt } = await admin.from("nudge_trades").select("closed_at, login").eq("user_id", userId).eq("ticket", t).maybeSingle();
  if (nt && nt.closed_at) return;                                   // a repeat
  if (!nt) {
    const { data: lt } = await admin.from("live_trades").select("symbol, direction, opened_at, risk").eq("account", userId).eq("ticket", t).maybeSingle();
    const { error } = await admin.from("nudge_trades").insert({
      user_id: userId, ticket: t, login, symbol: lt ? lt.symbol : null, direction: lt ? lt.direction : null,
      opened_at: (lt && lt.opened_at) || closedAt, risk0: lt && lt.risk > 0 ? lt.risk : null, risk: lt && lt.risk > 0 ? lt.risk : null,
      closed_at: closedAt, pnl, close_reason: reason,
    });
    if (error) return;
  } else {
    const set: Record<string, unknown> = { closed_at: closedAt, pnl, close_reason: reason };
    if (login && !nt.login) set.login = login;
    await admin.from("nudge_trades").update(set).eq("user_id", userId).eq("ticket", t).is("closed_at", null);
  }
  if (pnl === null) return;
  later("close", afterClose(admin, userId, t));
  later("trade", afterCloseTrade(admin, userId, t));
}
function strOrNull(v: unknown) { return (typeof v === "string" && v.trim()) ? v.trim().slice(0, 32) : null; }
function loginOf(v: unknown) { const x = (v === undefined || v === null) ? "" : String(v).trim(); return /^\d{1,20}$/.test(x) && x !== "0" ? x : null; }
function reasonOf(v: unknown) { const x = String(v ?? ""); return ["sl", "tp", "so", "manual", "ea", "other"].indexOf(x) !== -1 ? x : null; }

// Values that move on their own - risk in money follows the balance on a % setting, the day's
// trade count and the currency are facts about the moment - are sent for display, never counted
// as a CHANGE to the settings. So is the trade copier's state (EA 8.83: role, the Lead a Follow
// account copies, how many follow accounts a Lead has) - it is how the app groups copies, not a
// risk setting the member changed.
const VOLATILE = new Set(["risk_money", "trades_today", "currency", "copy_role", "copy_lead", "copy_followers"]);
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