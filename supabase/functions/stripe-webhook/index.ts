// ST BILLING - Stripe webhook
//
// Deploy as a Supabase Edge Function named `stripe-webhook`, with JWT verification
// OFF (Stripe is not a signed-in user; the signature is the authentication).
//
//   supabase functions deploy stripe-webhook --no-verify-jwt
//
// Secrets required:
//   STRIPE_SECRET_KEY          sk_live_... (or sk_test_...)
//   STRIPE_WEBHOOK_SECRET      whsec_...   from the webhook endpoint you create
//   SUPABASE_URL               auto-provided
//   SUPABASE_SERVICE_ROLE_KEY  auto-provided
//   STRIPE_PRICE_PREMIUM_M     price_...   \
//   STRIPE_PRICE_PREMIUM_Y     price_...    |
//   STRIPE_PRICE_BUNDLE_M      price_...    |  used to map a price to a plan key
//   STRIPE_PRICE_BUNDLE_Y      price_...    |  (premium / bundle / mentorship)
//   STRIPE_PRICE_MENTOR_M      price_...   /
//   STRIPE_PORTAL_URL          optional, your Customer Portal login link
//
// This function is the ONLY thing that may set is_paid. The client can never be
// trusted with it, so every write here uses the service role and the user is
// found from Stripe's own ids - never from anything the browser sent.

import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

// Deno has no synchronous crypto, so signature verification must use the async
// path with the SubtleCrypto provider. constructEvent() would throw here.
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

// price id -> the plan key the APP and the DB understand.
// This mapping is load-bearing: profiles.plan drives both feature gating in the app
// and st_sync_tier_role() in Postgres, which hands out the community role. Writing
// "monthly" here instead of "bundle" would quietly drop a Bundle Pro subscriber onto
// the free role with none of the access they paid for.
const PLAN_BY_PRICE: Record<string, string> = {};
const addPrice = (envName: string, plan: string) => {
  const id = Deno.env.get(envName);
  if (id) PLAN_BY_PRICE[id] = plan;
};
addPrice("STRIPE_PRICE_PREMIUM_M", "premium");
addPrice("STRIPE_PRICE_PREMIUM_Y", "premium");
addPrice("STRIPE_PRICE_BUNDLE_M", "bundle");
addPrice("STRIPE_PRICE_BUNDLE_Y", "bundle");
addPrice("STRIPE_PRICE_MENTOR_M", "mentorship");

const PORTAL_URL = Deno.env.get("STRIPE_PORTAL_URL") ?? "";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// Which statuses count as "you may use the paid features".
// past_due deliberately keeps access: a card that failed at renewal is a billing
// problem, not a reason to lock someone out of their own trading journal while
// Stripe retries. canceled/unpaid/incomplete do not.
const PAID_STATUSES = new Set(["active", "trialing", "past_due"]);

function planNameFromPrice(priceId: string | null | undefined): string | null {
  if (!priceId) return null;
  const plan = PLAN_BY_PRICE[priceId];
  if (plan) return plan;
  // An unrecognised price still grants access - never lock out someone who has paid -
  // but fall back to the LOWEST tier rather than guessing high, and say so loudly.
  console.warn("[stripe] unmapped price", priceId, "- defaulting to premium");
  return "premium";
}

/**
 * When the current period ends, in seconds.
 *
 * Stripe's "flexible" billing mode moved current_period_end OFF the subscription and onto each
 * subscription ITEM. Webhook payloads are rendered at the ACCOUNT's API version, while
 * subscriptions.retrieve() below is pinned to 2024-06-20 - so the same subscription arrives with
 * the field in different places depending on how we got hold of it.
 *
 * That asymmetry caused a real bug: a purchase (which retrieves) stored the renewal date, and the
 * very next plan change (which reads the event payload) wrote null over it. Read both, prefer
 * whichever exists.
 */
function periodEndOf(sub: Stripe.Subscription): number | null {
  const top = (sub as unknown as { current_period_end?: number }).current_period_end;
  if (typeof top === "number") return top;
  const item = sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined;
  if (item && typeof item.current_period_end === "number") return item.current_period_end;
  return null;
}

