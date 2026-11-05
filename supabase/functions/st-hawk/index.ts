// st-hawk (5 Nov 2026): the admin's live setup alerts. cloud/hawk/hawk.py on uk1 posts each alert here; it is stored in
// hawk_signals (once per day and key) and pushed to the admin's phone. Tapping it opens hawk.html at that alert for feedback.
// Admin only: the alerts go to one account (the st_is_admin() email), never to members.
// Guarded by the x-hawk-key header (HAWK_KEY in the function secrets and in /etc/st-hawk.env on uk1). Deploy with --no-verify-jwt.
// Body: { day, key, kind, side?, title, body, data? }   or   { ping: true } to check the key.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendPush } from "../_shared/nudges.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
let adminId = "";

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
  const day = String(b.day || ""), k = String(b.key || ""), kind = String(b.kind || "");
  const title = String(b.title || "").slice(0, 120), body = String(b.body || "").slice(0, 1200);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !k || !kind || !title) return json({ error: "missing fields" }, 400);
  const side = b.side === 1 || b.side === -1 ? b.side : null;
  const { data: row, error } = await admin.from("hawk_signals")
    .insert({ day, key: k, kind, side, title, body, data: b.data || {} }).select("id").single();
  if (error) return json({ ok: true, dup: true });   // already sent today
  const uid = await adminUser();
  let push = "no-admin";
  if (uid && !b.quiet) push = await sendPush(admin, uid, "nudge", title, body, "st-hawk-" + k, "hawk.html?id=" + row.id, "hawk");
  await admin.from("hawk_signals").update({ push }).eq("id", row.id);
  return json({ ok: true, id: row.id, push });
});
