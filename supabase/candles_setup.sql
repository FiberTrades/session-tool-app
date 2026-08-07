-- ═══════════════════════════════════════════════════════════════════════════
-- TRADE REPLAY — candle store + on-demand history requests.
-- Run once in the Supabase SQL editor. Feeds the Trade Replay chart from MT5.
--
-- Design: HYBRID loading.
--   1. The EA PRE-FETCHES a generous window per timeframe around each closed
--      trade and upserts it into public.candles (instant replay, works offline).
--   2. When the user scrolls back past that window, the app inserts a row into
--      public.candle_requests; the EA (while running) fulfils it by pulling more
--      history from MT5 and upserting into public.candles ("load more").
--   Candles are keyed by (symbol, tf, t) so they are SHARED across every trade of
--   the same symbol — no per-trade duplication.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Candle store ────────────────────────────────────────────────────────────
create table if not exists public.candles (
  symbol text     not null,
  tf     smallint not null,           -- timeframe in MINUTES: 1,5,15,60,240,1440
  t      bigint   not null,           -- bar OPEN time, unix seconds, UTC
  o double precision not null,
  h double precision not null,
  l double precision not null,
  c double precision not null,
  primary key (symbol, tf, t)         -- also the range-scan index
);

-- Market data is not user-private: any signed-in user may read it.
-- The EA writes with the service-role key, which bypasses RLS.
alter table public.candles enable row level security;
drop policy if exists candles_read on public.candles;
create policy candles_read on public.candles for select to authenticated using (true);

-- Gated range read (what the app calls).
create or replace function public.st_candles(p_symbol text, p_tf int, p_from bigint, p_to bigint)
returns table(t bigint, o double precision, h double precision, l double precision, c double precision)
language sql stable security definer set search_path = public as $$
  select t, o, h, l, c from public.candles
  where symbol = p_symbol and tf = p_tf and t between p_from and p_to
  order by t;
$$;
revoke all     on function public.st_candles(text,int,bigint,bigint) from public;
grant  execute on function public.st_candles(text,int,bigint,bigint) to authenticated;

-- Oldest bar we currently hold for a symbol+tf (so the app knows if "load more"
-- could yield anything and where to ask from).
create or replace function public.st_candles_oldest(p_symbol text, p_tf int)
returns bigint language sql stable security definer set search_path = public as $$
  select min(t) from public.candles where symbol = p_symbol and tf = p_tf;
$$;
revoke all     on function public.st_candles_oldest(text,int) from public;
grant  execute on function public.st_candles_oldest(text,int) to authenticated;

-- ── On-demand history requests (the "load more" channel) ────────────────────
create table if not exists public.candle_requests (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id    uuid,
  symbol     text     not null,
  tf         smallint not null,
  from_t     bigint   not null,       -- inclusive unix-seconds range the app wants
  to_t       bigint   not null,
  status     text     not null default 'pending',   -- pending | done | empty | error
  note       text
);
create index if not exists candle_requests_pending
  on public.candle_requests(status) where status = 'pending';

alter table public.candle_requests enable row level security;
-- A user may create + read their own requests; the EA (service role) sees all.
drop policy if exists candle_req_insert on public.candle_requests;
create policy candle_req_insert on public.candle_requests
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists candle_req_read on public.candle_requests;
create policy candle_req_read on public.candle_requests
  for select to authenticated using (auth.uid() = user_id);
