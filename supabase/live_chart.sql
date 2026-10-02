-- EA 8.89 (2 Oct 2026): the Session Live chart - the trade's own candles from the member's MT5, with entry / SL / TP and
-- the partial-close and trailing steps drawn at their real prices. Applied as migration live_chart_ea889.

-- Each tick also carries the chart's price (bid), the entry, 1R in price, the digits and the forming 5-minute candle
-- ("t,o,h,l,c", t = UTC seconds).
alter table public.live_trades add column if not exists px double precision;
alter table public.live_trades add column if not exists op double precision;
alter table public.live_trades add column if not exists rpx double precision;
alter table public.live_trades add column if not exists digits integer;
alter table public.live_trades add column if not exists bar text;

-- st_live_tick takes them as optional arguments, so an 8.88 EA (seven arguments) still works.
drop function if exists public.st_live_tick(text, bigint, double precision, double precision, double precision, double precision, text);
create function public.st_live_tick(p_token text, p_ticket bigint, p_r double precision, p_pnl double precision,
                                    p_sl_r double precision, p_tp_r double precision, p_ladder text,
                                    p_px double precision default null, p_op double precision default null,
                                    p_rpx double precision default null, p_digits integer default null, p_bar text default null)
 returns boolean
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare uid uuid;
begin
  if p_token is null or length(p_token) < 8 or p_ticket is null then return false; end if;
  select id into uid from profiles where sync_token = p_token and is_paid = true;
  if uid is null then return false; end if;
  update live_trades
     set r_now = p_r, pnl_now = p_pnl, sl_r = p_sl_r, tp_r = p_tp_r, ladder = left(coalesce(p_ladder, ''), 400), tick_at = now(),
         px = coalesce(p_px, px), op = coalesce(p_op, op), rpx = coalesce(p_rpx, rpx), digits = coalesce(p_digits, digits),
         bar = coalesce(left(p_bar, 120), bar)
   where account = uid and ticket = p_ticket and closed_at is null;
  return found;
end $function$;
revoke all on function public.st_live_tick(text, bigint, double precision, double precision, double precision, double precision, text,
                                           double precision, double precision, double precision, integer, text) from public;
grant execute on function public.st_live_tick(text, bigint, double precision, double precision, double precision, double precision, text,
                                              double precision, double precision, double precision, integer, text) to anon, authenticated, service_role;

-- The candles: the last 150 closed 5-minute candles of a symbol, replaced each time a new one starts while a trade is
-- open on it. One row per member, symbol and timeframe; only the member can read it, only the EA (through
-- st_live_bars) writes it.
create table if not exists public.live_bars (
  account    uuid not null,
  symbol     text not null,
  tf         text not null,
  bars       text not null default '',
  digits     integer,
  updated_at timestamptz not null default now(),
  primary key (account, symbol, tf)
);
alter table public.live_bars enable row level security;
drop policy if exists "live_bars own select" on public.live_bars;
create policy "live_bars own select" on public.live_bars for select using (account = auth.uid());
revoke all on public.live_bars from anon;
revoke all on public.live_bars from authenticated;
grant select on public.live_bars to authenticated;

create or replace function public.st_live_bars(p_token text, p_symbol text, p_tf text, p_bars text, p_digits integer default null)
 returns boolean
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare uid uuid;
begin
  if p_token is null or length(p_token) < 8 or coalesce(p_symbol, '') = '' or p_tf is null or p_bars is null then return false; end if;
  select id into uid from profiles where sync_token = p_token and is_paid = true;
  if uid is null then return false; end if;
  insert into live_bars (account, symbol, tf, bars, digits, updated_at)
  values (uid, left(p_symbol, 32), left(p_tf, 4), left(p_bars, 20000), p_digits, now())
  on conflict (account, symbol, tf) do update set bars = excluded.bars, digits = excluded.digits, updated_at = now();
  return true;
end $function$;
revoke all on function public.st_live_bars(text, text, text, text, integer) from public;
grant execute on function public.st_live_bars(text, text, text, text, integer) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
