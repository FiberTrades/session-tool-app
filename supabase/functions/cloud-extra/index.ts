// ST BILLING - extra cloud places (24 Oct 2026)
//
// A paid member runs up to 5 MT5 accounts in the cloud; each place beyond that is an "Extra cloud account" item on their own
// Stripe subscription: £3 a month, or £30 a year on a yearly plan (Stripe keeps one interval per subscription, so the extra
// follows the plan's). Nestor, 24 Oct 2026: "if users (not free trial users) want to have more than 5 accounts synced, we can
// offer it by making them pay extra on top of their subscription".
//
//   POST { op: "add" }      one more place: the item's quantity +1, charged now for the rest of the period (always_invoice;
//                           a card that fails refuses the change)
//   POST { op: "remove" }   one place fewer, credited on the next invoice - only while the member's cloud accounts still fit
//
// Deploy WITH JWT verification on (the default): the signed-in member's token decides whose subscription is touched; the
// subscription id is read from their own profile, never from the request.
//
//   supabase functions deploy cloud-extra
//
// Secrets: STRIPE_SECRET_KEY, STRIPE_PRICE_CLOUD_EXTRA_M, STRIPE_PRICE_CLOUD_EXTRA_Y (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY auto).
// profiles.cloud_extra is written here at once and again by stripe-webhook (the source of truth), which st_cloud_mt5_room reads.

import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});
const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
  auth: { persistSession: false },
});

const EXTRA_M = Deno.env.get("STRIPE_PRICE_CLOUD_EXTRA_M") ?? "";
const EXTRA_Y = Deno.env.get("STRIPE_PRICE_CLOUD_EXTRA_Y") ?? "";
const EXTRA = new Set([EXTRA_M, EXTRA_Y].filter(Boolean));
const INCLUDED = 5;     // as st_cloud_mt5_room
const MAX_EXTRA = 20;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "not signed in" }, 401);
  const { data: userRes, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userRes?.user) return json({ error: "not signed in" }, 401);
  const userId = userRes.user.id;

  let body: { op?: string };
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const op = body.op === "add" || body.op === "remove" ? body.op : null;
  if (!op) return json({ error: "op must be add or remove" }, 400);
  if (!EXTRA_M || !EXTRA_Y) return json({ ok: false, error: "not_configured" }, 200);

  const { data: prof } = await admin.from("profiles").select("stripe_subscription_id, is_paid, cloud_extra").eq("id", userId).maybeSingle();
  if (!prof?.is_paid) return json({ ok: false, error: "not_paid" }, 200);
  const subId = prof.stripe_subscription_id;
  if (!subId) return json({ ok: false, error: "no_active_subscription" }, 200);   // access granted directly: no Stripe subscription

  try {
    const sub = await stripe.subscriptions.retrieve(subId);
    if (sub.status === "canceled" || sub.status === "incomplete_expired" || sub.status === "unpaid") {
      return json({ ok: false, error: "no_active_subscription" }, 200);
    }
    const items = sub.items?.data ?? [];
    const planItem = items.find((i) => !EXTRA.has(i.price?.id ?? ""));
    if (!planItem) return json({ ok: false, error: "no_active_subscription" }, 200);
    const extraItem = items.find((i) => EXTRA.has(i.price?.id ?? ""));
    const yearly = planItem.price?.recurring?.interval === "year";
    const want = yearly ? EXTRA_Y : EXTRA_M;
    const cur = extraItem?.quantity ?? 0;

    let next = cur;
    if (op === "add") {
      if (cur >= MAX_EXTRA) return json({ ok: false, error: "too_many" }, 200);
      next = cur + 1;
    } else {
      if (cur === 0) return json({ ok: true, extra: 0, unchanged: true }, 200);
      const { count } = await admin.from("cloud_mt5").select("id", { count: "exact", head: true }).eq("user_id", userId);
      if ((count ?? 0) > INCLUDED + cur - 1) return json({ ok: false, error: "in_use", used: count, places: INCLUDED + cur }, 200);
      next = cur - 1;
    }

    const change = extraItem
      ? (next === 0 ? { id: extraItem.id, deleted: true } : { id: extraItem.id, quantity: next, ...(extraItem.price?.id !== want ? { price: want } : {}) })
      : { price: want, quantity: next };
    await stripe.subscriptions.update(subId, {
      items: [change],
      proration_behavior: op === "add" ? "always_invoice" : "create_prorations",
      payment_behavior: "error_if_incomplete",
    });
    await admin.from("profiles").update({ cloud_extra: next }).eq("id", userId);
    return json({ ok: true, extra: next, yearly }, 200);
  } catch (err) {
    console.error("[cloud-extra]", userId, op, err);
    return json({ ok: false, error: "stripe", message: (err as Error).message }, 200);
  }
});
