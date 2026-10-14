-- Practice Replay across devices (14 Oct 2026). Nestor: "yes make them sync between devices".
-- Repo mirror; applied with `supabase db query --linked -f supabase/practice.sql` (DB changes do not deploy via git).
--
-- practice_trades: one row per finished practice trade. client_id is made in the browser when the trade closes, so a
-- trade that was saved offline and uploaded later (or uploaded twice) lands once: unique (user_id, client_id), inserted
-- with ON CONFLICT DO NOTHING.
-- practice_settings: the practice copy of the EA panel (risk, stops, TP, BE, ladders, the practice balance's start and
-- reset time). The balance itself is never stored: it is the start plus the money of the trades taken since the reset,
-- so two devices can never disagree about it.
-- Own rows only. Nothing here is read by the journal, Statistics, the leaderboard or anything else.

create table if not exists public.practice_trades (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id  text not null check (length(client_id) between 6 and 64),
  sym        text not null check (length(sym) <= 32),
  day        date not null,
  tf         smallint not null,
  dir        smallint not null check (dir in (-1, 1)),
  entry      double precision,
  entry_ts   bigint,
  exit_ts    bigint,
  r          double precision not null,
  money      double precision,
  why        text check (why is null or length(why) <= 16),
  mae        double precision,
  parts      smallint,
  taken_at   timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, client_id)
);
create index if not exists practice_trades_user_taken on public.practice_trades (user_id, taken_at desc);

create table if not exists public.practice_settings (
  user_id    uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  cfg        jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.practice_trades   enable row level security;
alter table public.practice_settings enable row level security;

drop policy if exists practice_trades_own_read   on public.practice_trades;
drop policy if exists practice_trades_own_insert on public.practice_trades;
create policy practice_trades_own_read   on public.practice_trades for select to authenticated using (user_id = auth.uid());
create policy practice_trades_own_insert on public.practice_trades for insert to authenticated with check (user_id = auth.uid());

drop policy if exists practice_settings_own_read   on public.practice_settings;
drop policy if exists practice_settings_own_insert on public.practice_settings;
drop policy if exists practice_settings_own_update on public.practice_settings;
create policy practice_settings_own_read   on public.practice_settings for select to authenticated using (user_id = auth.uid());
create policy practice_settings_own_insert on public.practice_settings for insert to authenticated with check (user_id = auth.uid());
create policy practice_settings_own_update on public.practice_settings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.practice_trades, public.practice_settings from anon;
revoke update, delete, truncate on public.practice_trades from authenticated;
revoke delete, truncate on public.practice_settings from authenticated;
grant select, insert on public.practice_trades to authenticated;
grant select, insert, update on public.practice_settings to authenticated;
