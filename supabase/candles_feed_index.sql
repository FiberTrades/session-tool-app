-- Applied 3 Nov 2026 (migration candles_feed_readers_use_index).
-- The feed was joined in from a one-row CTE, so the planner could not treat it as a constant: the primary key's order was unusable and
-- every read sorted the feed's rows. st_candle_symbols 9.7 s against the 8 s limit, st_candles_before 755 ms. Now 10 ms and 11 ms, same results.
CREATE OR REPLACE FUNCTION public.st_candle_symbols(p_feed text DEFAULT NULL::text)
 RETURNS TABLE(symbol text, tf smallint, first_t bigint, last_t bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with recursive lp as (
    (select c.symbol, c.tf from public.candles c order by c.symbol, c.tf limit 1)
    union all
    select n.symbol, n.tf from lp p, lateral (select c.symbol, c.tf from public.candles c
      where (c.symbol, c.tf) > (p.symbol, p.tf) order by c.symbol, c.tf limit 1) n
  ),
  fp as (
    (select k.symbol, k.tf from public.candles_feed k where k.feed = coalesce(st_feed_id(p_feed), st_candle_default_feed()) order by k.symbol, k.tf limit 1)
    union all
    select n.symbol, n.tf from fp p, lateral (select k.symbol, k.tf from public.candles_feed k
      where k.feed = coalesce(st_feed_id(p_feed), st_candle_default_feed()) and (k.symbol, k.tf) > (p.symbol, p.tf) order by k.symbol, k.tf limit 1) n
  ),
  pairs as (select symbol, tf from lp union select symbol, tf from fp)
  select p.symbol, p.tf,
    least((select c.t from public.candles c where c.symbol = p.symbol and c.tf = p.tf order by c.t asc limit 1),
          (select k.t from public.candles_feed k where k.feed = coalesce(st_feed_id(p_feed), st_candle_default_feed()) and k.symbol = p.symbol and k.tf = p.tf order by k.t asc limit 1)),
    greatest((select c.t from public.candles c where c.symbol = p.symbol and c.tf = p.tf order by c.t desc limit 1),
             (select k.t from public.candles_feed k where k.feed = coalesce(st_feed_id(p_feed), st_candle_default_feed()) and k.symbol = p.symbol and k.tf = p.tf order by k.t desc limit 1))
  from pairs p;
$function$;

CREATE OR REPLACE FUNCTION public.st_candles_before(p_symbol text, p_tf integer, p_before bigint, p_n integer, p_feed text DEFAULT NULL::text, p_fsym text DEFAULT NULL::text)
 RETURNS TABLE(t bigint, o double precision, h double precision, l double precision, c double precision, v integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with f as (select coalesce(st_feed_id(p_feed), st_candle_default_feed()) id, greatest(3600, p_tf * 60)::bigint b),
  a as materialized (select k.t, k.o, k.h, k.l, k.c, k.v from public.candles_feed k
         where k.feed = coalesce(st_feed_id(p_feed), st_candle_default_feed()) and k.symbol = coalesce(p_fsym, p_symbol) and k.tf = p_tf and k.t < p_before order by k.t desc limit least(greatest(coalesce(p_n, 1), 1), 1000)),
  b as materialized (select k.t, k.o, k.h, k.l, k.c, k.v from public.candles k
         where k.symbol = p_symbol and k.tf = p_tf and k.t < p_before order by k.t desc limit 2 * least(greatest(coalesce(p_n, 1), 1), 1000)),
  bk as materialized (select k.t / f.b n, min(k.t) a, max(k.t) z from public.candles_feed k, f
         where k.feed = coalesce(st_feed_id(p_feed), st_candle_default_feed()) and k.symbol = coalesce(p_fsym, p_symbol) and k.tf = p_tf
           and k.t between ((select min(b.t) from b) / f.b) * f.b and (p_before / f.b + 1) * f.b - 1 group by 1)
  select z.t, z.o, z.h, z.l, z.c, z.v from (
    select * from a
    union all
    select * from b where not exists (select 1 from bk, f where bk.n = b.t / f.b and b.t between bk.a and bk.z)
    order by 1 desc limit least(greatest(coalesce(p_n, 1), 1), 1000)
  ) z order by z.t;
$function$;
