-- Actuals minutes after the release, and the result nudges (12 Oct 2026).
--
-- Nestor, 11 Oct 2026: "the fetching of the actual column, why dont we change it for when news that expect to have an
-- actual number get release so the actual numbers appear almost instantly?" and "if we can get instant actuals can
-- you build nudges with the results indicating previous, forecast and actual?" ... "yes build both".
--
-- Until now the released figures were only fetched by the Deno worker at fixed hours (09, 11, 13, 15, 16, 18, 21
-- London), so a 13:30 release waited for 15:00. Now:
--   * pg_cron looks every minute for a red or orange release that carries a forecast or a previous, is 3 to 40
--     minutes old and has no figure yet. Only then does it call the actuals-quick function, which asks Claude (web
--     search) for the figure: up to three tries per event, at about +3, +8 and +18 minutes. A quiet minute costs
--     nothing.
--   * The worker's hourly read is unchanged and does not know about the quick figure, so every release still gets
--     its own second, independent read an hour or so later. If the two reads disagree as numbers, the row keeps the
--     later one, remembers the first (actual_prev), and a correction nudge goes out.
--   * nudge-cron announces a red release's figure to the members it concerns (resultsTick in _shared/nudges.ts):
--     the red-news timer below also fires while a figure is less than 12 minutes old.
-- Applied as migration actuals_quick; the two cron jobs as actuals_quick_cron.

alter table public.calendar_events
  add column if not exists actual_at   timestamptz,          -- when the figure landed (or was corrected)
  add column if not exists actual_prev text,                 -- the first read, when a later read gave another number
  add column if not exists actual_src  text,                 -- 'quick' = read minutes after the release
  add column if not exists quick_tries integer not null default 0,
  add column if not exists quick_last  timestamptz;

-- A figure as shown ("0.4%", "195K", "-$73.3B", "1.25M") as a number, to tell a different figure from the same one
-- written another way.
create or replace function public.st_fig_num(t text)
returns numeric
language plpgsql
immutable
as $function$
declare
  s text;
  m text[];
  v numeric;
begin
  if t is null then return null; end if;
  s := replace(replace(lower(trim(t)), ',', ''), '−', '-');
  m := regexp_match(s, '(-?)\s*[$£€¥]?\s*(-?)\s*(\d+(?:\.\d+)?)\s*([kmbt]?)');
  if m is null then return null; end if;
  v := m[3]::numeric;
  v := v * case m[4] when 'k' then 1e3 when 'm' then 1e6 when 'b' then 1e9 when 't' then 1e12 else 1 end;
  if m[1] = '-' or m[2] = '-' then v := -v; end if;
  return v;
end
$function$;

-- A released figure is never wiped by a write that does not carry one; the moment it lands is stamped; and a later
-- read that gives a different NUMBER is kept as a correction, with the first read remembered.
create or replace function public.calendar_events_actual_trg()
returns trigger
language plpgsql
as $function$
begin
  if tg_op = 'UPDATE' then
    if new.actual is null and old.actual is not null then
      new.actual := old.actual;
    elsif new.actual is not null and old.actual is null then
      new.actual_at := now();
    elsif new.actual is not null and old.actual is not null and new.actual is distinct from old.actual
          and public.st_fig_num(new.actual) is distinct from public.st_fig_num(old.actual) then
      new.actual_prev := old.actual;
      new.actual_at := now();
    end if;
  elsif new.actual is not null and new.actual_at is null then
    new.actual_at := now();
  end if;
  return new;
end
$function$;
drop trigger if exists calendar_events_actual on public.calendar_events;
create trigger calendar_events_actual before insert or update on public.calendar_events
  for each row execute function public.calendar_events_actual_trg();

