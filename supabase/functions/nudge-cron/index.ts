// ============================================================
//  Session Terminal : nudge-cron  (Supabase Edge Function)
//
//  The red-news timer for phone nudges (2 Oct 2026). pg_cron calls this every minute while a
//  high-impact release is under an hour away (the job checks calendar_events first, so a quiet
//  day costs nothing). For every member a push can reach it raises what the app's own 20 s timer
//  raises on screen - "red news in 15 min" (news_soon) and "still in a trade before red news"
//  (news_hold) - waits for an open window to claim it, and pushes the rest. See ../_shared/nudges.ts.
//
//  Since 12 Oct 2026 the same job also runs while a red release's figure is fresh, and this announces it
//  (news_out: actual, forecast, previous; news_fix: a corrected figure). { mode:"results" } runs only that
//  part - actuals-quick calls it the moment it has written a figure.
//
//  { mode:"cloud" } (23 Oct 2026): cloud MT5's alarm - a server gone quiet, an EA stopped, one running again
//  (cloudWatch below; st_minute_tick calls it only when st_cloud_watch_due() says there is something to tell).
//
//  Guarded by the x-cron-key header (NUDGE_CRON_KEY, also in the vault for the pg_cron job).
//  Deploy with "Verify JWT" OFF.
//
//  { mode:"dry", user, what, ticket, rows?, now? } judges one event for one member and returns the
//  nudges it would send, without claiming or sending anything - for testing the rules on real data.
// ============================================================

import { createClient } from "jsr:@supabase/supabase-js@2";
import { afterAlert, afterBE, afterClose, afterCloseTrade, afterEaChange, afterLock, afterOpen, afterPartial, afterRisk, afterWiden, checkNoStop, deliver, newsTick, resultsTick, sendPush, setDry } from "../_shared/nudges.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  const key = Deno.env.get("NUDGE_CRON_KEY");
  if (!key || req.headers.get("x-cron-key") !== key) return json({ error: "forbidden" }, 403);
  // deno-lint-ignore no-explicit-any
  let body: any = {};
  try { body = await req.json(); } catch (_) { body = {}; }
  // A real test notification to one member, through the same path as a nudge (prefs, quiet hours, every device).
  if (body && body.mode === "test" && body.user) {
    const es = body.lang === "es";
    const text = es ? "Prueba de Session Terminal: los avisos en el móvil funcionan." : "Session Terminal test: phone nudges are working.";
    const out = await deliver(admin, String(body.user), body.kind === "trade" ? "trade" : "nudge", [{ rule: "test", key: "test:" + Date.now(), text }], es, 0);
    return json({ test: true, out }, 200);
  }
  if (body && body.mode === "dry") {
    setDry(true, Array.isArray(body.rows) ? body.rows : [], body.now, body.snap, Array.isArray(body.events) ? body.events : undefined);
    try {
      const u = String(body.user || ""), t = Number(body.ticket);
      const fn = ({ open: afterOpen, risk: afterRisk, widen: afterWiden, no_stop: checkNoStop, close: afterClose, trade: afterCloseTrade, be: afterBE } as Record<string, typeof afterOpen>)[String(body.what)];
      const out = body.what === "news" ? await newsTick(admin)
        : body.what === "results" ? await resultsTick(admin, u || undefined)
        : body.what === "lock" ? await afterLock(admin, u, t, !!body.first)
        : body.what === "partial" ? await afterPartial(admin, u, t, Number(body.deal) || 1, Number(body.pct) || 0, Number(body.r) || 0, Number(body.pnl) || 0)
        : body.what === "alert" ? await afterAlert(admin, u, String(body.id || ""), Number(body.px), String(body.zx || ""))
        : body.what === "ea" ? await afterEaChange(admin, u, Number(body.logId) || 1, body.before, body.after, Number(body.at) || Date.now())
        : (fn ? await fn(admin, u, t) : "unknown what");
      return json({ dry: true, out: out ?? null }, 200);
    } catch (e) {
      return json({ error: String(e && (e as Error).stack || e) }, 500);
    } finally { setDry(false); }
  }
  try {
    if (body && body.mode === "results") return json(await resultsTick(admin), 200);
    if (body && body.mode === "cloud") return json(await cloudWatch(), 200);
    // Both wait for an open window to claim what it showed, so they run side by side.
    const [news, results] = await Promise.all([newsTick(admin), resultsTick(admin)]);
    return json({ ...news, ...results }, 200);
  } catch (e) {
    console.error("nudge-cron", String(e && (e as Error).stack || e));
    return json({ error: "failed" }, 500);
  }
});

