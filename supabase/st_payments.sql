-- ST PAYMENTS — the takings ledger. Repo mirror; the live objects are in Supabase.
--
-- WHY IT EXISTS. Everything the admin panel showed before this was a RUN RATE: who is subscribed
-- right now, multiplied by list prices. That answers "what is this worth a month" and cannot
-- answer "what did I take in March", because nothing recorded March. This table is the difference.
--
-- MONEY IS MINOR UNITS, INTEGER, exactly as Stripe sends it. Pounds as a float would put rounding
-- into figures meant to reconcile against a bank statement. Division happens once, at the edge, in
-- st_admin_takings.
--
-- stripe_invoice_id is UNIQUE and the webhook UPSERTS on it. That is the whole idempotency story:
-- Stripe retries, and a second row would overstate takings with no error raised anywhere. Do not
-- relax that constraint.
--
-- user_id is NULLABLE on purpose. An invoice whose customer is not linked to a profile is still
-- money that was taken; dropping it would understate the total. It just cannot be attributed.
--
-- RLS is ON with NO POLICIES, deliberately — the security advisor flags this and it is correct
-- here. Nobody reaches this table through the API: the webhook writes with the service role, and
-- reads go through st_admin_takings, which checks st_is_admin() first.
--
-- WRITTEN BY THE `stripe-payments` EDGE FUNCTION, which is deliberately SEPARATE from
-- `stripe-webhook`. That one is "the ONLY thing that may set is_paid" — it grants and revokes
-- access. Keeping the ledger apart means a bug here loses a row rather than locking a paying
-- member out, and if Stripe disables this endpoint for repeated failures, access keeps working.
--
-- SETUP STILL REQUIRED IN STRIPE (nobody can do this but the account owner):
--   1. Add a webhook endpoint pointing at the stripe-payments function URL.
--   2. Subscribe it to exactly two events: invoice.paid and charge.refunded.
--   3. Put that endpoint's signing secret in Supabase as STRIPE_PAYMENTS_WEBHOOK_SECRET.
-- Until that is done the ledger stays empty and the panel says so rather than showing £0.00.
--
-- HISTORY IS NOT BACKFILLED. This records from the day it is switched on. Past invoices live in
-- Stripe and would need a one-off import; st_admin_takings returns first_paid_at so the panel can
-- always say how far back it actually goes.

create table if not exists public.st_payments (
  id                  bigint generated always as identity primary key,
  stripe_invoice_id   text not null unique,
  stripe_customer_id  text,
  user_id             uuid references public.profiles(id) on delete set null,
  plan                text,
  amount_paid         integer not null default 0,   -- minor units
  amount_refunded     integer not null default 0,
  currency            text not null default 'gbp',
  paid_at             timestamptz not null,         -- when the money moved; what ranges filter on
  period_start        timestamptz,
  period_end          timestamptz,
  created_at          timestamptz not null default now()
);
create index if not exists st_payments_paid_at_idx on public.st_payments (paid_at);
create index if not exists st_payments_user_idx    on public.st_payments (user_id);
alter table public.st_payments enable row level security;
revoke all on public.st_payments from anon, authenticated;

-- st_admin_takings(p_from, p_to) returns net (after refunds), gross, refunded, a month-by-month
-- breakdown, the share from affiliate referrals, and first_paid_at — the ledger's own coverage,
-- because "£0.00 in March" is indistinguishable from a bad March unless the answer says when
-- recording began.

-- 2026-09-05, st_commission_rate(plan): commission on money ACTUALLY COLLECTED — 20% for
-- mentorship, 30% for everything else, applied to the real net amount rather than a list price, so
-- discounts, annual invoices and partial refunds all flow through instead of being approximated.
-- An unmapped plan falls to 30%, because the only tier on a lower rate is explicitly identified;
-- guessing 20% for an unknown price would underpay somebody, which is harder to notice and worse.
--
-- TWO COMMISSION FIGURES EXIST AND BOTH ARE WANTED, so they are labelled differently everywhere:
--   st_commission_estimate  — a forward RUN RATE ("worth £X a month from here"), on the
--                             affiliate's own card and as "Currently worth ...".
--   st_commission_rate      — what was actually earned in a given month, from the ledger. This is
--                             the figure to pay from.
-- They are allowed to differ. Merging them would produce a number that is neither.
--
-- The 12-month rule is applied per payment against that member's own redeemed_at, not as a blanket
-- cutoff: a payment more than a year after somebody redeemed is revenue but earns no commission.