-- Is this release due a quick read right now? Red or orange, timed, carries a forecast or a previous, no figure yet,
-- 3 to 40 minutes old, and its next try is due: the first at +3 minutes, the second at +8, the third at +18.
create or replace function public.st_actuals_due(e public.calendar_events)
returns boolean
language sql
stable
as $function$
  select lower(coalesce(e.impact, '')) in ('high', 'medium')
     and coalesce(e.timed, true)
     and (coalesce(e.forecast, '') ~ '\d' or coalesce(e.previous, '') ~ '\d')
     and e.actual is null
     and e.at >  now() - interval '40 minutes'
     and e.quick_tries < 3
     and e.at <= now() - (array[interval '3 minutes', interval '8 minutes', interval '18 minutes'])[e.quick_tries + 1]
     and (e.quick_last is null or e.quick_last < now() - interval '90 seconds');
$function$;

-- Take what is due, counting the try in the same statement so two calls a minute apart never ask about the same
-- release twice. At most six events a call, red before orange, newest release first.
create or replace function public.st_actuals_take()
returns table(event_date date, at timestamptz, currency text, title text, impact text, forecast text, previous text, tries integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  return query
  with due as (
    select e.event_date, e.currency, e.title
      from public.calendar_events e
     where public.st_actuals_due(e)
     order by (lower(e.impact) = 'high') desc, e.at desc, e.title
     limit 6
       for update skip locked
  ), upd as (
    update public.calendar_events e
       set quick_tries = e.quick_tries + 1, quick_last = now()
      from due d
     where e.event_date = d.event_date and e.currency = d.currency and e.title = d.title
    returning e.event_date, e.at, e.currency, e.title, e.impact, e.forecast, e.previous, e.quick_tries
  )
  select u.event_date, u.at, u.currency, u.title, u.impact, u.forecast, u.previous, u.quick_tries from upd u;
end
$function$;
revoke all on function public.st_actuals_take() from public, anon, authenticated;
revoke all on function public.st_actuals_due(public.calendar_events) from public, anon, authenticated;

-- SUPERSEDED the same day: these timers are no longer separate pg_cron jobs. One job, st-minute-tick, runs
-- public.st_minute_tick() every minute and applies the same conditions - see supabase/minute_tick.sql. (Every run of
-- every pg_cron job writes two lines to the Postgres log, and log volume is metered.) Kept below as the record of
-- what each condition is.
-- ---- the two timers (migration actuals_quick_cron) ----
-- 1. Quick reads: every minute, but the function is only called while something is due.
-- select cron.schedule('actuals-quick-timer', '* * * * *', $job$
--   select net.http_post(
--     url := 'https://figozyxoyobixadhqewr.supabase.co/functions/v1/actuals-quick',
--     headers := jsonb_build_object('content-type', 'application/json',
--                                   'x-cron-key', (select decrypted_secret from vault.decrypted_secrets where name = 'nudge_cron_key')),
--     body := '{}'::jsonb,
--     timeout_milliseconds := 140000)
--   where exists (select 1 from public.calendar_events e where public.st_actuals_due(e));
-- $job$);

-- 2. The red-news timer also runs while a red release's figure is fresh, so nudge-cron can announce it.
-- select cron.schedule('nudge-news-timer', '* * * * *', $job$
--   select net.http_post(
--     url := 'https://figozyxoyobixadhqewr.supabase.co/functions/v1/nudge-cron',
--     headers := jsonb_build_object('content-type', 'application/json',
--                                   'x-cron-key', (select decrypted_secret from vault.decrypted_secrets where name = 'nudge_cron_key')),
--     body := '{}'::jsonb,
--     timeout_milliseconds := 90000)
--   where exists (select 1 from public.calendar_events
--                 where lower(impact) = 'high' and coalesce(timed, true)
--                   and at > now() and at <= now() + interval '61 minutes')
--      or exists (select 1 from public.calendar_events
--                 where lower(impact) = 'high' and actual is not null
--                   and actual_at > now() - interval '12 minutes' and at > now() - interval '4 hours');
-- $job$);
