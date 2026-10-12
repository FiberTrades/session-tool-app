-- One timer instead of four, and a short command (12 Oct 2026).
--
-- Supabase counts every log line towards a log-ingestion quota (1 GB a month on the Free plan; the project was at
-- 103%). pg_cron writes two lines to the Postgres log for EVERY run of EVERY job - "cron job N starting: <the whole
-- command>" and "cron job N completed" - so a job that runs each minute writes 2,880 lines a day, and the first of
-- each pair carries the job's full SQL text. Four separate timers (red-news nudges, fast actuals, the welcome email,
-- the calendar sync) would have written about 7,000 lines a day, most of them long.
--
-- st_minute_tick() does the work of all four: it runs once a minute, checks each gate, and posts to the matching
-- edge function only when there is something to do. The job's command is "select public.st_minute_tick()", so each
-- run logs two short lines. Behaviour is unchanged:
--   * nudge-cron    - while a red release is under 61 minutes away, or a red figure is under 12 minutes old
--   * actuals-quick - while a release is due a quick read (st_actuals_due)
--   * welcome-email - on minutes divisible by 5, while someone is due (st_welcome_due)
--   * calendar-sync - at seven minutes past each hour
-- Applied as migration minute_tick.

create or replace function public.st_minute_tick()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  k    text;
  base constant text := 'https://figozyxoyobixadhqewr.supabase.co/functions/v1/';
  hdr  jsonb;
  mi   integer := extract(minute from now())::integer;
begin
  select decrypted_secret into k from vault.decrypted_secrets where name = 'nudge_cron_key';
  hdr := jsonb_build_object('content-type', 'application/json', 'x-cron-key', k);

  -- Each part stands alone: an error in one never stops the others.
  begin
    if exists (select 1 from public.calendar_events
                where lower(impact) = 'high' and coalesce(timed, true)
                  and at > now() and at <= now() + interval '61 minutes')
       or exists (select 1 from public.calendar_events
                   where lower(impact) = 'high' and actual is not null
                     and actual_at > now() - interval '12 minutes' and at > now() - interval '4 hours') then
      perform net.http_post(url := base || 'nudge-cron', headers := hdr, body := '{}'::jsonb, timeout_milliseconds := 90000);
    end if;
  exception when others then raise warning 'st_minute_tick nudge-cron: %', sqlerrm;
  end;

  begin
    if exists (select 1 from public.calendar_events e where public.st_actuals_due(e)) then
      perform net.http_post(url := base || 'actuals-quick', headers := hdr, body := '{}'::jsonb, timeout_milliseconds := 140000);
    end if;
  exception when others then raise warning 'st_minute_tick actuals-quick: %', sqlerrm;
  end;

  begin
    if mi % 5 = 0 and exists (select 1 from public.st_welcome_due()) then
      perform net.http_post(url := base || 'welcome-email', headers := hdr, body := '{}'::jsonb, timeout_milliseconds := 60000);
    end if;
  exception when others then raise warning 'st_minute_tick welcome-email: %', sqlerrm;
  end;

  begin
    if mi = 7 then
      perform net.http_post(url := base || 'calendar-sync', headers := hdr, body := '{}'::jsonb, timeout_milliseconds := 60000);
    end if;
  exception when others then raise warning 'st_minute_tick calendar-sync: %', sqlerrm;
  end;
end
$function$;
revoke all on function public.st_minute_tick() from public, anon, authenticated;

select cron.unschedule('nudge-news-timer');
select cron.unschedule('actuals-quick-timer');
select cron.unschedule('welcome-email-timer');
select cron.unschedule('calendar-sync-timer');
select cron.schedule('st-minute-tick', '* * * * *', 'select public.st_minute_tick()');
