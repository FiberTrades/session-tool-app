// ============================================================
//  Session Terminal : cloud-agent  (Supabase Edge Function)
//
//  The door the Cloud MT5 server's agent (cloud/agent/st_agent.py) uses - and the only one. It never holds the
//  service role key itself: it sends its host id and its own secret (CLOUD_AGENT_KEY, set as a function secret and
//  kept root-only on the server), and gets exactly what it needs (23 Oct 2026, see supabase/cloud_mt5.sql):
//
//    GET  ?host=uk1                      the accounts that host should run: login, server, the encrypted password
//                                        (only the host can open it), the member's sync token for the EA, their
//                                        time zone (the EA's daily reset follows the machine's clock), App trading,
//                                        and the EA settings that account last reported (its starting inputs).
//    POST {host, id, status, msg}        what happened to one: starting | running | error. Sent every minute too,
//                                        so status_at doubles as the server's heartbeat (nudge-cron's cloud watch).
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
    // The EA settings that account last reported, from whichever MT5 ran it (23 Oct 2026, "settings follow the account"):
    // the server starts its EA with them, so an account moved from a PC keeps its risk, stops, TP, BE and daily limit.
    // EURUSD first (the chart the server opens), else the account's most recent report.
    // And every symbol that account's EA ran on in the last 30 days, each with its own settings (23 Oct 2026, "the
    // multiple assets users trade"): the server opens one EA chart per symbol - an order from the app, break-even and
    // the symbol's candles for Replay all need the EA on that symbol's chart.
    const eaOf: Record<string, unknown> = {}, easOf: Record<string, { symbol: string; settings: unknown }[]> = {};
    const logins = [...new Set((rows || []).map((r) => String(r.login)))];
    if (logins.length) {
      const { data: es } = await admin.from("ea_settings").select("user_id,login,symbol,settings,updated_at").in("login", logins)
        .order("updated_at", { ascending: false });
      const since = Date.now() - 30 * 864e5;
      (es || []).forEach((e) => {
        const k = e.user_id + "|" + e.login, cur = eaOf[k] as { symbol?: string } | undefined;
        if (!cur || (cur.symbol !== "EURUSD" && e.symbol === "EURUSD")) eaOf[k] = { symbol: e.symbol, settings: e.settings };
        if (Date.parse(e.updated_at) >= since && /^[A-Za-z0-9._#+-]{1,32}$/.test(e.symbol || "")) {
          const l = easOf[k] = easOf[k] || [];
          if (!l.some((x) => x.symbol === e.symbol)) l.push({ symbol: e.symbol, settings: e.settings });
        }
      });
    }
    return json({
      accounts: (rows || []).map((r) => ({
        id: r.id, user: r.user_id, login: r.login, server: r.server, enc_password: r.enc_password,
        app_trading: r.app_trading, status: r.status,
        token: tokens[r.user_id] || null, tz: tzs[r.user_id] || "Europe/London",
        ea: (eaOf[r.user_id + "|" + r.login] as { settings?: unknown } | undefined)?.settings || null,
        eas: easOf[r.user_id + "|" + r.login] || [],
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
