// ============================================================
//  Session Terminal : cloud-agent  (Supabase Edge Function)
//
//  The door the Cloud MT5 server's agent (cloud/agent/st_agent.py) uses - and the only one. It never holds the
//  service role key itself: it sends its host id and its own secret (CLOUD_AGENT_KEY, set as a function secret and
//  kept root-only on the server), and gets exactly what it needs (23 Oct 2026, see supabase/cloud_mt5.sql):
//
//    GET  ?host=uk1                      the accounts that host should run: login, server, the encrypted password
//                                        (only the host can open it), the member's sync token for the EA, their
//                                        time zone (the EA's daily reset follows the machine's clock) and App trading.
//    POST {host, id, status, msg}        what happened to one: starting | running | error.
//
//  No sign-in from the app: deploy with "Verify JWT" OFF; the secret is the check.
// ============================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const KEY = Deno.env.get("CLOUD_AGENT_KEY") || "";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

// constant-time compare, so the secret cannot be guessed a character at a time
function same(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const STATUSES = new Set(["starting", "running", "error"]);

Deno.serve(async (req) => {
  if (!KEY || !same(req.headers.get("x-agent-key") || "", KEY)) return json({ error: "forbidden" }, 403);

  if (req.method === "GET") {
    const host = new URL(req.url).searchParams.get("host") || "";
    if (!/^[a-z0-9-]{1,32}$/.test(host)) return json({ error: "bad host" }, 400);
    const { data: rows, error } = await admin.from("cloud_mt5")
      .select("id,user_id,login,server,enc_password,app_trading,status").eq("host_id", host);
    if (error) return json({ error: error.message }, 500);
    const users = [...new Set((rows || []).map((r) => r.user_id))];
    const tokens: Record<string, string> = {}, tzs: Record<string, string> = {};
    if (users.length) {
      const { data: profs } = await admin.from("profiles").select("id,sync_token").in("id", users);
      (profs || []).forEach((p) => { if (p.sync_token) tokens[p.id] = p.sync_token; });
      const { data: js } = await admin.from("journals").select("user_id,tz:data->settings->>tz").in("user_id", users);
      (js || []).forEach((j: { user_id: string; tz: string | null }) => { if (j.tz) tzs[j.user_id] = j.tz; });
    }
    return json({
      accounts: (rows || []).map((r) => ({
        id: r.id, user: r.user_id, login: r.login, server: r.server, enc_password: r.enc_password,
        app_trading: r.app_trading, status: r.status,
        token: tokens[r.user_id] || null, tz: tzs[r.user_id] || "Europe/London",
      })),
    });
  }

  if (req.method === "POST") {
    let b: { host?: string; id?: string; status?: string; msg?: string };
    try { b = await req.json(); } catch { return json({ error: "bad json" }, 400); }
    if (!b.id || !b.host || !STATUSES.has(b.status || "")) return json({ error: "bad request" }, 400);
    const { error } = await admin.from("cloud_mt5")
      .update({ status: b.status, status_msg: (b.msg || "").slice(0, 300) || null, status_at: new Date().toISOString() })
      .eq("id", b.id).eq("host_id", b.host);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  return json({ error: "method" }, 405);
});
