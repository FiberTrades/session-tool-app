-- Practice Replay's symbol list (14 Oct 2026, Nestor: "yes build the automatic list"). Repo mirror; applied with
-- `supabase db query --linked -f supabase/candle_symbols.sql`.
--
-- Every (symbol, timeframe) in the shared candle store with its first and last candle, so practice offers whatever any
-- member's EA has filled - EURUSD and XAUUSD today, NQ the day an EA runs on a US100 chart. A skip scan over the
-- (symbol, tf, t) primary key: one index probe per pair instead of reading the ~400k rows, so it stays quick as the
-- store grows. Market data only, nobody's trades: callable by anyone, like st_candles.
create or replace function public.st_candle_symbols()
returns table (symbol text, tf smallint, first_t bigint, last_t bigint)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with recursive pairs as (
    (select c.symbol, c.tf from candles c order by c.symbol, c.tf limit 1)
    union all
    select n.symbol, n.tf
      from pairs p,
           lateral (select c.symbol, c.tf from candles c
                     where (c.symbol, c.tf) > (p.symbol, p.tf)
                     order by c.symbol, c.tf limit 1) n
  )
  select p.symbol, p.tf,
         (select c.t from candles c where c.symbol = p.symbol and c.tf = p.tf order by c.t asc  limit 1) as first_t,
         (select c.t from candles c where c.symbol = p.symbol and c.tf = p.tf order by c.t desc limit 1) as last_t
    from pairs p
$function$;
grant execute on function public.st_candle_symbols() to anon, authenticated;
