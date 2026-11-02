-- Per-broker candles, Phase 2 (2 Nov 2026): the readers for a feed that is PARTIAL. Migration candles_feed_fallback.
--
-- Until now a read took the legacy candles only before the feed's first bar. A feed does not fill from now backwards alone: one batch of
-- daily bars reaches 12 years back at once (the demo's first batch, AUDUSD D1, 2 Nov), a closed trade's export or a volume ask lands
-- on an older day - and everything between that and the feed's recent weeks read as no candles at all. Now a legacy bar is used wherever the
-- feed has nothing in the same hour (4h and daily: the same bar period), so a chart has no holes while a feed fills, and a quiet minute inside
-- an hour the broker did trade stays that broker's own (no other broker's bar put in it).
--   - With no feed rows in the window the answer is the legacy rows, exactly as before.
--   - p_fsym: what the feed's broker calls the symbol when that differs from the name the legacy series goes by (EURUSD.x against EURUSD).
--
-- st_candle_feeds(): the feeds that hold anything. The app asks for a feed only once it is listed, so until the first bars land it sends
-- the very calls it always sent.

drop function if exists public.st_candles(text, integer, bigint, bigint, text);
create or replace function public.st_candles(p_symbol text, p_tf integer, p_from bigint, p_to bigint, p_feed text default null, p_fsym text default null)
returns table(t bigint, o double precision, h double precision, l double precision, c double precision, v integer)
language sql stable security definer set search_path = public as $$
  with f as (select coalesce(st_feed_id(p_feed), st_candle_default_feed()) id, greatest(3600, p_tf * 60)::bigint b),
  fr as materialized (
    select k.t, k.o, k.h, k.l, k.c, k.v from public.candles_feed k, f
     where k.feed = f.id and k.symbol = coalesce(p_fsym, p_symbol) and k.tf = p_tf
       and k.t between (p_from / f.b) * f.b and (p_to / f.b + 1) * f.b - 1
  ),
  bk as materialized (select distinct fr.t / f.b n from fr, f)
  select fr.t, fr.o, fr.h, fr.l, fr.c, fr.v from fr where fr.t between p_from and p_to
  union all
  select k.t, k.o, k.h, k.l, k.c, k.v from public.candles k, f
   where k.symbol = p_symbol and k.tf = p_tf and k.t between p_from and p_to
     and not exists (select 1 from bk where bk.n = k.t / f.b)
  order by 1;
$$;
grant execute on function public.st_candles(text, integer, bigint, bigint, text, text) to anon, authenticated, service_role;

drop function if exists public.st_candles_before(text, integer, bigint, integer, text);
create or replace function public.st_candles_before(p_symbol text, p_tf integer, p_before bigint, p_n integer, p_feed text default null, p_fsym text default null)
returns table(t bigint, o double precision, h double precision, l double precision, c double precision, v integer)
language sql stable security definer set search_path = public as $$
  with f as (select coalesce(st_feed_id(p_feed), st_candle_default_feed()) id, greatest(3600, p_tf * 60)::bigint b),
  n as (select least(greatest(coalesce(p_n, 1), 1), 1000) n),
  a as materialized (select k.t, k.o, k.h, k.l, k.c, k.v from public.candles_feed k, f, n
         where k.feed = f.id and k.symbol = coalesce(p_fsym, p_symbol) and k.tf = p_tf and k.t < p_before order by k.t desc limit (select n from n)),
  b as materialized (select k.t, k.o, k.h, k.l, k.c, k.v from public.candles k, n
         where k.symbol = p_symbol and k.tf = p_tf and k.t < p_before order by k.t desc limit (select 2 * n from n)),
  bk as materialized (select distinct k.t / f.b n from public.candles_feed k, f
         where k.feed = f.id and k.symbol = coalesce(p_fsym, p_symbol) and k.tf = p_tf
           and k.t between ((select min(b.t) from b) / f.b) * f.b and (p_before / f.b + 1) * f.b - 1)
  select z.t, z.o, z.h, z.l, z.c, z.v from (
    select * from a
    union all
    select * from b where not exists (select 1 from bk, f where bk.n = b.t / f.b)
    order by 1 desc limit (select n from n)
  ) z order by z.t;
$$;
revoke execute on function public.st_candles_before(text, integer, bigint, integer, text, text) from public, anon;
grant execute on function public.st_candles_before(text, integer, bigint, integer, text, text) to authenticated, service_role;

-- the feeds that hold anything (a loose index scan: the table's rows are not read)
create or replace function public.st_candle_feeds()
returns table(feed text)
language sql stable security definer set search_path = public as $$
  with recursive lp as (
    (select k.feed from public.candles_feed k order by k.feed limit 1)
    union all
    select n.feed from lp p, lateral (select k.feed from public.candles_feed k where k.feed > p.feed order by k.feed limit 1) n
  )
  select lp.feed from lp;
$$;
grant execute on function public.st_candle_feeds() to anon, authenticated, service_role;

notify pgrst, 'reload schema';
