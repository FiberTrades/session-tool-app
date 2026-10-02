// ============================================================
//  Session Tool : nudge-cron  (Supabase Edge Function)
//
//  The red-news timer for phone nudges (2 Oct 2026). pg_cron calls this every minute while a
//  high-impact release is under an hour away (the job checks calendar_events first, so a quiet
//  day costs nothing). For every member a push can reach it raises what the app's own 20 s timer
//  raises on screen - "red news in 15 min" (news_soon) and "still in a trade before red news"
//  (news_hold) - waits for an open window to claim it, and pushes the rest. See ../_shared/nudges.ts.
//
//  Guarded by the x-cron-key header (NUDGE_CRON_KEY, also in the vault for the pg_cron job).
//  Deploy with "Verify JWT" OFF.
//
//  { mode:"dry", user, what, ticket, rows?, now? } judges one event for one member and returns the
//  nudges it would send, without claiming or sending anything - for testing the rules on real data.
// ============================================================

import { createClient } from "jsr:@supabase/supabase-js@2";
import { afterBE, afterClose, afterCloseTrade, afterOpen, afterRisk, afterWiden, checkNoStop, newsTick, setDry } from "../_shared/nudges.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  const key = Deno.env.get("NUDGE_CRON_KEY");
  if (!key || req.headers.get("x-cron-key") !== key) return json({ error: "forbidden" }, 403);
  // deno-lint-ignore no-explicit-any
  let body: any = {};
  try { body = await req.json(); } catch (_) { body = {}; }
  if (body && body.mode === "dry") {
    setDry(true, Array.isArray(body.rows) ? body.rows : [], body.now);
    try {
      const u = String(body.user || ""), t = Number(body.ticket);
      const fn = ({ open: afterOpen, risk: afterRisk, widen: afterWiden, no_stop: checkNoStop, close: afterClose, trade: afterCloseTrade, be: afterBE } as Record<string, typeof afterOpen>)[String(body.what)];
      const out = body.what === "news" ? await newsTick(admin) : (fn ? await fn(admin, u, t) : "unknown what");
      return json({ dry: true, out: out ?? null }, 200);
    } catch (e) {
      return json({ error: String(e && (e as Error).stack || e) }, 500);
    } finally { setDry(false); }
  }
  try {
    return json(await newsTick(admin), 200);
  } catch (e) {
    console.error("nudge-cron", String(e && (e as Error).stack || e));
    return json({ error: "failed" }, 500);
  }
});

function json(obj: unknown, status: number) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
