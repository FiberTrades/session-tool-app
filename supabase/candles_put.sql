-- Candles written only when they change something (29 Oct 2026).
--
-- The database ran out of its disk IO budget twice on 29 Oct (07:45-08:30 and from 16:00 UTC). ingest-candles posted every batch
-- with "resolution=merge-duplicates" - ON CONFLICT DO UPDATE on every bar - so a bar already stored was written again each time
-- any MT5 sent it: a new row version, the primary key touched, WAL with a full-page image for each page's first change after a
-- checkpoint, and the checkpoint writing the page back. Candle upserts were 14.7 GB of WAL since June (~95% of recent writes);
-- 12:00-16:00 UTC on 29 Oct the cloud MT5s sent ~2.5M bars an hour, checkpoints wrote up to 13,883 buffers (~108 MB) every
-- 5 minutes, and writers queued on each other's row locks.
--
-- Now a bar is written when
--   - it is new;
--   - it brings the tick volume a stored bar lacks (EA 9.00+; the volume profile);
--   - it is recent - opened within max(2 bars, 3 hours) - and its values changed: the newest bars may have been sent unfinished;
-- Otherwise a closed bar already stored keeps its prices and its volume: the first MT5 to send it wins (before, the last one did).
-- (A rule widening an older bar's high/low to the incoming range ran from 18:59 to ~20:00 UTC on 29 Oct and was taken out: the
-- table is shared across brokers, and it mixed another broker's highs and lows into stored wicks. Migration candles_put_no_widen.)
-- Rows that change nothing are filtered out BEFORE the insert, so they are not even locked: ON CONFLICT DO UPDATE ... WHERE false
-- still locks (and so writes) the row it skips.
--
-- p_rows: [[t, o, h, l, c, v?], ...]; t in unix SECONDS (snapped to the minute by ingest-candles, like candles.t), p_tf in MINUTES.
-- A t given twice keeps its last bar (ingest-candles already dedupes; this keeps the insert from failing if anything else doesn't).
-- Returns the bars written.

create or replace function public.st_candles_put(p_symbol text, p_tf integer, p_rows jsonb)
returns integer
language sql
security definer
set search_path = public
as $$
  with x as (
    select distinct on (t) t, o, h, l, c, v from (
      select (e->>0)::bigint t, (e->>1)::float8 o, (e->>2)::float8 h, (e->>3)::float8 l, (e->>4)::float8 c,
             case when jsonb_array_length(e) > 5 and jsonb_typeof(e->5) = 'number' then (e->>5)::int end v, i
      from jsonb_array_elements(p_rows) with ordinality a(e, i)
    ) r order by t, i desc
  ),
  cut as (select extract(epoch from now())::bigint - greatest(2 * p_tf * 60, 3 * 3600) t),
  todo as (
    select x.* from x cross join cut
    left join public.candles k on k.symbol = p_symbol and k.tf = p_tf and k.t = x.t
    where k.t is null                                                              -- new
       or (k.v is null and x.v is not null)                                        -- its volume arrives
       or (x.t >= cut.t and ((k.o, k.h, k.l, k.c) is distinct from (x.o, x.h, x.l, x.c)
                             or (x.v is not null and k.v is distinct from x.v)))     -- a recent bar that changed
  ),
  w as (
    insert into public.candles as k (symbol, tf, t, o, h, l, c, v)
    select p_symbol, p_tf::smallint, t, o, h, l, c, v from todo
    on conflict (symbol, tf, t) do update
      set o = case when excluded.t >= (select t from cut) then excluded.o else k.o end,
          h = case when excluded.t >= (select t from cut) then excluded.h else k.h end,
          l = case when excluded.t >= (select t from cut) then excluded.l else k.l end,
          c = case when excluded.t >= (select t from cut) then excluded.c else k.c end,
          v = case when excluded.t >= (select t from cut) then coalesce(excluded.v, k.v) else coalesce(k.v, excluded.v) end
    returning 1
  )
  select count(*)::int from w;
$$;
revoke all on function public.st_candles_put(text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.st_candles_put(text, integer, jsonb) to service_role;

-- The deep-history volume (ingest-candles past its storage cap, supabase/volume_asks_v2.sql): only where a bar has none. It wrote
-- whenever the number differed, so two brokers' tick volumes rewrote each other's old rows on every send.
create or replace function public.st_candles_set_v(p_symbol text, p_tf integer, p_rows jsonb)
returns integer language sql security definer set search_path = public as $$
  with x as (select (e->>0)::bigint t, (e->>1)::int v from jsonb_array_elements(p_rows) e),
  u as (update public.candles c set v = x.v from x
        where c.symbol = p_symbol and c.tf = p_tf and c.t = x.t and c.v is null and x.v is not null returning 1)
  select count(*)::int from u;
$$;
revoke all on function public.st_candles_set_v(text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.st_candles_set_v(text, integer, jsonb) to service_role;

notify pgrst, 'reload schema';