/* Cloud MT5's alarm (23 Oct 2026, Nestor: "yes start 2"). st_minute_tick posts { mode:"cloud" } only when
   st_cloud_watch_due() finds something to say. The server's agent reports each account every minute, so a status
   older than 4 minutes means the server (or its agent) stopped; 'error' is the agent's own report (the EA went
   quiet, MT5 couldn't sign in); and a member who was told is told again when it runs once more. One push per
   incident (alert_state), kind "cloud": always sent, except in the member's quiet hours. */
async function cloudWatch() {
  const now = Date.now(), out: string[] = [];
  const { data: rows } = await admin.from("cloud_mt5").select("id,user_id,login,server,status,status_msg,status_at,created_at,alert_state");
  const users = [...new Set((rows || []).map((r) => r.user_id))];
  const lang: Record<string, string> = {}, tz: Record<string, string> = {};
  if (users.length) {
    const { data: js } = await admin.from("journals").select("user_id,lang:data->settings->>lang,tz:data->settings->>tz").in("user_id", users);
    (js || []).forEach((j: { user_id: string; lang: string | null; tz: string | null }) => { lang[j.user_id] = j.lang || "en"; tz[j.user_id] = j.tz || "Europe/London"; });
  }
  for (const r of rows || []) {
    const es = lang[r.user_id] === "es", at = Date.parse(r.status_at || r.created_at) || 0;
    const hm = new Date(at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz[r.user_id] || "Europe/London" });
    let next: string | null | undefined, title = "", text = "";
    if ((r.status === "running" || r.status === "starting") && now - at > 4 * 60000 && r.alert_state !== "down") {
      next = "down";
      title = es ? `MT5 ${r.login} en la nube no responde` : `Cloud MT5 ${r.login} isn't answering`;
      text = es ? `Última noticia a las ${hm}. Los gráficos en vivo, operar desde la app y los avisos de esta cuenta pueden no funcionar hasta que vuelva. Te avisamos cuando vuelva.`
                : `Last heard from at ${hm}. Live charts, trading from the app and nudges for this account may be off until it's back. You'll get a message when it is.`;
    } else if (r.status === "error" && r.alert_state !== "error") {
      next = "error";
      title = es ? `MT5 ${r.login} en la nube: un problema` : `Cloud MT5 ${r.login}: a problem`;
      text = r.status_msg || (es ? "Mira Ajustes > MT5 > MT5 en la nube." : "See Settings > MT5 > MT5 in the cloud.");
    } else if (r.alert_state && r.status === "running" && now - at < 2 * 60000) {
      next = null;
      title = es ? `MT5 ${r.login} en la nube funciona otra vez` : `Cloud MT5 ${r.login} is running again`;
      text = es ? `Conectada en ${r.server} y con el EA activo.` : `Signed in on ${r.server}, with the EA back on.`;
    }
    if (next === undefined) continue;
    const res = await sendPush(admin, r.user_id, "cloud", title, text, "st-cloud-" + r.login);
    await admin.from("cloud_mt5").update({ alert_state: next, alert_at: new Date().toISOString() }).eq("id", r.id);
    out.push(`${r.login} ${next || "ok"}=${res}`);
  }
  return { cloud: out };
}

function json(obj: unknown, status: number) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
