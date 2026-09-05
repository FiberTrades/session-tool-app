-- VIP codes and affiliate codes. Applied 2026-09-05 as migration `vip_and_affiliate_codes`.
--
-- TWO KINDS, ONE TABLE, ONE REDEMPTION PATH:
--
--   vip        one named person, one use, grants FREE FULL ACCESS for a set number of days
--              (or forever, if no days are given). Revocable, and revoking takes the access back.
--   affiliate  one per affiliate, unlimited uses, grants NO paid access at all. It records who
--              sent the member, and lengthens their free trial - which is the affiliate's offer
--              to their audience, and costs nothing because the trial takes no card either way.
--
-- WHY THE EXPIRY EXISTS AT ALL. profiles.current_period_end was only ever DISPLAYED by the app;
-- nothing acted on it. A comp account dated 27 July still had full access in September. The cron
-- job below is what makes "free access for as long as I choose" actually true, and it runs
-- server-side so it cannot be bypassed from a browser.
--
-- FOUND ON THE FIRST DRY RUN, BEFORE THE JOB EVER FIRED: the one account it would have expired
-- was the OWNER'S. be.o2@hotmail.com was plan='comp' with a 27 July date, so the very first
-- nightly run would have locked Nestor out of his own app. His expiry is now null. Run the dry
-- run at the bottom of this file before changing anything here.
--
-- SECURITY. Both tables have RLS enabled with NO policies, which denies every client read and
-- write. Everything goes through the SECURITY DEFINER functions, and the admin ones call the
-- existing st_is_admin(), which reads the email out of the SIGNED JWT. The app's own admin check
-- is a client-side email comparison - fine for deciding what to render, useless as a guard - so
-- the database deliberately does not trust it.

alter table public.profiles add column if not exists trial_days int;

create table if not exists public.st_codes (
  code        text primary key,
  kind        text not null check (kind in ('vip','affiliate')),
  label       text,
  grant_days  int,
  max_uses    int,
  uses        int         not null default 0,
  revoked     boolean     not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.st_code_redemptions (
  id          bigserial primary key,
  code        text        not null references public.st_codes(code) on delete cascade,
  kind        text        not null,
  user_id     uuid        not null,
  redeemed_at timestamptz not null default now(),
  unique (user_id, code)
);

-- A member belongs to ONE affiliate, ever - the first code they use. Without this, re-entering a
-- different code later would move an existing subscription between affiliates, and the two of
-- them would be arguing about a commission you already paid.
create unique index if not exists st_code_one_affiliate_per_user
  on public.st_code_redemptions (user_id) where kind = 'affiliate';

alter table public.st_codes            enable row level security;
alter table public.st_code_redemptions enable row level security;

-- Alphabet excludes 0/O, 1/I/L, 5/S and 8/B. These get read aloud on a video and typed from
-- memory; an ambiguous character is a support message.
--   st_gen_code()          -> 'ST-6RGR-3A7K'
--   st_redeem_code(text)   -> jsonb, called by any signed-in member
--   st_admin_create_code() -> a row, admin only
--   st_admin_list_codes()  -> the list, with `paying` = redeemers who actually converted
--   st_admin_revoke_code() -> revokes, and by default takes VIP access back
--   st_expire_comps()      -> nightly at 03:17 via pg_cron
--   st_admin_delete_code() -> removes a REVOKED code for good, redemptions cascading with it
--   st_admin_find_member() -> name + plan for an email, admin only
--   st_my_code()           -> the caller's OWN affiliate code and its counts, members
--
-- Two guards worth keeping when this is edited:
--   * revoke only strips access where plan = 'comp', so it can never disable a real paying
--     customer who also happens to hold a code;
--   * st_expire_comps skips rows where current_period_end is null, because null means the grant
--     was deliberately open-ended rather than overdue.
--
-- The full function bodies live in the migration. Fetch the current ones with:
--   select pg_get_functiondef('public.st_redeem_code(text)'::regprocedure);
--
-- COMMISSION, as agreed 2026-09-05 (tracked outside the schema, paid manually while the numbers
-- are small): ST Journal GBP 20/mo and Bundle Pro GBP 35/mo at 30%, Mentorship GBP 299/mo at 20%,
-- for 12 months per referred member, paid on CONVERSION TO PAID rather than signup - the trial
-- takes no card, so a free signup costs an affiliate nothing to manufacture - with a 30-day
-- clawback window for refunds.

-- 2026-09-05, affiliate ownership: st_codes.owner_user_id, plus a unique index allowing ONE
-- live affiliate code per owner - two would split an affiliate's attribution and the first
-- anyone would know is an argument over a short commission. st_admin_create_code refuses an
-- affiliate code whose owner has no account, because a code its owner can never be shown is
-- not worth minting. st_my_code returns COUNTS ONLY: an affiliate has every right to know how
-- they are doing and none to know who the people are.

-- 2026-09-05, st_admin_delete_code: deleting is refused unless the code is already REVOKED.
-- The two-step is enforced in the database rather than by hiding a button, because revoking is
-- what takes a member's access away and deleting is what destroys the record of it - a live
-- code deleted in one click would leave somebody holding access granted by a code that no
-- longer exists. Deleting never changes a plan; revoke already settled that.

-- 2026-09-05, st_admin_list_codes: the list shows the redeemer by NAME as well as email. The
-- display name is not in profiles - it lives in journals.data->>'userName' - and it is read at
-- QUERY time rather than copied into st_code_redemptions, so it follows a rename instead of
-- freezing the name as it was on the day the code was used. Reads as "Nestor - be.o2@hotmail.com",
-- which also makes a mismatch against your own label visible at a glance.

-- Dry run. Never add an expiry job without checking who it would actually catch.
--   select email, plan, current_period_end,
--          case when plan='comp' and current_period_end is not null and current_period_end < now()
--               then 'WOULD LOSE ACCESS' else 'safe' end
--     from public.profiles where plan = 'comp' order by email;
