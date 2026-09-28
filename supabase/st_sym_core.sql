-- A pair's core name, so the leaderboard counts a trade and its trade-copier copies on the member's other accounts
-- as ONE setup even when brokers name the pair differently (28 Sep 2026, EA 8.83 trade copier).
-- EURUSD.r / EURUSD+ / EURUSDm / #EURUSD / EUR/USD -> EURUSD; GOLD -> XAUUSD; SILVER -> XAGUSD.
-- Used by st_rebuild_leaderboard (raw / grp / ded). Applied as migration leaderboard_copies_by_symbol_core.
create or replace function public.st_sym_core(s text) returns text
language sql immutable as $f$
  select case
           when c ~ '^GOLD'   then 'XAUUSD'
           when c ~ '^SILVER' then 'XAGUSD'
           when length(c) > 6 and c ~ '^(USD|EUR|GBP|JPY|CHF|AUD|NZD|CAD|XAU|XAG)(USD|EUR|GBP|JPY|CHF|AUD|NZD|CAD)' then left(c, 6)
           else c
         end
    from (select regexp_replace(
                   regexp_replace(
                     regexp_replace(upper(coalesce(s, '')), '^[^A-Z0-9]+', ''),
                     '^([A-Z]{3})/([A-Z]{3})', '\1\2'),
                   '[^A-Z0-9].*$', '') as c) x
$f$;
