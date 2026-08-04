// ═══════════════════════════════════════════════════════════════════════════
// st-ai-cost — ADMIN-ONLY. Returns the organization's REAL Anthropic API spend
// (USD) over a date range, from Anthropic's Cost Report API. The AI Meter uses
// this for an exact "used" figure instead of estimating from token counts.
//
// NOTE: Anthropic does NOT expose the prepaid CREDIT BALANCE via any API (only
// usage/cost). So the meter still stores the balance the admin enters; this makes
// "used" exact so "left = balance − used" stays accurate without re-pasting — you
// only re-enter the balance when you TOP UP (add funds).
//
// SETUP (one-time):
//   1. Create an Anthropic Admin API key (sk-ant-admin01-…) at
//      platform.claude.com → Settings → Admin keys (org admin role required).
//   2. Supabase → Edge Functions → Secrets: add  ANTHROPIC_ADMIN_KEY = sk-ant-admin01-…
//   3. Deploy this function. Keep verify_jwt ON (Supabase validates the caller's
//      session token; we then trust its email claim for the admin gate).
// ═══════════════════════════════════════════════════════════════════════════

const ADMIN_EMAIL = "be.o2@hotmail.com";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json" } });
}

// Read the email claim from the (Supabase-verified) session JWT. verify_jwt=ON
// guarantees the signature is valid, so this claim is trustworthy for the gate.
function emailFromJwt(req: Request): string | null {
  try {
    const tok = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const seg = tok.split(".")[1];
    if (!seg) return null;
    const payload = JSON.parse(atob(seg.replace(/-/g, "+").replace(/_/g, "/")));
    const e = String(payload.email || "").toLowerCase();
    return e || null;
  } catch { return null; }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const email = emailFromJwt(req);
    if (email !== ADMIN_EMAIL) return json({ error: "forbidden" }, 403);

    const adminKey = Deno.env.get("ANTHROPIC_ADMIN_KEY");
    if (!adminKey) return json({ error: "ANTHROPIC_ADMIN_KEY not set in Edge Function secrets" }, 500);

    let body: { since?: string } = {};
    try { body = await req.json(); } catch { /* no body → default window */ }

    const now = new Date();
    // Default window: start of the current UTC month. Caller passes `since` (the date the
    // credit balance was set) so "used" = real cost since that top-up.
    const sinceDate = body.since ? new Date(body.since) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const startingAt = new Date(Date.UTC(sinceDate.getUTCFullYear(), sinceDate.getUTCMonth(), sinceDate.getUTCDate())).toISOString();
    const endingAt = now.toISOString();

    // Sum every cost bucket (amounts are USD in *cents*, as decimal strings). Paginate defensively.
    let totalCents = 0;
    let page: string | null = null;
    let guard = 0;
    do {
      const qs = new URLSearchParams({ starting_at: startingAt, ending_at: endingAt });
      if (page) qs.set("page", page);
      const r = await fetch("https://api.anthropic.com/v1/organizations/cost_report?" + qs.toString(), {
        headers: { "x-api-key": adminKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      });
      if (!r.ok) {
        const detail = (await r.text().catch(() => "")).slice(0, 400);
        return json({ error: "anthropic_" + r.status, detail }, 502);
      }
      const j = await r.json();
      for (const row of (j.data || [])) { const c = parseFloat(row.amount); if (!isNaN(c)) totalCents += c; }
      page = j.has_more ? (j.next_page || null) : null;
    } while (page && ++guard < 50);

    return json({ usd: totalCents / 100, since: startingAt, until: endingAt });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
