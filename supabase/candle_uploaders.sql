-- Applied 3 Nov 2026 (migration candle_uploaders). One member's MT5 per broker server and symbol sends the deep history; the rest are held to recent days
-- (ingest-candles replies "days"). Candles were always stored once; this saves the uploads. Nestor: "i think so yes".
-- who = a hash of the sync token, never the token. A sender quiet for 3 days (a weekend is about 2) gives its place to the next.
create table if not exists public.candle_uploaders (
  feed text not null,
  symbol text not null,
  who text not null,
  since timestamptz not null default now(),
  last_at timestamptz not null default now(),
  primary key (feed, symbol, who)
);
alter table public.candle_uploaders enable row level security;   -- no policies: only the service role, through the function below
revoke all on public.candle_uploaders from anon, authenticated;

-- true when this sender leads at least one symbol on this feed: it keeps its full depth. EA 9.19+ holds one depth for all its symbols, so a sender with any
-- symbol of its own to fill stays on full depth; only a sender with nothing to lead is held.
create or replace function public.st_candle_uploader(p_feed text, p_symbol text, p_who text)
 returns boolean
 language sql
 security definer
 set search_path to 'public'
as $function$
  with up as (
    insert into public.candle_uploaders as u (feed, symbol, who) values (p_feed, p_symbol, p_who)
    on conflict (feed, symbol, who) do update
      set last_at = now(), since = case when u.last_at < now() - interval '3 days' then now() else u.since end
      where u.last_at < now() - interval '5 minutes'
    returning feed, symbol, who, since, last_at
  ),
  live as (
    select c.symbol, c.who, coalesce(n.since, c.since) since from public.candle_uploaders c
      left join up n on n.feed = c.feed and n.symbol = c.symbol and n.who = c.who
     where c.feed = p_feed and coalesce(n.last_at, c.last_at) > now() - interval '3 days'
    union all
    select symbol, who, since from up n where not exists (select 1 from public.candle_uploaders c where c.feed = n.feed and c.symbol = n.symbol and c.who = n.who)
  ),
  mine as (select distinct symbol from live where who = p_who)
  select exists (
    select 1 from mine m
     where (select l.who from live l where l.symbol = m.symbol order by l.since, l.who limit 1) = p_who
  ) or not exists (select 1 from mine);
$function$;
revoke all on function public.st_candle_uploader(text, text, text) from public, anon, authenticated;
grant execute on function public.st_candle_uploader(text, text, text) to service_role;
