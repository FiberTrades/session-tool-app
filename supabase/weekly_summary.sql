-- The assistant's weekly summary (24 Oct 2026). Applied as migration weekly_summary; kept here as the record.
-- weekly-summary (edge function) writes one row per member and week; the app shows the newest unread one on Session Bias
-- until the member presses Got it (read_at). Members read their own rows and may only set read_at.

create table if not exists public.weekly_summaries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  week_key    text not null,                 -- the week's Monday, YYYY-MM-DD, in the member's time zone
  lang        text not null default 'en',
  body        text not null,
  facts       jsonb,
  model       text,
  pushed      text,                          -- sendPush's answer: sent / filtered / no-device / failed
  created_at  timestamptz not null default now(),
  read_at     timestamptz,
  unique (user_id, week_key)
);
alter table public.weekly_summaries enable row level security;
drop policy if exists "weekly summaries: own rows" on public.weekly_summaries;
create policy "weekly summaries: own rows" on public.weekly_summaries for select to authenticated using (auth.uid() = user_id);
drop policy if exists "weekly summaries: mark own read" on public.weekly_summaries;
create policy "weekly summaries: mark own read" on public.weekly_summaries for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
revoke all on public.weekly_summaries from anon, authenticated;
grant select on public.weekly_summaries to authenticated;
grant update (read_at) on public.weekly_summaries to authenticated;

-- Sundays 18:00 London: the job runs at :02 and :32 of 17 and 18 UTC (BST and GMT both covered) and this calls the function
-- only when it is 18:xx on a Sunday in London. The :32 run picks up anyone the first one missed (one row per member and week).
create or replace function public.st_weekly_summary_tick() returns void
language plpgsql security definer set search_path = public as $$
declare
  k text;
  l timestamp := now() at time zone 'Europe/London';
begin
  if extract(dow from l) <> 0 or extract(hour from l) <> 18 then return; end if;
  select decrypted_secret into k from vault.decrypted_secrets where name = 'nudge_cron_key';
  perform net.http_post(url := 'https://figozyxoyobixadhqewr.supabase.co/functions/v1/weekly-summary',
                        headers := jsonb_build_object('content-type', 'application/json', 'x-cron-key', k),
                        body := '{}'::jsonb, timeout_milliseconds := 140000);
end
$$;
revoke all on function public.st_weekly_summary_tick() from public, anon, authenticated;
select cron.schedule('st-weekly-summary', '2,32 17,18 * * 0', 'select public.st_weekly_summary_tick()');
