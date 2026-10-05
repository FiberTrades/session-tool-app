-- Live chart spread (EA 8.90, 5 Oct 2026, Nestor: "add the spread now too").
-- Additive and safe while EAs are ticking:
--   * live_trades.spread - the broker spread (ask - bid, in price), null until an 8.90 EA sends it.
--   * a SECOND st_live_tick that also takes p_spread. It is REQUIRED (no default), so PostgREST never sees two candidates:
--     an 8.89 EA posts 12 named arguments and keeps getting the original function; 8.90 posts 13 and gets this one.
--     The original function is left exactly as it is.
alter table public.live_trades add column if not exists spread double precision;

create or replace function public.st_live_tick(p_token text, p_ticket bigint, p_r double precision, p_pnl double precision,
  p_sl_r double precision, p_tp_r double precision, p_ladder text, p_px double precision, p_op double precision,
  p_rpx double precision, p_digits integer, p_bar text, p_spread double precision)
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
         bar = coalesce(left(p_bar, 120), bar), spread = coalesce(p_spread, spread)
   where account = uid and ticket = p_ticket and closed_at is null;
  return found;
end $function$;

revoke all on function public.st_live_tick(text, bigint, double precision, double precision, double precision, double precision, text,
  double precision, double precision, double precision, integer, text, double precision) from public;
grant execute on function public.st_live_tick(text, bigint, double precision, double precision, double precision, double precision, text,
  double precision, double precision, double precision, integer, text, double precision) to anon, authenticated, service_role;
