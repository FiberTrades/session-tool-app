-- Trade Replay's volume profile (17 Oct 2026): the older candles fetched when the chart is scrolled left carry their tick
-- volume too (candles.v, sent by EA 9.00+). Same body as candles_history.sql plus v; a new column in the returned table needs
-- the function dropped and created again, in one transaction, with the same grants.
begin;
drop function if exists public.st_candles_before(text, integer, bigint, integer);
create function public.st_candles_before(p_symbol text, p_tf integer, p_before bigint, p_n integer)
returns table(t bigint, o double precision, h double precision, l double precision, c double precision, v integer)
language sql stable security definer set search_path to 'public'
as $$
  select x.t, x.o, x.h, x.l, x.c, x.v from (
    select cd.t, cd.o, cd.h, cd.l, cd.c, cd.v from public.candles cd
    where cd.symbol = p_symbol and cd.tf = p_tf and cd.t < p_before
    order by cd.t desc
    limit least(greatest(coalesce(p_n, 1), 1), 1000)
  ) x order by x.t;
$$;
revoke all on function public.st_candles_before(text, integer, bigint, integer) from public, anon;
grant execute on function public.st_candles_before(text, integer, bigint, integer) to authenticated, service_role;
commit;
