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

-- 2026-09-05, an affiliate code dies with its owner. owner_user_id had NO foreign key and
-- st_redeem_code never checked the owner existed, so deleting an affiliate's account without
-- revoking first left their code recruiting indefinitely - crediting somebody who was not there,
-- invisibly, because the card that would show it needs their login. Now ON DELETE SET NULL, and
-- redeem refuses an affiliate code with a null owner.
-- SET NULL rather than CASCADE deliberately: cascading would delete the codes, and deleting a
-- code cascades its redemptions - so removing an affiliate would destroy the record of every
-- member they introduced, including ones you may still owe them for. Nulling keeps the history
-- and stops the code, which is the pair actually wanted.
-- st_admin_list_codes gained an `owner` column so a dead code says '(owner removed)' instead of
-- looking healthy. Adding an OUT column changes the return type, which CREATE OR REPLACE refuses
-- outright - it needs a DROP first, same family as the overload trap below.

-- 2026-09-05, several affiliate codes per person, and the trial length written into the code.
-- The one-live-code index is DROPPED: it existed to stop attribution splitting across two codes,
-- but that only matters if earnings are counted per CODE, and they are counted per OWNER. Several
-- codes are campaigns - 30 days for one audience, 60 for another - and st_my_code aggregates over
-- all of them, so a member with three sees ONE figure to be paid.
-- st_gen_code(days) puts the number in an affiliate code: ST-30-WFQC reads aloud on a video and
-- tells the listener what they get. VIP codes keep ST-XXXX-XXXX, because they grant access rather
-- than a trial and a number there would mislead.

-- 2026-09-05, OVERLOAD TRAP, worth knowing before editing any function here. CREATE OR REPLACE
-- FUNCTION cannot change a signature: adding p_owner_email to st_admin_create_code did not
-- replace the four-argument version, it created a SECOND function beside it. The VIP card sends
-- four named parameters, which matched BOTH, because the five-argument one defaults its last -
-- PostgREST could not choose and every VIP code generation failed while the affiliate card,
-- sending five, worked. Adding a parameter here means DROP the old signature explicitly.
-- Check with: select proname, count(*) from pg_proc ... group by proname having count(*) > 1.

-- 2026-09-05, st_my_code breakdown: counts split by tier, plus an ESTIMATE of the month's
-- commission. Two things stop it overpaying. is_paid is read LIVE, so a referred member who
-- cancels drops out the moment their subscription lapses - nothing is stored, so nothing can go
-- stale. And a TWELVE MONTH WINDOW on redeemed_at, because commission runs 12 months per
-- member; without it the totals would have grown forever and the first sign of trouble would
-- have been paying somebody for a member they introduced two years ago.
-- Prices and rates are copied from the pricing page: GBP 20 and GBP 35 at 30%, GBP 299 at 20%.
-- The figure uses MONTHLY list prices, so an annual subscriber is worth less per month than it
-- suggests, and refunds and tax are not modelled - the app calls it an estimate for that reason.

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

-- 2026-09-05, st_commission_estimate: the percentages live in ONE function and both surfaces
-- call it - st_my_code, which the affiliate reads in their own Settings, and
-- st_admin_affiliate_summary, which you read at month end. They were briefly about to be two
-- copies of the same arithmetic, which is fine until the day they drift and an affiliate is
-- looking at a different number from the one you are paying. Change a rate here and both sides
-- move together. GBP 20 and GBP 35 at 30% -> 6.00 and 10.50; GBP 299 at 20% -> 59.80.

-- 2026-09-05, st_admin_affiliate_summary: one row per affiliate - codes, signups, the tier split
-- of who is paying, and the money. Same 12-month window and same live is_paid read as
-- st_my_code, so the admin figure and the affiliate's own figure agree by construction rather
-- than by both being maintained carefully. Affiliates earning nothing are still listed: someone
-- with eleven signups and no conversions is exactly what you want to see.

-- 2026-09-05, VIP CODES ARE GONE. Full access is granted straight onto the account by
-- st_admin_set_access(email, days, on) instead. The VIP code existed to give access to somebody
-- who had no account yet; the real workflow turned out to be the reverse - they sign up, take the
-- free trial, and get upgraded after - so the code was a round trip through the person you were
-- trying to help. Evidence rather than taste: no code of either kind had ever been redeemed, and
-- all four accounts already on 'comp' were granted directly. The two unredeemed VIP codes were
-- deleted, st_admin_create_code now refuses any kind but 'affiliate', and st_redeem_code refuses
-- a non-affiliate code and no longer touches is_paid/plan at all - a referral code should never
-- have been able to hand out paid access, and now it cannot.
--
-- st_admin_set_access removes access ONLY from accounts whose plan is 'comp'. A mistyped address
-- therefore cannot strip a paying subscriber: Stripe owns that decision, not the admin panel.
--
-- One consequence worth knowing: codes now mean exactly one thing, which is what lets the sign-up
-- card ask "Have a code?" without a qualifier and still be answerable.

