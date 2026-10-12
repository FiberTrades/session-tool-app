-- Repo mirror (DB functions do not deploy via git: applied by migration live_feed_open_to_trial, 12 Oct 2026).
--
-- The live feed is part of the free trial. Nestor, 12 Oct 2026, asked whether the trial should get live trade cards and
-- live nudges, which the adverts show under "Free for fourteen days": "yes to 3, give free trial access too".
--
-- Three doors carried `is_paid = true`: the live-trade edge function (trade opened / closed / break-even / settings),
-- st_live_tick (the running R, P&L and price, every couple of seconds) and st_live_bars (the candles of the live chart).
-- The trade sync next door (ingest-trade) already let a trial account in, so a trial member's closed trades arrived
-- but a live card never did.
--
-- One rule for all of them, the same as the app's trialExpired(): paid on any tier, or inside trial_days (14 unless
-- set) of created_at; a missing signup date fails OPEN (a malformed profile is a data problem, not a freeloader).
-- st_sync_account is not callable through the API: it takes the member's secret token and only the functions below
-- (which the EA already calls with that token) use it.
create or replace function public.st_sync_account(p_token text)
 returns uuid
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select p.id
    from profiles p
   where p.sync_token = p_token
     and (p.is_paid = true
          or p.created_at is null
          or now() < p.created_at + make_interval(days => coalesce(nullif(p.trial_days, 0), 14)))
   limit 1
$function$;
revoke all on function public.st_sync_account(text) from public, anon, authenticated;

create or replace function public.st_live_bars(p_token text, p_symbol text, p_tf text, p_bars text, p_digits integer default null::integer)
 returns boolean
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare uid uuid;
begin
  if p_token is null or length(p_token) < 8 or coalesce(p_symbol, '') = '' or p_tf is null or p_bars is null then return false; end if;
  uid := st_sync_account(p_token);
  if uid is null then return false; end if;
  insert into live_bars (account, symbol, tf, bars, digits, updated_at)
  values (uid, left(p_symbol, 32), left(p_tf, 4), left(p_bars, 20000), p_digits, now())
  on conflict (account, symbol, tf) do update set bars = excluded.bars, digits = excluded.digits, updated_at = now();
  return true;
end $function$;

create or replace function public.st_live_tick(p_token text, p_ticket bigint, p_r double precision, p_pnl double precision, p_sl_r double precision, p_tp_r double precision, p_ladder text, p_px double precision, p_op double precision, p_rpx double precision, p_digits integer, p_bar text, p_spread double precision)
 returns boolean
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare uid uuid;
begin
  if p_token is null or length(p_token) < 8 or p_ticket is null then return false; end if;
  uid := st_sync_account(p_token);
  if uid is null then return false; end if;
  update live_trades
     set r_now = p_r, pnl_now = p_pnl, sl_r = p_sl_r, tp_r = p_tp_r, ladder = left(coalesce(p_ladder, ''), 400), tick_at = now(),
         px = coalesce(p_px, px), op = coalesce(p_op, op), rpx = coalesce(p_rpx, rpx), digits = coalesce(p_digits, digits),
         bar = coalesce(left(p_bar, 120), bar), spread = coalesce(p_spread, spread)
   where account = uid and ticket = p_ticket and closed_at is null;
  return found;
end $function$;

create or replace function public.st_live_tick(p_token text, p_ticket bigint, p_r double precision, p_pnl double precision, p_sl_r double precision, p_tp_r double precision, p_ladder text, p_px double precision default null::double precision, p_op double precision default null::double precision, p_rpx double precision default null::double precision, p_digits integer default null::integer, p_bar text default null::text)
 returns boolean
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare uid uuid;
begin
  if p_token is null or length(p_token) < 8 or p_ticket is null then return false; end if;
  uid := st_sync_account(p_token);
  if uid is null then return false; end if;
  update live_trades
     set r_now = p_r, pnl_now = p_pnl, sl_r = p_sl_r, tp_r = p_tp_r, ladder = left(coalesce(p_ladder, ''), 400), tick_at = now(),
         px = coalesce(p_px, px), op = coalesce(p_op, op), rpx = coalesce(p_rpx, rpx), digits = coalesce(p_digits, digits),
         bar = coalesce(left(p_bar, 120), bar)
   where account = uid and ticket = p_ticket and closed_at is null;
  return found;
end $function$;
