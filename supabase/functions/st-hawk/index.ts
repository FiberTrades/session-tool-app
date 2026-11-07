// st-hawk (5 Nov 2026): the admin's live setup alerts. cloud/hawk/hawk.py on uk1 posts each alert here; it is stored in
// hawk_signals (once per day and key) and pushed to the admin's phone. Tapping it opens hawk.html at that alert for feedback.
// Admin only: the alerts go to one account (the st_is_admin() email), never to members.
// Guarded by the x-hawk-key header (HAWK_KEY in the function secrets and in /etc/st-hawk.env on uk1). Deploy with --no-verify-jwt.
// Body: { day, key, kind, side?, title, body, data?, symbol? }   or   { ping: true } to check the key
//   or { config: true }: the account + market picked in the hawk tab (hawk_config, 6 Nov 2026), and the hours it watches (wins, 7 Nov).
//   or { news: true, from, to }: the red (high-impact) releases between two ISO times, from the app's calendar_events - the hawk
//   never gives a setup just before one (7 Nov 2026: prop firms don't allow trading into red news).
//   The rule study on hours he picks (7 Nov 2026 evening, "can i be able to change the sessions and times as i please in here?"): the
//   config answer carries `sq`, the oldest request the Hawk tab queued in hawk_study_req (or one stuck running 10 min); then
//   { study_claim: id } marks it running, { study_put: id, run, rows, days, n, net } stores the study (hawk_study + hawk_study_days as
//   that run, replacing any before) and marks it done, { study_fail: id, msg } marks it failed. hawk.py runs cloud/hawk/study_run.py.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendPush } from "../_shared/nudges.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
let adminId = "";
const REQ = "id,run,sym,w_from,w_to";
async function nextReq() {   // the oldest queued, else one claimed 10 minutes ago that never finished
  const q = await admin.from("hawk_study_req").select(REQ).eq("status", "queued").order("id", { ascending: true }).limit(1);
  if (q.data && q.data.length) return q.data[0];
  const s = await admin.from("hawk_study_req").select(REQ).eq("status", "running").lt("started_at", new Date(Date.now() - 10 * 60e3).toISOString()).order("id", { ascending: true }).limit(1);
  return s.data && s.data.length ? s.data[0] : null;
}

async function adminUser(): Promise<string> {
  if (adminId) return adminId;
  const { data } = await admin.rpc("st_admin_uid");   // the account st_is_admin() lets in
  adminId = String(data || "");
  return adminId;
}

Deno.serve(async (req) => {
  const key = Deno.env.get("HAWK_KEY");
  if (!key || req.headers.get("x-hawk-key") !== key) return json({ error: "forbidden" }, 403);
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch (_) { return json({ error: "bad json" }, 400); }
  if (b.ping) return json({ ok: true, admin: !!(await adminUser()) });
  if (b.config) { const { data: c } = await admin.from("hawk_config").select("login,sym,wins").eq("id", 1).maybeSingle();
    let sq = null; try { sq = await nextReq(); } catch (_) { /* the study queue never blocks the hawk */ }
    return json({ ok: true, login: c?.login || "1515070952", sym: c?.sym || "EURUSD", wins: c?.wins || [[480, 600]], sq }); }
  if (b.study_claim) { const { data } = await admin.from("hawk_study_req").update({ status: "running", started_at: new Date().toISOString(), msg: null })
      .eq("id", Number(b.study_claim)).in("status", ["queued", "running"]).select(REQ).maybeSingle();
    return json({ ok: !!data, req: data || null }); }
  if (b.study_fail) { await admin.from("hawk_study_req").update({ status: "error", msg: String(b.msg || "failed").slice(0, 300), done_at: new Date().toISOString() }).eq("id", Number(b.study_fail));
    return json({ ok: true }); }
  if (b.study_put) { const id = Number(b.study_put);
    const { data: rq } = await admin.from("hawk_study_req").select("id,run,status").eq("id", id).maybeSingle();
    if (!rq || rq.status !== "running" || rq.run !== b.run) return json({ error: "no such request" }, 400);
    const rows = Array.isArray(b.rows) ? b.rows as Record<string, unknown>[] : [], days = Array.isArray(b.days) ? b.days as Record<string, unknown>[] : [];
    const fail = async (m: string) => { await admin.from("hawk_study_req").update({ status: "error", msg: m.slice(0, 300), done_at: new Date().toISOString() }).eq("id", id); return json({ error: m }, 500); };
    if (!rows.every((r) => Number.isInteger(r.n) && /^\d{4}-\d{2}-\d{2}$/.test(String(r.day))) || !days.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d.day)) && d.d)) return fail("bad rows");
    let e = (await admin.from("hawk_study").delete().eq("run", rq.run)).error || (await admin.from("hawk_study_days").delete().eq("run", rq.run)).error;
    if (e) return fail(e.message);
    for (let i = 0; i < rows.length && !e; i += 200) e = (await admin.from("hawk_study").insert(rows.slice(i, i + 200).map((r) => ({ run: rq.run, n: r.n, day: r.day, data: r })))).error;
    for (let i = 0; i < days.length && !e; i += 100) e = (await admin.from("hawk_study_days").insert(days.slice(i, i + 100).map((d) => ({ run: rq.run, day: d.day, d: d.d })))).error;
    if (e) return fail(e.message);
    await admin.from("hawk_study_req").update({ status: "done", n: rows.length, net: Number(b.net) || 0, msg: null, done_at: new Date().toISOString() }).eq("id", id);
    return json({ ok: true, n: rows.length }); }
  if (b.news) { const from = new Date(String(b.from || "")), to = new Date(String(b.to || ""));
    if (isNaN(+from) || isNaN(+to) || +to - +from > 7 * 86400e3) return json({ error: "bad range" }, 400);
    const { data: ev, error } = await admin.from("calendar_events").select("at,currency,title").ilike("impact", "high").eq("timed", true)
      .gte("at", from.toISOString()).lte("at", to.toISOString()).order("at", { ascending: true });
    return error ? json({ error: error.message }, 500) : json({ ok: true, events: ev || [] }); }
  const symbol = /^[A-Z0-9.]{3,12}$/.test(String(b.symbol || "")) ? String(b.symbol) : "EURUSD";
  const day = String(b.day || ""), k = String(b.key || ""), kind = String(b.kind || "");
  const title = String(b.title || "").slice(0, 120), body = String(b.body || "").slice(0, 1200);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !k || !kind || !title) return json({ error: "missing fields" }, 400);
  const side = b.side === 1 || b.side === -1 ? b.side : null;
  const { data: row, error } = await admin.from("hawk_signals")
    .insert({ day, key: k, kind, symbol, side, title, body, data: b.data || {} }).select("id").single();
  if (error) return json({ ok: true, dup: true });   // already sent today
  const uid = await adminUser();
  let push = "no-admin";
  if (uid && !b.quiet) push = await sendPush(admin, uid, "nudge", title, body, "st-hawk-" + k, "hawk.html?id=" + row.id, "hawk");
  await admin.from("hawk_signals").update({ push }).eq("id", row.id);
  return json({ ok: true, id: row.id, push });
});
