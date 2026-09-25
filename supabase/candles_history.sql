-- Trade Replay deep history (EA 8.7) - what was run on 2026-09-25, kept as a record.
-- Applied through the Supabase MCP; nothing here needs re-running.

-- 1) Duplicates. Older EA builds stored some bars a second off the minute as well as on it
--    (35,018 rows, every one with an on-the-minute twin +-1s; none since early September).
--    ingest-candles now snaps every time to the minute, so they cannot come back.
delete from public.candles o
where o.t % 60 <> 0
  and exists (select 1 from public.candles a
              where a.symbol = o.symbol and a.tf = o.tf and a.t = (round(o.t / 60.0) * 60)::bigint);

-- 2) Winter bars an hour early. Every row had been converted with the SUMMER broker offset (GMT+3),
--    but the broker's server clock follows US daylight saving (the week opens Monday 00:00 server
--    all year), so bars from US standard time were stored an hour early: 528 H4 + 353 D1 rows, all
--    shifted exactly +1h, no collisions. Server time = t + 3h; New York wall time = t - 4h.
update public.candles c
   set t = c.t + 3600
 where extract(epoch from ((to_timestamp(c.t - 4*3600) at time zone 'UTC') at time zone 'America/New_York'))::bigint = c.t + 3600
   and c.tf in (240, 1440);

-- 3) Scroll-left in the replay: the N candles just before a time, oldest first. Count-based, so a
--    weekend or a gap in the stored history never reads as "nothing older". Signed-in only.
create or replace function public.st_candles_before(p_symbol text, p_tf integer, p_before bigint, p_n integer)
returns table(t bigint, o double precision, h double precision, l double precision, c double precision)
language sql stable security definer set search_path to 'public'
as $$
  select x.t, x.o, x.h, x.l, x.c from (
    select cd.t, cd.o, cd.h, cd.l, cd.c from public.candles cd
    where cd.symbol = p_symbol and cd.tf = p_tf and cd.t < p_before
    order by cd.t desc
    limit least(greatest(coalesce(p_n, 1), 1), 1000)
  ) x order by x.t;
$$;
revoke all on function public.st_candles_before(text, integer, bigint, integer) from public, anon;
grant execute on function public.st_candles_before(text, integer, bigint, integer) to authenticated, service_role;