-- 2026-09-05, st_admin_affiliate_summary keeps affiliates whose codes are ALL revoked, marked
-- ended. Revoking is what ends the relationship, and that is precisely when a final payment falls
-- due - the members they introduced are still subscribed, so the money is real. Dropping the row
-- would hide the number on the one day it is needed.

-- Dry run. Never add an expiry job without checking who it would actually catch.
--   select email, plan, current_period_end,
--          case when plan='comp' and current_period_end is not null and current_period_end < now()
--               then 'WOULD LOSE ACCESS' else 'safe' end
--     from public.profiles where plan = 'comp' order by email;

-- 2026-09-05, ONE CARD. st_admin_access_list() returns everyone who has been given full access -
-- name, email, what is left of it - together with their affiliate codes, who those brought in and
-- what that is worth. Two panels reading two functions was the wrong shape: the affiliate IS the
-- comped member, so splitting them meant holding one person in two places.
-- st_admin_affiliate_summary and st_admin_list_codes are dropped, superseded by it.
--
-- The list includes anyone comped OR holding an affiliate code. The second half matters on the day
-- it is least convenient: if somebody's access lapses while members they introduced are still
-- paying, they must not disappear from the list you settle up from.
--
-- Revoking an affiliate code from a record card passes kill_access FALSE. Revoking a referral code
-- stops it being used and must not touch anybody's plan - the people it already brought in are
-- paying customers, and taking their access away would be a billing incident, not a tidy-up.

-- 2026-09-05, st_admin_access_list excludes admins via st_admin_ids(). The admin does not belong
-- in a list of people the admin has given access to, and seeing yourself there invites the one
-- action that would lock you out of the panel you are looking at. Excluded through st_admin_ids()
-- rather than a second copy of the email literal: two places already decide who is an admin, and
-- a third would be the one that eventually disagrees.

-- 2026-09-05, dropped the zero-argument st_gen_code(). It sat beside
-- st_gen_code(integer DEFAULT NULL), which made the no-argument call AMBIGUOUS - "function
-- public.st_gen_code() is not unique" - the same overload trap that broke code generation earlier
-- today, waiting for whoever next wrote the obvious `select st_gen_code()`. The only caller,
-- st_admin_create_code, passes st_gen_code(p_days) and resolved correctly either way.
--
-- Code shape, for the record: ST-<days>-<4 chars>, e.g. ST-30-HHD4 (10 chars), ST-365-CFDW (11).
-- The gate and Settings placeholders show ST-XX-XXXX: a literal 30 named one trial length, and
-- a member holding ST-60-NCKH should not have to wonder whether that mattered. maxlength stays 14 so the handful
-- of legacy 12-character codes still fit.

-- 2026-09-05, profiles.trial_days was WRITE-ONLY. st_redeem_code has always set it to the code's
-- grant_days, and the app never read it - `trial_days` appeared zero times in app.html, while both
-- the expiry check and the countdown used a hardcoded 14. Every referred member got 14 days while
-- this column recorded 30, from the sign-up box and from Settings alike. The affiliate was
-- credited and the redemption succeeded, so the only symptom was a paywall arriving sixteen days
-- early for the person an affiliate had just recruited.
-- The app now reads it through one trialDays() helper, defaulting to 14 when it is null or 0 -
-- treating 0 as "no limit" would have handed a free forever trial to everybody who never used a
-- code.

-- 2026-09-05, st_referral_totals(): the programme in four numbers - who joined with a code, how
-- many pay, monthly revenue from them, and what is owed to affiliates.
--
-- TWO DIFFERENT WINDOWS, deliberately. Commission runs 12 months from redemption, but a referred
-- member keeps paying after that window closes. So revenue counts every referred member currently
-- subscribed, while owed counts only those still inside 12 months. One window for both would
-- either understate what referrals earned or overstate what is owed - and the second is the
-- expensive mistake. This is why owed is NOT a percentage of revenue and must never be simplified
-- into one.
--
-- Comped members count for neither: they pay nothing, so they are not revenue and not a
-- commission owed against them.
--
-- List prices live in st_referral_totals; commission RATES live in st_commission_estimate, which
-- it calls rather than reimplements. Change prices in the first, rates in the second.

