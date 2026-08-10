// ============================================================
//  Session Tool : ingest-trade  (Supabase Edge Function)
//
//  The MT5 EA POSTs one closed trade here. This function:
//    1. looks up the account by its sync_token (a dedicated
//       per-user secret, NOT the account UUID)
//    2. checks that account may sync: on a paid plan (any tier),
//       or still inside its 14-day trial
//    3. writes the trade into trades_inbox (service role),
//       keyed by the account's real UUID so the app's
//       row-level security can read it back
//    4. ignores duplicates (same user + ticket)
//
//  SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected
//  automatically by Supabase - no secrets to paste.
//
//  IMPORTANT: deploy this function with "Verify JWT" turned OFF,
//  because the EA has no logged-in session - the sync_token in
//  the body is the security check instead.
//
//  ---------------------------------------------------------------
//  NEW (v3.2 EA): POST-MORTEM UPDATES
//
//  The EA now sends a SECOND post for a trade it has already sent, carrying what
//  price did AFTER the trade closed (replayed from M1 bars):
//
//    { token, ticket, pot_pips, pot_r, req_sl_pips, be_slack_pips, would_have_won }
//
//  Every trade carries all of them - win, loss and breakeven alike. The EA does not
//  classify: the APP decides Win/BE/Lose from the user's own risk rules, and a breakeven
//  closed with commission looks like a loss from the P&L alone.
//
//  These have no symbol and no price, so they would fail the trade validation
//  below - and the insert path uses ignoreDuplicates, so they would be silently
//  DROPPED even if they passed. They therefore get their own branch, and UPDATE
//  the existing row instead of inserting.
//
//  The replay resolves later than the trade itself (it needs bars that do not
//  exist yet), which is why this is a second post rather than more fields on the
//  first one.
//  ---------------------------------------------------------------
//  AUTO-SYNC IS PART OF THE TRIAL
//
//  This used to reject every account with is_paid !== true, so a trial member's
//  trades never arrived at all: the app showed them a sync token and an import
//  prompt that could never produce anything. Connecting a broker therefore read as
//  a second purchase, which is exactly what the trial is meant to avoid.
//
//  A trial account may now sync for its first TRIAL_DAYS days. The window is
//  measured from profiles.created_at - the same field the app's trialExpired()
//  uses - so the client and the server expire on the same day. If you change
//  TRIAL_DAYS here, change it in the app too or the two will disagree.
//  ---------------------------------------------------------------
// ============================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Keep in step with TRIAL_DAYS in index.html.
const TRIAL_DAYS = 14;

