-- The database's size, for ingest-candles' storage guard (15 Oct 2026). Repo mirror; applied with
-- `supabase db query --linked -f supabase/db_bytes.sql`.
--
-- EA 8.95 fills a year of M1 and M5 for every symbol traded (Nestor: "can we have more 1m and 5m candles stored? same
-- amount as 15m candles?"). That is roughly 50 MB of M1 per symbol, and the project is on Supabase's free plan, whose
-- database holds 500 MB - over it the project goes read-only, journals included. ingest-candles asks this function
-- (cached ten minutes) and stops taking DEEP M1 / M5 (older than about three months) once the database passes its cap;
-- recent candles always go in. Server only: no grant to anon or members.
create or replace function public.st_db_bytes()
returns bigint
language sql
stable
security definer
set search_path to 'public'
as $function$
  select pg_database_size(current_database())
$function$;
revoke all on function public.st_db_bytes() from public, anon, authenticated;
grant execute on function public.st_db_bytes() to service_role;