-- 2026-09-05, date ranges. st_admin_access_list(p_from, p_to, p_user) and
-- st_referral_totals(p_from, p_to) filter on st_code_redemptions.redeemed_at - WHEN PEOPLE JOINED.
-- There is no payments table in this database: nothing records what was charged or when, so a
-- range cannot mean "money taken between these dates" and the UI says "joined between". It selects
-- a cohort, not a ledger. Null bounds mean unbounded, so clearing both returns to all time.
-- The end date is inclusive of its whole day ((p_to + 1)::timestamptz), because an exclusive
-- midnight bound silently drops everyone who joined on the last day and always under-reports.
--
-- Both were DROPPED before being recreated with arguments. Adding parameters beside the existing
-- zero-argument versions would have made the bare call ambiguous - the st_gen_code trap again.

-- 2026-09-05, AUDIT FIXES. A 141-agent adversarial review raised 66 findings; 22 survived
-- verification. The money-affecting ones:
--
-- COMMISSION WINDOW HAD NO LOWER BOUND. It read `pay.paid_at < r.redeemed_at + interval '12
-- months'`, which every payment made BEFORE the code was redeemed also satisfies. An existing
-- paying subscriber who later typed an affiliate code retroactively earned that affiliate
-- commission on their whole history. Proved with a four-payment case: GBP 42.00 paid where GBP
-- 21.00 was due. Now bounded at both ends, in all three places that compute it.
--
-- CURRENCIES WERE ADDED TOGETHER. amount_paid is minor units in whatever Stripe charged; summing
-- a EUR row into a GBP total and printing a pound sign is simply a wrong number. Money figures
-- count GBP only, and st_admin_takings returns other_currency so the exclusion is visible.
--
-- GRANTING COMP COULD OVERWRITE A PAYING SUBSCRIBER. The OFF path guarded on plan='comp'; the ON
-- path had no equivalent, so a mistyped address rewrote a live Stripe customer's plan and lost
-- their renewal date. Now refused with 'has_subscription'.
--
-- DELETING A CODE DESTROYED THE COMMISSION RECORD. st_code_redemptions cascaded from st_codes, so
-- the small X on a revoked code deleted every redemption it had - the affiliate's counts and the
-- evidence for money not yet paid. The FK is ON DELETE RESTRICT now and the function refuses with
-- 'has_redemptions'.
--
-- REDEEMING COULD SHORTEN A TRIAL. trial_days was assigned, not maximised, so a code worth fewer
-- days than the default dropped the paywall on somebody mid-trial as a reward for entering a
-- friend's code. greatest(coalesce(trial_days,14), grant_days) now.
--
-- st_ensure_admin_friendship was SECURITY DEFINER, unguarded and executable by ANON - anyone could
-- force an accepted friendship between any two accounts. Revoked from anon and authenticated; its
-- only caller is a SECURITY DEFINER trigger owned by postgres, which is unaffected. Every
-- st_admin_* function also lost its anon grant (each still checks st_is_admin() as well).
--
-- st_admin_relink_payments() repairs payments recorded before their customer was linked to a
-- profile - see st_payments.sql.

-- 2026-09-05, COMPLETENESS-CRITIC FIXES. The gap pass found what the eight dimensions had all
-- taken on trust:
--
-- profiles.email WAS NEVER POPULATED. handle_new_user() inserted only (id), so 15 of 19 accounts
-- had no email - and EVERY admin surface built today finds a member by that column. "Give user
-- full access" would have answered "No account with that email yet" for most real members, and
-- none of them could have been made an affiliate. The four that worked were the ones set by hand,
-- which is exactly why it went unnoticed. Backfilled from auth.users, copied on signup, and kept
-- in step by on_auth_user_email_changed when somebody changes their address.
--
-- st_expire_comps LEFT current_period_end SET, so an expired comp computed days_left = 0 instead
-- of null: the row read "0 days left", as though about to lapse rather than already gone, and
-- carried a Remove access button that could only ever answer 'not_comped'. It clears the date now,
-- and old rows were repaired.
--
-- MONTH BOUNDARIES ARE UK WALL-CLOCK. The database is UTC and the month comes from a London
-- browser, so a bare p_from::timestamptz meant 01:00 UK during BST - a renewal collected at 00:30
-- on the 1st was reported in the previous month, in both directions. st_uk_midnight(date) resolves
-- the bounds in Europe/London, and the month grouping in st_admin_takings does too. Verified:
-- 2026-09-30 23:30Z now counts as October; January (GMT) is unchanged.
