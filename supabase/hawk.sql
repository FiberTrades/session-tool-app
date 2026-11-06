-- The hawk (5 Nov 2026): live ST Method setup alerts for the admin only.
-- Nestor: "build like a hawk to watch the market live and send me nudges when the perfect conditions to enter a trade present
-- themselves and that way i can give you feedback and you can learn from my judgment" - "keep this exclusively for me the admin".
--
-- cloud/hawk/hawk.py (uk1) reads the demo MT5's EURUSD candles over the local relay, runs the tested rules (cloud/hawk/engine.py)
-- every minute of the London window and posts each alert to the st-hawk edge function, which stores it here and pushes it to the
-- admin's phone. hawk.html lists them with Good call / Not my trade so the rules can be tuned to his judgement.
-- Applied as migration hawk_signals.

create table if not exists public.hawk_signals (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  day         date not null,                -- London date of the session
  key         text not null,                -- dedupe, e.g. "sweep:s:1793908680"
  kind        text not null,                -- brief | sweep | pocket | setup | initiation | done
  symbol      text not null default 'EURUSD',
  side        smallint,                     -- 1 buy, -1 sell, null for a brief
  title       text not null,
  body        text not null,
  data        jsonb not null default '{}'::jsonb,   -- levels, phase, location, model, the bar it fired on
  push        text,                         -- sent | filtered | no-device | failed
  feedback    text check (feedback in ('good', 'bad', 'late', 'early')),
  note        text,
  feedback_at timestamptz,
  unique (day, key)
);
create index if not exists hawk_signals_created on public.hawk_signals (created_at desc);

alter table public.hawk_signals enable row level security;
drop policy if exists hawk_admin_read on public.hawk_signals;
create policy hawk_admin_read on public.hawk_signals for select to authenticated using (public.st_is_admin());
drop policy if exists hawk_admin_feedback on public.hawk_signals;
create policy hawk_admin_feedback on public.hawk_signals for update to authenticated using (public.st_is_admin()) with check (public.st_is_admin());
revoke all on public.hawk_signals from anon;
revoke all on public.hawk_signals from authenticated;
grant select, update (feedback, note, feedback_at) on public.hawk_signals to authenticated;

-- 6 Nov: his own read, drawn on the alert's chart in hawk.html (migration hawk_signals_mine).
alter table public.hawk_signals add column if not exists mine jsonb;   -- {phase, bh, bl} for a brief, {entry, stop, tgt} for a setup
grant update (mine) on public.hawk_signals to authenticated;

-- The admin's user id, for the edge function's push (service role only).
create or replace function public.st_admin_uid()
returns uuid language sql stable security definer set search_path to 'public', 'auth'
as $$ select id from auth.users where lower(email) = 'be.o2@hotmail.com' limit 1 $$;
revoke all on function public.st_admin_uid() from public, anon, authenticated;
grant execute on function public.st_admin_uid() to service_role;

-- The study (6 Nov 2026, admin only): the 1-year rule test's trades (stop 2-4 pips, target 20; run 'strict_20'), one row each with
-- what Replay draws (data: entry/stop/tgt/be, range bh/bl, the level taken a/ta, entry ts, exit xts, note). Loaded from the
-- scratchpad study (bt/export_study.py). Nestor marks each Valid / Not valid / Unsure with a note from the hawk panel's Study tab.
create table if not exists public.hawk_study (
  run text not null default 'strict_20',
  n int not null,
  day date not null,
  data jsonb not null,
  verdict text check (verdict in ('agree','disagree','unsure')),
  note text,
  verdict_at timestamptz,
  primary key (run, n)
);
alter table public.hawk_study enable row level security;
revoke all on public.hawk_study from anon, authenticated;
grant select on public.hawk_study to authenticated;
grant update (verdict, note, verdict_at) on public.hawk_study to authenticated;
drop policy if exists hawk_study_admin_read on public.hawk_study;
create policy hawk_study_admin_read on public.hawk_study for select to authenticated using (public.st_is_admin());
drop policy if exists hawk_study_admin_mark on public.hawk_study;
create policy hawk_study_admin_mark on public.hawk_study for update to authenticated using (public.st_is_admin()) with check (public.st_is_admin());
-- his own drawings on a study trade (Replay), saved from the Study tab (6 Nov 2026)
alter table public.hawk_study add column if not exists drawings jsonb, add column if not exists drawings_at timestamptz;
grant update (drawings, drawings_at) on public.hawk_study to authenticated;
-- the "what if" tester (6 Nov 2026, admin only): every candidate setup per day + that day's 1m path from the first
-- candidate to 20:00 London, as ints (price*1e5; bars [londonMin,o,h,l,c] relative to d.b; c = [i,side,entry,stop,tgt,be,
-- stopbar,model,cont]). hawk.js re-runs his rules on it with another stop / target / BE / exit. Loaded by bt/whatif_sql.py.
create table if not exists public.hawk_study_days (
  run text not null default 'strict_20', day date not null, d jsonb not null, primary key (run, day));
alter table public.hawk_study_days enable row level security;
revoke all on public.hawk_study_days from anon, authenticated;
grant select on public.hawk_study_days to authenticated;
drop policy if exists hawk_study_days_admin_read on public.hawk_study_days;
create policy hawk_study_days_admin_read on public.hawk_study_days for select to authenticated using (public.st_is_admin());
-- where HE would move to break-even on each study trade ({price} or {none:true}), set from the Study tab (6 Nov 2026)
alter table public.hawk_study add column if not exists be_mine jsonb;
grant update (be_mine) on public.hawk_study to authenticated;

-- The hawk's account + market (6 Nov 2026: "inside the hawk tab i need to be able to select what account and market/symbol i want the
-- hawk be reading price from"). One row; hawk.py reads it through st-hawk {config:true} once a minute. Migration hawk_config.
create table if not exists public.hawk_config (
  id smallint primary key default 1 check (id = 1),
  login text not null default '1515070952' check (login ~ '^[0-9]{3,15}$'),
  sym text not null default 'EURUSD' check (sym in ('EURUSD','GBPUSD','XAUUSD','US100')),
  updated_at timestamptz not null default now()
);
insert into public.hawk_config (id) values (1) on conflict (id) do nothing;
alter table public.hawk_config enable row level security;
drop policy if exists hawk_cfg_read on public.hawk_config;
create policy hawk_cfg_read on public.hawk_config for select to authenticated using (public.st_is_admin());
drop policy if exists hawk_cfg_write on public.hawk_config;
create policy hawk_cfg_write on public.hawk_config for update to authenticated using (public.st_is_admin()) with check (public.st_is_admin());
revoke all on public.hawk_config from anon;
revoke all on public.hawk_config from authenticated;
grant select, update (login, sym, updated_at) on public.hawk_config to authenticated;
