// ============================================================
//  Session Terminal : welcome-email  (Supabase Edge Function)
//
//  Sends the welcome email to an account about ten minutes after it confirmed its address, once
//  (12 Oct 2026). See supabase/welcome_email.sql for the whole arrangement.
//
//  It needs no email key of its own: it asks the project's sign-in mailer for a one-time sign-in email.
//  The app never uses those, so that email template ("Magic link or OTP" in Supabase Auth) holds the
//  welcome email instead and carries no sign-in link. The one-time code the mailer generates is never
//  shown to anyone and expires unused.
//
//  pg_cron (welcome-email-timer) calls this every five minutes while someone is due. Guarded by the
//  x-cron-key header (NUDGE_CRON_KEY). Deploy with "Verify JWT" OFF.
//
//  { mode:"test" } sends the email to the owner's own address only, to look at it. Nothing is recorded.
// ============================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

// deno-lint-ignore no-explicit-any
type Any = any;

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
const OWNER = "be.o2@hotmail.com";

Deno.serve(async (req) => {
  const key = Deno.env.get("NUDGE_CRON_KEY");
  if (!key || req.headers.get("x-cron-key") !== key) return json({ error: "forbidden" }, 403);
  let body: Any = {};
  try { body = await req.json(); } catch (_) { body = {}; }
  try {
    if (body && body.mode === "test") return json({ test: true, to: "owner", result: await send(OWNER) }, 200);
    const { data, error } = await admin.rpc("st_welcome_take");
    if (error) { console.error("welcome-email take", error.message); return json({ error: "take" }, 500); }
    const out: string[] = [];
    for (const row of (data || [])) {
      const r = await send(String(row.email));
      await admin.from("welcome_emails").update(
        r.ok ? { status: "sent", sent_at: new Date().toISOString(), error: null } : { status: "failed", error: r.error || "failed" },
      ).eq("user_id", row.user_id);
      out.push(String(row.user_id).slice(0, 6) + (r.ok ? "=sent" : "=failed"));
      if (!r.ok) console.error("welcome-email send", String(row.user_id).slice(0, 6), r.error);
    }
    if (out.length) console.log("[welcome]", out.join(","));
    return json({ sent: out }, 200);
  } catch (e) {
    console.error("welcome-email", String(e && (e as Error).stack || e));
    return json({ error: "failed" }, 500);
  }
});

// A one-time sign-in email for an account that already exists and is confirmed = the welcome email.
// shouldCreateUser:false: this can never create an account for an address that has none.
async function send(email: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await admin.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    return error ? { ok: false, error: String(error.message || error).slice(0, 200) } : { ok: true };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message || e).slice(0, 200) };
  }
}

function json(obj: unknown, status: number) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
