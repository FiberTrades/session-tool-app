-- ST PAYOUTS — what has actually been PAID to affiliates. Repo mirror; live objects in Supabase.
--
-- Created ahead of any automation, because it is the thing that makes automation safe later.
-- Without a record of what went out, a retry, a crash halfway through a payout run, or simply
-- running it twice pays somebody twice — and there is nothing to reconcile against afterwards.
-- Same reasoning as the unique invoice id on st_payments.
--
-- UNIQUE (user_id, period_month) is the double-payment guard: one person, one month, one payment.
-- Recording the same month again UPDATES the row rather than adding a second, so correcting an
-- amount can never look like a second payment. Do not relax that constraint.
--
-- period_month is always the FIRST of the month it covers, so a month is one value and cannot be
-- recorded twice under two different dates.
--
-- Money in minor units, as everywhere else money is stored here.
--
-- RLS on with NO policies, same posture as st_payments: nobody reaches it through the API. Access
-- is via the SECURITY DEFINER functions, each of which checks st_is_admin() first.
--
-- Functions:
--   st_admin_payout_set(user, period, amount, note)  record or correct a payment
--   st_admin_payout_clear(user, period)              undo one recorded by mistake — deliberately
--                                                    separate, so removing a payment record is an
--                                                    explicit act and never a side effect of
--                                                    writing a zero
--   st_admin_payout_get(user, period)                what, if anything, has been paid
--
-- NOT YET WIRED TO ANY UI. Nothing writes to this table today; it exists so that manual payments
-- can be recorded from the day they start, and so the schema is settled before automation depends
-- on it. Automatic payouts would mean Stripe Connect — connected accounts, KYC, tax reporting —
-- which is a change in what the business is, not just a feature.

create table if not exists public.st_payouts (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  period_month  date not null,
  amount        integer not null default 0,   -- minor units
  currency      text not null default 'gbp',
  paid_at       timestamptz not null default now(),
  note          text,
  created_at    timestamptz not null default now(),
  unique (user_id, period_month)
);
create index if not exists st_payouts_user_idx   on public.st_payouts (user_id);
create index if not exists st_payouts_period_idx on public.st_payouts (period_month);
alter table public.st_payouts enable row level security;
revoke all on public.st_payouts from anon, authenticated;

-- 2026-09-05, WIRED UP. Each affiliate record card carries Mark paid for the month shown. It writes
-- the amount ON SCREEN, for the month on screen, and never recomputes at click time: paying against
-- a figure you did not look at is how the wrong amount goes out, and recomputing between reading
-- and pressing is precisely the window in which the two could differ.
-- Undo is separate and confirmed. It moves no money, but it makes a paid month look unpaid, which
-- is how somebody gets paid twice by hand later.
-- The button only appears when something is owed; "Mark paid" against £0.00 could only ever create
-- a misleading row.
