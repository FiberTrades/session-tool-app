-- Candles written only when they change something (29 Oct 2026).
--
-- The database ran out of its disk IO budget twice on 29 Oct (07:45-08:30 and from 16:00 UTC). ingest-candles posted every batch
-- with "resolution=merge-duplicates" - ON CONFLICT DO UPDATE on every bar - so a bar already stored was written again each time
-- any MT5 sent it: a new row version, the primary key touched, WAL with a full-page image for each page's first change after a
-- checkpoint, and the checkpoint writing the page back. 12:00-16:00 UTC the cloud MT5s sent 190-250 MB of bars an hour (about
-- 2.5M bars), checkpoints wrote up to 13,883 buffers (~108 MB) every 5 minutes, and writers queued on each other's row locks.
--
-- Now a bar is written when
--   - it is new;
--   - it brings the tick volume a stored bar lacks (EA 9.00+; the volume profile);
--   - it is recent - opened within max(2 bars, 3 hours) - and its values changed: the newest bars may have been sent unfinished.
-- A closed bar already stored is kept as it is: the first MT5 to send it wins (before, the last one did, so two brokers' feeds
-- rewrote each other's rows on every top-up). Rows that change nothing are filtered out BEFORE the insert, so they are not even
-- locked: ON CONFLICT DO UPDATE ... WHERE false still locks (and so writes) the row it skips.
--
-- p_rows: [[t, o, h, l, c, v?], ...] as the EA sends them (t snapped to the minute by ingest-candles). Returns the bars written.

create or replace function public.st_candles_put(p_symbol text, p_tf integer, p_rows jsonb)
returns integer
language sql
security definer
set search_path = public
as $$
  with x as (
    select (e->>0)::bigint t, (e->>1)::float8 o, (e->>2)::float8 h, (e->>3)::float8 l, (e->>4)::float8 c,
           case when jsonb_array_length(e) > 5 and jsonb_typeof(e->5) = 'number' then (e->>5)::int end v
    from jsonb_array_elements(p_rows) e
  ),
  cut as (select extract(epoch from now())::bigint - greatest(2 * p_tf * 60, 3 * 3600) t),
  todo as (
    select x.* from x cross join cut
    left join public.candles k on k.symbol = p_symbol and k.tf = p_tf and k.t = x.t
    where k.t is null                                                            -- new
       or (k.v is null and x.v is not null)                                      -- its volume arrives
       or (x.t >= cut.t and ((k.o, k.h, k.l, k.c) is distinct from (x.o, x.h, x.l, x.c)
                             or (x.v is not null and k.v is distinct from x.v)))   -- a recent bar that changed
  ),
  w as (
    insert into public.candles as k (symbol, tf, t, o, h, l, c, v)
    select p_symbol, p_tf::smallint, t, o, h, l, c, v from todo
    on conflict (symbol, tf, t) do update
      set o = case when excluded.t >= (select t from cut) then excluded.o else k.o end,
          h = case when excluded.t >= (select t from cut) then excluded.h else k.h end,
          l = case when excluded.t >= (select t from cut) then excluded.l else k.l end,
          c = case when excluded.t >= (select t from cut) then excluded.c else k.c end,
          v = coalesce(excluded.v, k.v)
    returning 1
  )
  select count(*)::int from w;
$$;
revoke all on function public.st_candles_put(text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.st_candles_put(text, integer, jsonb) to service_role;

notify pgrst, 'reload schema';
