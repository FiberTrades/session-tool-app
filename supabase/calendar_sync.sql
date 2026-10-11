-- calendar_events kept in step with the calendar feed, every hour (12 Oct 2026).
--
-- calendar_events is what the red-news phone warnings, the fast actuals and the result nudges read. Its only writer
-- was the Deno worker, on its weekday runs from 09:00 London - so a new week's events were not in the table until
-- Monday 09:00, and anything released before then (a Monday 07:00 UK figure, Sunday night's Asian releases) got no
-- phone warning, no fast figure and no result nudge. Nestor: "cant you fix this?"
--
-- The calendar-sync function (supabase/functions/calendar-sync) reads the same feed and writes the same rows, parsed
-- exactly as the worker parses them, without the actual column. It also keeps a week the worker cannot store: when
-- the feed has the same title twice on one Eastern date the worker's single batch is refused as a whole (the key is
-- event_date, currency, title); calendar-sync gives the later one another date key, so both are kept.
-- Applied as migration calendar_sync_cron.
select cron.schedule('calendar-sync-timer', '7 * * * *', $job$
  select net.http_post(
    url := 'https://figozyxoyobixadhqewr.supabase.co/functions/v1/calendar-sync',
    headers := jsonb_build_object('content-type', 'application/json',
                                  'x-cron-key', (select decrypted_secret from vault.decrypted_secrets where name = 'nudge_cron_key')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000);
$job$);
