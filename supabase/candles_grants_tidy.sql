-- Hygiene (29 Oct 2026), migration candles_grants_tidy: the legacy candles table granted anon and authenticated every privilege.
-- RLS (one SELECT policy for authenticated) already blocked the writes; only reads are needed - the app reads candles through the
-- st_candles* functions.
revoke insert, update, delete, truncate, references, trigger on public.candles from anon, authenticated;
-- st_candles_before was authenticated-only before candles_feed recreated it (a new function is granted to anon by default)
revoke execute on function public.st_candles_before(text, integer, bigint, integer, text) from public, anon;
grant execute on function public.st_candles_before(text, integer, bigint, integer, text) to authenticated, service_role;