/** Find the profile id for a Stripe customer. */
async function findUserByCustomer(customerId: string): Promise<string | null> {
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Write a subscription's state onto the user's profile.
 * Everything the app reads is set here, in one place.
 */
async function applySubscription(sub: Stripe.Subscription, userIdHint?: string | null) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) return { ok: false, reason: "no customer on subscription" };

  const userId = userIdHint ?? (await findUserByCustomer(customerId));
  if (!userId) {
    // The checkout.session.completed event links customer -> user. If a
    // subscription event somehow arrives first, say so rather than guessing:
    // Stripe will retry, and by then the link exists.
    return { ok: false, reason: "no profile for customer " + customerId };
  }

  const priceId = sub.items?.data?.[0]?.price?.id ?? null;
  const isPaid = PAID_STATUSES.has(sub.status);

  // cancel_at_period_end does NOT remove access - it just stops the renewal.
  // Access ends when current_period_end passes and Stripe sends deleted.
  const patch: Record<string, unknown> = {
    is_paid: isPaid,
    status: sub.status,
    plan: isPaid ? planNameFromPrice(priceId) : null,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
  };

  // Only written when we actually have one. Sending null on every event is how a date that was
  // stored correctly got erased by the next unrelated update; a missing field should leave the
  // stored value alone rather than destroy it.
  const periodEnd = periodEndOf(sub);
  if (periodEnd !== null) {
    patch.current_period_end = new Date(periodEnd * 1000).toISOString();
  } else {
    console.warn("[stripe] no current_period_end on", sub.id, "- leaving the stored value alone");
  }

  if (PORTAL_URL) patch.portal_url = isPaid ? PORTAL_URL : null;

  const { error } = await admin.from("profiles").update(patch).eq("id", userId);
  if (error) return { ok: false, reason: error.message };
  return { ok: true, userId, status: sub.status, isPaid };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const sig = req.headers.get("stripe-signature");
  if (!sig) return json({ error: "missing stripe-signature" }, 400);

  // The RAW body is required - parsing it first would break the signature.
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      raw,
      sig,
      Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "",
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    // A bad signature means it did not come from Stripe. Refuse it.
    return json({ error: "signature verification failed: " + (err as Error).message }, 400);
  }

  try {
    switch (event.type) {
      // ---------------------------------------------------------------------
      // The link between a Stripe customer and a Supabase user is made HERE,
      // from client_reference_id, which the app puts on the checkout URL.
      // ---------------------------------------------------------------------
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = s.client_reference_id;
        const customerId = typeof s.customer === "string" ? s.customer : s.customer?.id;

        if (!userId || !customerId) {
          // Nothing to attach it to. Report 200 so Stripe stops retrying a
          // payment we genuinely cannot map, but make it visible in the logs.
          console.warn("[stripe] checkout without client_reference_id or customer", s.id);
          return json({ received: true, linked: false }, 200);
        }

        await admin
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("id", userId);

        // Subscription mode: fetch it and write the full state immediately, so
        // access is granted on this event rather than waiting for the next one.
        const subId = typeof s.subscription === "string" ? s.subscription : s.subscription?.id;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          const res = await applySubscription(sub, userId);
          return json({ received: true, ...res }, 200);
        }
        return json({ received: true, linked: true }, 200);
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const res = await applySubscription(sub);
        // A missing profile is worth retrying - return 500 so Stripe backs off
        // and tries again rather than dropping the event.
        if (!res.ok) return json({ received: true, ...res }, 500);
        return json({ received: true, ...res }, 200);
      }

      // A renewal that failed. Stripe will also send subscription.updated with
      // past_due, but handling this explicitly keeps the status honest even if
      // the ordering differs.
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
        if (customerId) {
          const userId = await findUserByCustomer(customerId);
          if (userId) await admin.from("profiles").update({ status: "past_due" }).eq("id", userId);
        }
        return json({ received: true }, 200);
      }

      default:
        // Everything else is acknowledged and ignored. Returning 200 keeps
        // Stripe from retrying events we do not act on.
        return json({ received: true, ignored: event.type }, 200);
    }
  } catch (err) {
    console.error("[stripe] handler error", event.type, err);
    return json({ error: (err as Error).message }, 500);
  }
});