Deno.serve(async (req) => {
  // CORS / preflight (harmless; lets you test from a browser too)
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

  const { token, ticket, symbol } = body ?? {};

  // ---------------------------------------------------------------
  // POST-MORTEM BRANCH
  // A follow-up for a trade already stored. Identified by carrying replay fields
  // and no symbol. Everything below this point assumes a full trade payload.
  // ---------------------------------------------------------------
  const isPostMortem =
    !symbol && (
      body.pot_pips      !== undefined ||
      body.pot_r         !== undefined ||
      body.req_sl_pips   !== undefined ||
      body.be_slack_pips !== undefined ||
      body.be_sim        !== undefined ||
      body.would_have_won !== undefined
    );

  if (isPostMortem) {
    const tkt = Number(ticket);
    if (!token || !Number.isFinite(tkt) || tkt === 0) {
      return json({ error: "post-mortem needs a token and a ticket" }, 400);
    }

    const uid = await resolveSyncUser(String(token));
    if ("error" in uid) return json({ error: uid.error }, uid.status);

    // Only the replay fields. Nothing here can touch the trade's own numbers -
    // a post-mortem must never be able to rewrite a price or a P&L.
    const patch: Record<string, unknown> = { pm_at: new Date().toISOString() };
    if (body.pot_pips       !== undefined) patch.pot_pips       = numOrNull(body.pot_pips);
    if (body.pot_r          !== undefined) patch.pot_r          = numOrNull(body.pot_r);
    if (body.req_sl_pips    !== undefined) patch.req_sl_pips    = numOrNull(body.req_sl_pips);
    if (body.be_slack_pips  !== undefined) patch.be_slack_pips  = numOrNull(body.be_slack_pips);
    if (body.would_have_won !== undefined) patch.would_have_won = body.would_have_won === true;
    // The BE-rule simulation: an array of R outcomes, one per candidate rule. Validated as an
    // array of finite numbers - never trusted straight through into the column.
    if (Array.isArray(body.be_sim) && body.be_sim.every((x: unknown) => Number.isFinite(Number(x)))) {
      patch.be_sim = body.be_sim.map((x: unknown) => Number(x));
    }

    const { error, count } = await admin
      .from("trades_inbox")
      .update(patch, { count: "exact" })
      .eq("token", uid.userId)
      .eq("ticket", tkt);

    if (error) return json({ error: error.message }, 500);
    // No matching row: the trade was never ingested (trial had already expired at the
    // time, or the row was pruned). Report it so the EA can drop the pending replay
    // rather than retrying forever.
    if (!count) return json({ ok: true, updated: 0, reason: "no such trade" }, 200);
    return json({ ok: true, updated: count }, 200);
  }

  // ---------------------------------------------------------------
  // NORMAL TRADE PAYLOAD (unchanged)
  // ---------------------------------------------------------------

  // Reject empty / malformed payloads so a blank trade can never be written. Mirrors the
  // app-side _mt5RowIsValid check: a real trade needs a genuine ticket + symbol AND actual
  // data (a price, or a P&L). Catches a 0/blank ticket, a whitespace symbol, and empty rows.
  const ticketStr = (ticket === undefined || ticket === null) ? "" : String(ticket).trim();
  const symbolStr = (typeof symbol === "string") ? symbol.trim() : "";
  const hasPrice  = (numOrNull(body.entry_price) ?? 0) !== 0 || (numOrNull(body.exit_price) ?? 0) !== 0;
  const hasPnl    = numOrNull(body.pnl) !== null;
  if (
    !token ||
    !ticketStr || ticketStr === "0" || ticketStr === "null" || ticketStr === "undefined" ||
    !symbolStr ||
    (!hasPrice && !hasPnl)
  ) {
    return json({ error: "empty or malformed trade payload" }, 400);
  }

  // 1. Resolve the sync_token to an account. The token is a dedicated secret
  //    stored on the profile - NOT the account UUID. One query gets us the real
  //    user id (for keying the row), the paid flag and the signup date (for the gate).
  // 2. Auto-sync is available to paid accounts (any tier) and to accounts still
  //    inside their trial. Enforced on the SERVER so the window can never be
  //    extended from the browser. Comped accounts have is_paid = true.
  const uid = await resolveSyncUser(String(token));
  if ("error" in uid) return json({ error: uid.error }, uid.status);
  const userId = uid.userId; // the real account UUID

  // 3. Build the row. NOTE: trades_inbox is keyed by the account UUID (its RLS
  //    lets the app read rows where token = auth.uid()), so we store userId here,
  //    never the sync_token.
  const row = {
    token:       userId,
    ticket:      Number(ticket),
    symbol:      String(symbol),
    direction:   body.direction ?? null,
    lots:        numOrNull(body.lots),
    entry_price: numOrNull(body.entry_price),
    exit_price:  numOrNull(body.exit_price),
    open_time:   body.open_time ?? null,
    close_time:  body.close_time ?? null,
    pnl:         numOrNull(body.pnl),
    costs:       numOrNull(body.costs),
    // EA-only detail (null on manual / pre-update trades):
    sl_pips:     numOrNull(body.sl_pips),
    risk_gbp:    numOrNull(body.risk_gbp),
    tp_r:        numOrNull(body.tp_r),
    tp_pips:     numOrNull(body.tp_pips),
    mfe_pips:    numOrNull(body.mfe_pips),
    mfe_r:       numOrNull(body.mfe_r),
  };

  // 4. Insert, ignoring duplicates on (token, ticket).
  const { error } = await admin
    .from("trades_inbox")
    .upsert(row, { onConflict: "token,ticket", ignoreDuplicates: true });

  if (error) return json({ error: error.message }, 500);
  return json({ ok: true }, 200);
});

// Shared by both branches: token -> an account allowed to sync, or an error to return.
// Paid on any tier, or unpaid and still inside the trial window.
async function resolveSyncUser(
  token: string,
): Promise<{ userId: string } | { error: string; status: number }> {
  const { data: prof, error: pErr } = await admin
    .from("profiles")
    .select("id, is_paid, created_at")
    .eq("sync_token", token)
    .maybeSingle();
  if (pErr)  return { error: "profile lookup failed", status: 500 };
  if (!prof) return { error: "unknown token", status: 403 };

  if (prof.is_paid !== true) {
    const created = prof.created_at ? Date.parse(String(prof.created_at)) : NaN;
    // Fails OPEN on an unreadable signup date, deliberately, and to match the app's
    // trialExpired(). A row with no created_at is not a freeloader - it is a data
    // problem - and the alternative is the exact failure this change exists to remove:
    // the app showing someone a working sync panel while the server silently drops
    // every trade. The token is still a per-account secret, so nothing is opened up
    // to the world; at worst one malformed profile keeps syncing.
    const expired = Number.isFinite(created) &&
                    Date.now() >= created + TRIAL_DAYS * 86400000;
    if (expired) {
      // 402 Payment Required: the EA simply stops syncing once the trial is over.
      return { error: "auto-sync requires a paid plan", status: 402 };
    }
  }
  return { userId: String(prof.id) };
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
