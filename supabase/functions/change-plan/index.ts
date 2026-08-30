// ST BILLING - change plan (existing subscribers)
//
// Deploy as a Supabase Edge Function named `change-plan`, WITH JWT verification on
// (the default) - this one is called by a signed-in user, and their token is how we
// know which subscription may be touched.
//
//   supabase functions deploy change-plan
//
// Secrets required:
//   STRIPE_SECRET_KEY
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (auto-provided)
//
// Swaps the price on the live subscription and lets Stripe prorate it. The user is
// never trusted with a subscription id: we read theirs from their own profile row,
// so the worst a tampered request can do is try to move THEIR OWN plan to a price
// that must already exist in the allow-list below.
//
// The JWT is checked TWICE, on purpose. The platform gate (verify_jwt) rejects
// anything unsigned before this code runs; the getUser() call below is what turns a
// valid token into the user id whose subscription may be touched. The second is not
// redundant - it is the only thing that decides WHOSE plan changes - but the first
// means a request with no token never reaches the Stripe client at all.

import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

// Only these prices may ever be switched to. Without this a caller could move
// themselves onto any price id in the account, including a 0.00 one.
const ALLOWED_PRICES = [
  Deno.env.get("STRIPE_PRICE_PREMIUM_M"),
  Deno.env.get("STRIPE_PRICE_PREMIUM_Y"),
  Deno.env.get("STRIPE_PRICE_BUNDLE_M"),
  Deno.env.get("STRIPE_PRICE_BUNDLE_Y"),
  Deno.env.get("STRIPE_PRICE_MENTOR_M"),
].filter(Boolean) as string[];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  // Who is asking? The JWT, not the body.
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "not signed in" }, 401);

  const { data: userRes, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userRes?.user) return json({ error: "not signed in" }, 401);
  const userId = userRes.user.id;

  let body: { price_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad json" }, 400);
  }

  const priceId = (body.price_id ?? "").trim();
  if (!priceId) return json({ error: "price_id required" }, 400);
  if (ALLOWED_PRICES.length && !ALLOWED_PRICES.includes(priceId)) {
    return json({ error: "unknown price" }, 400);
  }

  // Their subscription, from their own row.
  const { data: prof } = await admin
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", userId)
    .maybeSingle();

  const subId = prof?.stripe_subscription_id;
  if (!subId) return json({ ok: false, error: "no_active_subscription" }, 200);

  try {
    const sub = await stripe.subscriptions.retrieve(subId);
    if (sub.status === "canceled" || sub.status === "incomplete_expired") {
      return json({ ok: false, error: "no_active_subscription" }, 200);
    }

    const itemId = sub.items?.data?.[0]?.id;
    if (!itemId) return json({ ok: false, error: "no_active_subscription" }, 200);

    // Already on it - report success rather than billing a pointless proration.
    if (sub.items.data[0].price?.id === priceId) {
      return json({ ok: true, unchanged: true }, 200);
    }

    await stripe.subscriptions.update(subId, {
      items: [{ id: itemId, price: priceId }],
      proration_behavior: "create_prorations",
      payment_behavior: "error_if_incomplete",
    });

    // The resulting customer.subscription.updated webhook rewrites the profile,
    // so nothing is written here. One source of truth for billing state.
    return json({ ok: true }, 200);
  } catch (err) {
    console.error("[change-plan]", userId, priceId, err);
    return json({ ok: false, error: (err as Error).message }, 200);
  }
});
