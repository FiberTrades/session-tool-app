-- Phone nudges + trade alerts (2 Oct 2026). Applied with the Supabase MCP (migrations
-- phone_nudges_and_trade_alerts, live_trades_trade_alerts) and the pg_cron jobs below.
-- Kept here as the record; see supabase/functions/_shared/nudges.ts.

-- The server's own memory of a member's trades (live_trades is cleared by the app).
create table if not exists public.nudge_trades (
  user_id      uuid        not null,
  ticket       bigint      not null,
  login        text,
  symbol       text,
  direction    text,
  opened_at    timestamptz not null default now(),
  risk0        double precision,      -- the first money-at-risk seen (what the trade was taken with)
  risk         double precision,      -- the largest seen
  be_at        timestamptz,           -- EA 8.86 "be" event: the stop reached the entry
  closed_at    timestamptz,
  pnl          double precision,
  close_reason text,                  -- EA 8.86: sl / tp / so / manual / ea / other
  primary key (user_id, ticket)
);
create index if not exists nudge_trades_user_opened on public.nudge_trades (user_id, opened_at);
alter table public.nudge_trades enable row level security;   -- no policies: service role only

-- One row per nudge the server raised: the dedupe, and what became of it (pending / seen / sent / filtered / no-device / failed).
create table if not exists public.nudge_pushes (
  user_id    uuid        not null,
  day        date        not null,   -- UTC day
  key        text        not null,   -- rule:ticket, as the app keys it
  status     text        not null default 'pending',
  created_at timestamptz not null default now(),
  primary key (user_id, day, key)
);
alter table public.nudge_pushes enable row level security;

-- Community -> Notifications: two more switches (push only).
alter table public.notification_prefs add column if not exists nudge boolean default true;
alter table public.notification_prefs add column if not exists trade boolean default true;
-- st_push_targets gained:  when 'nudge' then coalesce(p.nudge, true)  /  when 'trade' then coalesce(p.trade, true)

-- The live feed carries the EA 8.86 fields so the app can show the trade alerts.
alter table public.live_trades add column if not exists login text;
alter table public.live_trades add column if not exists close_reason text;
alter table public.live_trades add column if not exists be_at timestamptz;

create extension if not exists pg_net;

-- The red-news timer: every minute, but only calls the function while a high-impact release is under an hour away.
-- The key lives in the vault as 'nudge_cron_key' and in the function's secrets as NUDGE_CRON_KEY.
select cron.schedule('nudge-news-timer', '* * * * *', $job$
  select net.http_post(
    url := 'https://figozyxoyobixadhqewr.supabase.co/functions/v1/nudge-cron',
    headers := jsonb_build_object('content-type', 'application/json',
                                  'x-cron-key', (select decrypted_secret from vault.decrypted_secrets where name = 'nudge_cron_key')),
    body := '{}'::jsonb,
    timeout_milliseconds := 90000)
  where exists (select 1 from public.calendar_events
                where lower(impact) = 'high' and coalesce(timed, true)
                  and at > now() and at <= now() + interval '61 minutes');
$job$);

-- Housekeeping, nightly.
select cron.schedule('nudge-cleanup', '17 3 * * *', $job$
  delete from public.nudge_pushes where day < current_date - 14;
  delete from public.nudge_trades where (closed_at is not null and closed_at < now() - interval '14 days') or opened_at < now() - interval '90 days';
  delete from public.session_voice_claims where kind like 'seen:%' and day < current_date - 14;
$job$);

-- The app's per-account balance snapshot, for the prop-firm phone nudges (dd_left, target_hit, consistency).
-- snap = { <accountId>: { c: current balance, p: closed-balance peak, n: trading net, f: funded, tk: [recent MT5 tickets] } }
create table if not exists public.account_snapshots (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  snap       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.account_snapshots enable row level security;
create policy "own snapshot read"   on public.account_snapshots for select to authenticated using (user_id = auth.uid());
create policy "own snapshot insert" on public.account_snapshots for insert to authenticated with check (user_id = auth.uid());
create policy "own snapshot update" on public.account_snapshots for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.account_snapshots from anon;

-- EA 8.87 "sl" events: every step the stop moves further into profit (trail alerts).
alter table public.nudge_trades add column if not exists lock_sl double precision;
alter table public.nudge_trades add column if not exists lock_r double precision;
alter table public.nudge_trades add column if not exists lock_money double precision;
alter table public.live_trades add column if not exists lock_r double precision;
alter table public.live_trades add column if not exists lock_money double precision;
alter table public.live_trades add column if not exists lock_at timestamptz;

-- EA 8.87 "partial" events: every partial close (the EA's partial-close ladder, by hand, Risk-off half).
alter table public.live_trades add column if not exists part_at timestamptz;
alter table public.live_trades add column if not exists part_deal bigint;
alter table public.live_trades add column if not exists part_pct double precision;
alter table public.live_trades add column if not exists part_r double precision;
alter table public.live_trades add column if not exists part_pnl double precision;
