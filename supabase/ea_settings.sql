-- EA 8.6 (25 Sep 2026). Applied live as migrations live_trades_size_and_risk and ea_settings_and_log;
-- kept here as the record. Everything is written by the live-trade edge function (service role).

-- 1) Size and money at risk on the live "open" event - for the nudge "risk raised after a loss".
--    Nullable: older EAs never send them, and the function only writes them when sent.
alter table public.live_trades
  add column if not exists lots double precision,
  add column if not exists risk double precision;
comment on column public.live_trades.lots is 'Position volume from the EA (8.6+). Null from older EAs.';
comment on column public.live_trades.risk is 'Money lost at the stop, account currency (EA 8.6+); the planned risk until the stop is placed. Null when unknown.';

-- 2) The EA's own settings (Show + nudge): what each EA is set to now, and every change.
create table if not exists public.ea_settings (
  user_id    uuid not null references auth.users(id) on delete cascade,
  login      text not null,                 -- MT5 ACCOUNT_LOGIN
  symbol     text not null default '',      -- the chart the EA runs on
  settings   jsonb not null,
  ea_version text,
  updated_at timestamptz not null default now(),
  primary key (user_id, login, symbol)
);
create table if not exists public.ea_settings_log (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  login      text not null,
  symbol     text not null default '',
  changed_at timestamptz not null default now(),
  changed    text[] not null,               -- the setting keys that changed
  before     jsonb,
  after      jsonb
);
create index if not exists ea_settings_log_user_time on public.ea_settings_log (user_id, changed_at desc);

alter table public.ea_settings     enable row level security;
alter table public.ea_settings_log enable row level security;
drop policy if exists ea_settings_own_read on public.ea_settings;
create policy ea_settings_own_read on public.ea_settings for select to authenticated using (user_id = auth.uid());
drop policy if exists ea_settings_log_own_read on public.ea_settings_log;
create policy ea_settings_log_own_read on public.ea_settings_log for select to authenticated using (user_id = auth.uid());
revoke all on public.ea_settings, public.ea_settings_log from anon;
revoke insert, update, delete, truncate on public.ea_settings, public.ea_settings_log from authenticated;

alter publication supabase_realtime add table public.ea_settings, public.ea_settings_log;
