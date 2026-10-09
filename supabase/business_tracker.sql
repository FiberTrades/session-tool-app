-- Business tracker (Settings > Business, admin only). 9 Oct 2026.
--
-- 1. st_events + st_track(): visits, plan views, plan clicks and checkout opens, counted WITHOUT cookies.
--    A visitor is md5(day's salt | IP | user agent). The salt is random per UK day and deleted after two days,
--    so an id can never be recomputed or traced back, and the raw IP is never stored. The same person on two
--    days counts as two visitors (same model as Plausible).
-- 2. st_sub_events + a trigger on profiles: a dated history of every plan/status change (subscribed, plan
--    changed, cancel requested/undone, cancelled, payment failed, comp given/removed). Until now only the
--    current state was kept. The trigger sees every writer (Stripe webhook, admin grants) without touching them.
-- 3. profiles.plan_amount / plan_interval / plan_currency: written by stripe-webhook from the subscription's
--    price, so monthly revenue knows monthly from yearly. Added BEFORE the webhook writes them.
-- 4. st_admin_business(from, to): everything the panel shows, in one call. Admin only (st_is_admin).

-- ---------- 1. visits and clicks ----------
create table if not exists public.st_events (
  id        bigserial primary key,
  at        timestamptz not null default now(),
  kind      text not null,          -- visit | plan_view | plan_click | checkout_open
  page      text,                   -- landing | app
  plan      text,                   -- bundle | mentorship | premium
  cycle     text,                   -- monthly | yearly
  source    text,                   -- utm_source, lower case
  medium    text,
  campaign  text,
  ref_host  text,                   -- the referring site's host, when it is not us
  device    text,                   -- phone | computer
  country   text,                   -- 2 letters, from the edge network, when it says
  visitor   text not null,          -- see the note above
  user_id   uuid                    -- auth.uid() when signed in (app checkouts)
);
create index if not exists st_events_at_idx      on public.st_events (at);
create index if not exists st_events_kind_at_idx on public.st_events (kind, at);
create index if not exists st_events_vis_at_idx  on public.st_events (visitor, at);
alter table public.st_events enable row level security;          -- no policies: nobody reads it directly
revoke all on public.st_events from anon, authenticated;

create table if not exists public.st_track_salt (day date primary key, salt text not null);
alter table public.st_track_salt enable row level security;
revoke all on public.st_track_salt from anon, authenticated;

create or replace function public.st_track(
  p_kind text, p_page text default null, p_plan text default null, p_cycle text default null,
  p_source text default null, p_medium text default null, p_campaign text default null,
  p_ref text default null, p_device text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  h json; ip text; ua text; v_salt text; v text; n int; ctry text; d date := (now() at time zone 'Europe/London')::date;
begin
  if p_kind is null or p_kind not in ('visit', 'plan_view', 'plan_click', 'checkout_open') then return; end if;
  begin h := nullif(current_setting('request.headers', true), '')::json; exception when others then h := null; end;
  h := coalesce(h, '{}'::json);
  ip := coalesce(nullif(h->>'cf-connecting-ip', ''), nullif(trim(split_part(coalesce(h->>'x-forwarded-for', ''), ',', 1)), ''), h->>'x-real-ip', '');
  ua := left(coalesce(h->>'user-agent', ''), 300);
  ctry := upper(left(coalesce(h->>'cf-ipcountry', ''), 2));
  insert into public.st_track_salt (day, salt) values (d, md5(random()::text || clock_timestamp()::text))
    on conflict (day) do nothing;
  select salt into v_salt from public.st_track_salt where day = d;
  v := md5(v_salt || '|' || ip || '|' || ua);
  -- flood guard: at most 300 events per visitor id per day
  select count(*) into n from public.st_events where visitor = v and at > now() - interval '1 day';
  if n >= 300 then return; end if;
  insert into public.st_events (kind, page, plan, cycle, source, medium, campaign, ref_host, device, country, visitor, user_id)
  values (p_kind, left(p_page, 20), left(p_plan, 20), left(p_cycle, 10), lower(left(p_source, 40)), lower(left(p_medium, 40)),
          left(p_campaign, 60), lower(left(p_ref, 80)), left(p_device, 10), nullif(nullif(ctry, ''), 'XX'), v, auth.uid());
  delete from public.st_track_salt where day < d - 1;   -- yesterday's salt goes tomorrow: old ids cannot be rebuilt
end $$;
revoke all on function public.st_track(text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.st_track(text, text, text, text, text, text, text, text, text) to anon, authenticated;

-- ---------- 2. subscription history ----------
alter table public.profiles add column if not exists plan_amount   integer;   -- price in pence, before discounts
alter table public.profiles add column if not exists plan_interval text;      -- month | year
alter table public.profiles add column if not exists plan_currency text;

create table if not exists public.st_sub_events (
  id        bigserial primary key,
  at        timestamptz not null default now(),
  user_id   uuid,
  email     text,
  kind      text not null,   -- subscribed | plan_changed | cancel_requested | cancel_undone | cancelled | payment_failed | comp_given | comp_removed
  plan      text,
  old_plan  text,
  amount    integer,
  cycle     text,
  currency  text
);
create index if not exists st_sub_events_at_idx on public.st_sub_events (at);
alter table public.st_sub_events enable row level security;
revoke all on public.st_sub_events from anon, authenticated;

create or replace function public.st_log_sub_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  paid_set text[] := array['premium', 'bundle', 'mentorship'];
  was_paid boolean := coalesce(old.is_paid, false) and old.plan = any(paid_set);
  now_paid boolean := coalesce(new.is_paid, false) and new.plan = any(paid_set);
  ev text[] := array[]::text[];
  k text;
begin
  -- never let the history break the update it is recording: any error here is logged and swallowed.
  -- array_append, not ||: text[] || 'word' parses 'word' as an array literal and fails.
  begin
    if coalesce(old.plan, '') <> 'comp' and new.plan = 'comp' then ev := array_append(ev, 'comp_given'::text); end if;
    if old.plan = 'comp' and coalesce(new.plan, '') <> 'comp' then ev := array_append(ev, 'comp_removed'::text); end if;
    if not was_paid and now_paid then ev := array_append(ev, 'subscribed'::text);
    elsif was_paid and now_paid and old.plan is distinct from new.plan then ev := array_append(ev, 'plan_changed'::text);
    elsif was_paid and not now_paid then ev := array_append(ev, 'cancelled'::text);
    end if;
    if now_paid and coalesce(new.cancel_at_period_end, false) and not coalesce(old.cancel_at_period_end, false) then ev := array_append(ev, 'cancel_requested'::text); end if;
    if now_paid and coalesce(old.cancel_at_period_end, false) and not coalesce(new.cancel_at_period_end, false) then ev := array_append(ev, 'cancel_undone'::text); end if;
    if new.status = 'past_due' and coalesce(old.status, '') <> 'past_due' then ev := array_append(ev, 'payment_failed'::text); end if;
    foreach k in array ev loop
      insert into public.st_sub_events (user_id, email, kind, plan, old_plan, amount, cycle, currency)
      values (new.id, new.email, k, new.plan, old.plan, new.plan_amount, new.plan_interval, new.plan_currency);
    end loop;
  exception when others then
    raise warning 'st_log_sub_change skipped: %', sqlerrm;
  end;
  return new;
end $$;

drop trigger if exists st_profiles_sub_history on public.profiles;
create trigger st_profiles_sub_history
  after update of plan, is_paid, status, cancel_at_period_end on public.profiles
  for each row execute function public.st_log_sub_change();

-- ---------- 4. the panel ----------
-- Where a visit came from: the utm_source tag if the link had one, else the referring site.
create or replace function public.st_source_label(p_source text, p_ref text) returns text
language sql immutable as $$
  select case
    when coalesce(p_source, '') ~ '(^|[^a-z])(ig|insta|instagram)' or coalesce(p_ref, '') like '%instagram.%' then 'Instagram'
    when coalesce(p_source, '') like '%tiktok%' or coalesce(p_ref, '') like '%tiktok.%' then 'TikTok'
    when coalesce(p_source, '') like '%youtu%' or coalesce(p_ref, '') like '%youtu%' then 'YouTube'
    when coalesce(p_source, '') like '%facebook%' or coalesce(p_ref, '') like '%facebook.%' or coalesce(p_ref, '') like 'fb.%' then 'Facebook'
    when coalesce(p_source, '') in ('x', 'twitter') or coalesce(p_ref, '') like '%twitter.%' or coalesce(p_ref, '') in ('t.co', 'x.com') then 'X'
    when coalesce(p_source, '') like '%discord%' or coalesce(p_ref, '') like '%discord%' then 'Discord'
    when coalesce(p_ref, '') like '%google.%' then 'Google'
    when coalesce(p_ref, '') like '%bing.%' or coalesce(p_ref, '') like '%duckduckgo.%' then 'Other search'
    when coalesce(p_source, '') <> '' then initcap(p_source)
    when coalesce(p_ref, '') <> '' then p_ref
    else 'Direct'
  end
$$;

create or replace function public.st_admin_business(p_from date default null, p_to date default null)
returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare
  v_lo timestamptz; v_hi timestamptz; v_plo timestamptz; v_phi timestamptz;
  paid_set text[] := array['premium', 'bundle', 'mentorship'];
  res jsonb := '{}'::jsonb;
begin
  if not public.st_is_admin() then raise exception 'not authorised'; end if;
  v_lo := case when p_from is null then '2000-01-01'::timestamptz else public.st_uk_midnight(p_from) end;
  v_hi := case when p_to is null then now() + interval '1 day' else public.st_uk_midnight(p_to + 1) end;
  -- the same length of time just before, for the "vs previous" numbers
  v_phi := v_lo; v_plo := v_lo - (v_hi - v_lo);

  res := res || jsonb_build_object(
    'counting_since', (select min(at) from public.st_events),
    'visitors',      (select count(distinct (visitor, (at at time zone 'Europe/London')::date)) from public.st_events where kind = 'visit' and at >= v_lo and at < v_hi),
    'visitors_prev', (select count(distinct (visitor, (at at time zone 'Europe/London')::date)) from public.st_events where kind = 'visit' and at >= v_plo and at < v_phi),
    'plan_views',    (select count(distinct (visitor, (at at time zone 'Europe/London')::date)) from public.st_events where kind = 'plan_view' and at >= v_lo and at < v_hi),
    'plan_clicks',   (select count(distinct (visitor, plan, (at at time zone 'Europe/London')::date)) from public.st_events where kind = 'plan_click' and at >= v_lo and at < v_hi),
    'plan_clicks_by', (select coalesce(jsonb_object_agg(pl, n), '{}'::jsonb) from (
                        select coalesce(plan, 'other') pl, count(distinct (visitor, (at at time zone 'Europe/London')::date)) n
                          from public.st_events where kind = 'plan_click' and at >= v_lo and at < v_hi group by 1) x),
    'checkouts',     (select count(distinct (coalesce(user_id::text, visitor), plan, (at at time zone 'Europe/London')::date)) from public.st_events where kind = 'checkout_open' and at >= v_lo and at < v_hi),
    'signups',       (select count(*) from public.profiles where created_at >= v_lo and created_at < v_hi),
    'signups_prev',  (select count(*) from public.profiles where created_at >= v_plo and created_at < v_phi),
    'new_subs',      (select count(*) from public.st_sub_events where kind = 'subscribed' and at >= v_lo and at < v_hi),
    'cancelled',     (select count(*) from public.st_sub_events where kind = 'cancelled' and at >= v_lo and at < v_hi),
    'payment_failed',(select count(*) from public.st_sub_events where kind = 'payment_failed' and at >= v_lo and at < v_hi),
    'history_since', (select min(at) from public.st_sub_events)
  );

  -- right now (not affected by the date range)
  res := res || jsonb_build_object(
    'paying',        (select count(*) from public.profiles where coalesce(is_paid, false) and plan = any(paid_set)),
    'paying_by',     (select coalesce(jsonb_object_agg(pl, n), '{}'::jsonb) from (
                        select plan pl, count(*) n from public.profiles where coalesce(is_paid, false) and plan = any(paid_set) group by plan) x),
    'comp',          (select count(*) from public.profiles where plan = 'comp'),
    'set_to_cancel', (select count(*) from public.profiles where coalesce(is_paid, false) and plan = any(paid_set) and coalesce(cancel_at_period_end, false)),
    -- monthly revenue: each paying member's price as a monthly figure (yearly / 12), list price when Stripe has not told us yet
    'mrr_pence',     (select coalesce(round(sum(
                         case when plan_amount is not null then plan_amount::numeric / case when plan_interval = 'year' then 12 else 1 end
                              when plan = 'mentorship' then 29900 when plan = 'bundle' then 3500 when plan = 'premium' then 2000 else 0 end)), 0)
                        from public.profiles where coalesce(is_paid, false) and plan = any(paid_set)),
    'mrr_estimated', (select count(*) from public.profiles where coalesce(is_paid, false) and plan = any(paid_set) and plan_amount is null),
    'trials',        (select count(*) from public.profiles
                       where not coalesce(is_paid, false) and coalesce(plan, '') <> 'comp'
                         and created_at + make_interval(days => coalesce(trial_days, 14)) > now()),
    'trials_ending_week', (select count(*) from public.profiles
                       where not coalesce(is_paid, false) and coalesce(plan, '') <> 'comp'
                         and created_at + make_interval(days => coalesce(trial_days, 14)) > now()
                         and created_at + make_interval(days => coalesce(trial_days, 14)) <= now() + interval '7 days'),
    'members',       (select count(*) from public.profiles)
  );

  -- per UK day, for the chart (last 90 days at most)
  res := res || jsonb_build_object('days', (
    select coalesce(jsonb_agg(jsonb_build_object('d', dd, 'v', vv, 's', ss) order by dd), '[]'::jsonb) from (
      select g::date dd,
             (select count(distinct visitor) from public.st_events e where e.kind = 'visit' and (e.at at time zone 'Europe/London')::date = g::date) vv,
             (select count(*) from public.profiles p where (p.created_at at time zone 'Europe/London')::date = g::date) ss
        from generate_series(greatest((v_lo at time zone 'Europe/London')::date, (now() at time zone 'Europe/London')::date - 89),
                             least((v_hi at time zone 'Europe/London')::date - 1, (now() at time zone 'Europe/London')::date), interval '1 day') g
    ) x));

  res := res || jsonb_build_object(
    'sources', (select coalesce(jsonb_agg(jsonb_build_object('k', kk, 'n', n) order by n desc), '[]'::jsonb) from (
                 select public.st_source_label(source, ref_host) kk, count(distinct (visitor, (at at time zone 'Europe/London')::date)) n
                   from public.st_events where kind = 'visit' and at >= v_lo and at < v_hi group by 1 order by 2 desc limit 8) x),
    'devices', (select coalesce(jsonb_object_agg(kk, n), '{}'::jsonb) from (
                 select coalesce(device, 'unknown') kk, count(distinct (visitor, (at at time zone 'Europe/London')::date)) n
                   from public.st_events where kind = 'visit' and at >= v_lo and at < v_hi group by 1) x),
    'countries', (select coalesce(jsonb_agg(jsonb_build_object('k', kk, 'n', n) order by n desc), '[]'::jsonb) from (
                 select country kk, count(distinct (visitor, (at at time zone 'Europe/London')::date)) n
                   from public.st_events where kind = 'visit' and country is not null and at >= v_lo and at < v_hi group by 1 order by 2 desc limit 5) x)
  );

  -- the latest changes: sign-ups, subscription events, and trials about to end
  res := res || jsonb_build_object('latest', (
    select coalesce(jsonb_agg(to_jsonb(y) order by y.at desc), '[]'::jsonb) from (
      select * from (
        (select created_at as at, email, 'signed_up'::text as kind, null::text as plan, null::text as old_plan, null::int as amount, null::text as cycle from public.profiles
          where created_at >= v_lo and created_at < v_hi order by created_at desc limit 25)
        union all
        (select e.at, e.email, e.kind, e.plan, e.old_plan, e.amount, e.cycle from public.st_sub_events e where e.at >= v_lo and e.at < v_hi order by e.at desc limit 25)
        union all
        (select p.created_at + make_interval(days => coalesce(p.trial_days, 14)), p.email, 'trial_ends'::text, null::text, null::text, null::int, null::text from public.profiles p
          where not coalesce(p.is_paid, false) and coalesce(p.plan, '') <> 'comp'
            and p.created_at + make_interval(days => coalesce(p.trial_days, 14)) > now()
            and p.created_at + make_interval(days => coalesce(p.trial_days, 14)) <= now() + interval '7 days')
      ) u order by u.at desc limit 30) y));
  return res;
end $$;
revoke all on function public.st_admin_business(date, date) from public, anon;
grant execute on function public.st_admin_business(date, date) to authenticated;
