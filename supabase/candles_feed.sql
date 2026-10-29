-- Per-broker candles (29 Oct 2026, Nestor: "yes do that").
--
-- public.candles held ONE series per symbol for every broker: whichever MT5 wrote last (and, since the write fix, first) owned the
-- bars. On 29 Oct the stored XAUUSD and EURUSD turned out to be mostly OneFunded's / TTT's prices, not FTMO's that Nestor trades:
-- a compare against the FTMO demo matched 0% (gold) and ~4% (EUR/USD) of bars exactly. From now on every price feed - one per MT5
-- server, e.g. 'ftmo-server4', 'ftmo-demo', 'onefunded-trade', 'tttmarkets-ltd' - keeps its own series in public.candles_feed.
--
--   - public.candles stays as it is: the LEGACY mixed series (nothing deleted, no rewrite of its 620 MB). It is read only as a
--     fallback, for times older than the first bar a feed has (a feed's backfill runs from now backwards), and written only by EAs
--     older than 9.19 (they don't say their feed).
--   - Readers (st_candles, st_candles_before, st_candles_oldest, st_candle_symbols) take p_feed (an MT5 server name; normalised
--     here); without one they read st_candle_default_feed() - Nestor's FTMO 70K's server - so signed-out, hub and demo views and
--     an app that doesn't pass a feed yet all get one broker's prices.
--   - Writes keep st_candles_put's rules (only new bars, bars gaining volume, recent bars that changed), per feed.
--   - A volume ask (candle_requests 'vol') carries the feed it was asked for and is handed only to an MT5 on that feed.

-- the feed id of an MT5 server name: "FTMO-Server4" -> 'ftmo-server4'
create or replace function public.st_feed_id(p text)
returns text language sql immutable as $$
  select nullif(left(regexp_replace(lower(btrim(coalesce(p, ''))), '[^a-z0-9._-]+', '-', 'g'), 40), '');
$$;
-- the feed views without an account read (Nestor's FTMO 70K)
create or replace function public.st_candle_default_feed()
returns text language sql immutable as $$ select 'ftmo-server4'::text; $$;

create table if not exists public.candles_feed (
  feed   text     not null,           -- st_feed_id(the MT5 server the bars came from)
  symbol text     not null,
  tf     smallint not null,           -- minutes: 1, 5, 15, 60, 240, 1440
  t      bigint   not null,           -- bar open, unix seconds UTC
  o double precision not null,
  h double precision not null,
  l double precision not null,
  c double precision not null,
  v integer,                          -- MT5 tick volume (EA 9.00+)
  primary key (feed, symbol, tf, t)
);
alter table public.candles_feed enable row level security;
revoke all on public.candles_feed from anon, authenticated;
grant select on public.candles_feed to authenticated;
drop policy if exists candles_feed_read on public.candles_feed;
create policy candles_feed_read on public.candles_feed for select to authenticated using (true);
comment on table public.candles is 'LEGACY (to 29 Oct 2026): one mixed-broker series per symbol. Read only as a fallback before a feed''s first bar; see candles_feed.';

-- writes: st_candles_put's rules, per feed
create or replace function public.st_candles_put_feed(p_feed text, p_symbol text, p_tf integer, p_rows jsonb)
returns integer language sql security definer set search_path = public as $$
  with x as (
    select distinct on (t) t, o, h, l, c, v from (
      select (e->>0)::bigint t, (e->>1)::float8 o, (e->>2)::float8 h, (e->>3)::float8 l, (e->>4)::float8 c,
             case when jsonb_array_length(e) > 5 and jsonb_typeof(e->5) = 'number' then (e->>5)::int end v, i
      from jsonb_array_elements(p_rows) with ordinality a(e, i)
    ) r order by t, i desc
  ),
  f as (select st_feed_id(p_feed) id),
  cut as (select extract(epoch from now())::bigint - greatest(2 * p_tf * 60, 3 * 3600) t),
  todo as (
    select x.* from x cross join cut cross join f
    left join public.candles_feed k on k.feed = f.id and k.symbol = p_symbol and k.tf = p_tf and k.t = x.t
    where f.id is not null
      and (k.t is null                                                             -- new
       or (k.v is null and x.v is not null)                                        -- its volume arrives
       or (x.t >= cut.t and ((k.o, k.h, k.l, k.c) is distinct from (x.o, x.h, x.l, x.c)
                             or (x.v is not null and k.v is distinct from x.v))))  -- a recent bar that changed
  ),
  w as (
    insert into public.candles_feed as k (feed, symbol, tf, t, o, h, l, c, v)
    select (select id from f), p_symbol, p_tf::smallint, t, o, h, l, c, v from todo
    on conflict (feed, symbol, tf, t) do update
      set o = case when excluded.t >= (select t from cut) then excluded.o else k.o end,
          h = case when excluded.t >= (select t from cut) then excluded.h else k.h end,
          l = case when excluded.t >= (select t from cut) then excluded.l else k.l end,
          c = case when excluded.t >= (select t from cut) then excluded.c else k.c end,
          v = case when excluded.t >= (select t from cut) then coalesce(excluded.v, k.v) else coalesce(k.v, excluded.v) end
    returning 1
  )
  select count(*)::int from w;
$$;
revoke all on function public.st_candles_put_feed(text, text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.st_candles_put_feed(text, text, integer, jsonb) to service_role;

create or replace function public.st_candles_set_v_feed(p_feed text, p_symbol text, p_tf integer, p_rows jsonb)
returns integer language sql security definer set search_path = public as $$
  with x as (select (e->>0)::bigint t, (e->>1)::int v from jsonb_array_elements(p_rows) e),
  u as (update public.candles_feed c set v = x.v from x
        where c.feed = st_feed_id(p_feed) and c.symbol = p_symbol and c.tf = p_tf and c.t = x.t and c.v is null and x.v is not null returning 1)
  select count(*)::int from u;
$$;
revoke all on function public.st_candles_set_v_feed(text, text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.st_candles_set_v_feed(text, text, integer, jsonb) to service_role;

-- reads: the feed's bars, and the legacy series only before the feed's first bar
drop function if exists public.st_candles(text, integer, bigint, bigint);
create or replace function public.st_candles(p_symbol text, p_tf integer, p_from bigint, p_to bigint, p_feed text default null)
returns table(t bigint, o double precision, h double precision, l double precision, c double precision, v integer)
language sql stable security definer set search_path = public as $$
  with f as (select coalesce(st_feed_id(p_feed), st_candle_default_feed()) id),
  fst as (select (select k.t from public.candles_feed k where k.feed = f.id and k.symbol = p_symbol and k.tf = p_tf order by k.t limit 1) t0 from f)
  select k.t, k.o, k.h, k.l, k.c, k.v from public.candles_feed k, f
   where k.feed = f.id and k.symbol = p_symbol and k.tf = p_tf and k.t between p_from and p_to
  union all
  select k.t, k.o, k.h, k.l, k.c, k.v from public.candles k, fst
   where k.symbol = p_symbol and k.tf = p_tf and k.t between p_from and least(p_to, coalesce(fst.t0 - 1, p_to))
  order by 1;
$$;
grant execute on function public.st_candles(text, integer, bigint, bigint, text) to anon, authenticated, service_role;

drop function if exists public.st_candles_before(text, integer, bigint, integer);
create or replace function public.st_candles_before(p_symbol text, p_tf integer, p_before bigint, p_n integer, p_feed text default null)
returns table(t bigint, o double precision, h double precision, l double precision, c double precision, v integer)
language sql stable security definer set search_path = public as $$
  with f as (select coalesce(st_feed_id(p_feed), st_candle_default_feed()) id),
  n as (select least(greatest(coalesce(p_n, 1), 1), 1000) n),
  fst as (select (select k.t from public.candles_feed k where k.feed = f.id and k.symbol = p_symbol and k.tf = p_tf order by k.t limit 1) t0 from f),
  a as (select k.t, k.o, k.h, k.l, k.c, k.v from public.candles_feed k, f, n
         where k.feed = f.id and k.symbol = p_symbol and k.tf = p_tf and k.t < p_before order by k.t desc limit (select n from n)),
  b as (select k.t, k.o, k.h, k.l, k.c, k.v from public.candles k, fst, n
         where k.symbol = p_symbol and k.tf = p_tf and k.t < least(p_before, coalesce(fst.t0, p_before))
         order by k.t desc limit (select n from n))
  select z.t, z.o, z.h, z.l, z.c, z.v from (
    select * from a union all select * from b where (select count(*) from a) < (select n from n)
    order by 1 desc limit (select n from n)
  ) z order by z.t;
$$;
grant execute on function public.st_candles_before(text, integer, bigint, integer, text) to authenticated, service_role;

drop function if exists public.st_candles_oldest(text, integer);
create or replace function public.st_candles_oldest(p_symbol text, p_tf integer, p_feed text default null)
returns bigint language sql stable security definer set search_path = public as $$
  select least(
    (select k.t from public.candles_feed k where k.feed = coalesce(st_feed_id(p_feed), st_candle_default_feed()) and k.symbol = p_symbol and k.tf = p_tf order by k.t limit 1),
    (select min(k.t) from public.candles k where k.symbol = p_symbol and k.tf = p_tf));
$$;
grant execute on function public.st_candles_oldest(text, integer, text) to anon, authenticated, service_role;

drop function if exists public.st_candle_symbols();
create or replace function public.st_candle_symbols(p_feed text default null)
returns table(symbol text, tf smallint, first_t bigint, last_t bigint)
language sql stable security definer set search_path = public as $$
  with recursive f as (select coalesce(st_feed_id(p_feed), st_candle_default_feed()) id),
  lp as (
    (select c.symbol, c.tf from public.candles c order by c.symbol, c.tf limit 1)
    union all
    select n.symbol, n.tf from lp p, lateral (select c.symbol, c.tf from public.candles c
      where (c.symbol, c.tf) > (p.symbol, p.tf) order by c.symbol, c.tf limit 1) n
  ),
  fp as (
    (select k.symbol, k.tf from public.candles_feed k, f where k.feed = f.id order by k.symbol, k.tf limit 1)
    union all
    select n.symbol, n.tf from fp p, lateral (select k.symbol, k.tf from public.candles_feed k, f
      where k.feed = f.id and (k.symbol, k.tf) > (p.symbol, p.tf) order by k.symbol, k.tf limit 1) n
  ),
  pairs as (select symbol, tf from lp union select symbol, tf from fp)
  select p.symbol, p.tf,
    least((select c.t from public.candles c where c.symbol = p.symbol and c.tf = p.tf order by c.t asc limit 1),
          (select k.t from public.candles_feed k, f where k.feed = f.id and k.symbol = p.symbol and k.tf = p.tf order by k.t asc limit 1)),
    greatest((select c.t from public.candles c where c.symbol = p.symbol and c.tf = p.tf order by c.t desc limit 1),
             (select k.t from public.candles_feed k, f where k.feed = f.id and k.symbol = p.symbol and k.tf = p.tf order by k.t desc limit 1))
  from pairs p;
$$;
grant execute on function public.st_candle_symbols(text) to anon, authenticated, service_role;

-- volume asks: for a feed, and only to an MT5 on it
alter table public.candle_requests add column if not exists feed text;
create or replace function public.st_ea_poll(p_token text, p_syms text, p_login text default null)
returns text language plpgsql security definer set search_path to 'public' as $function$
declare uid uuid; al text; vl text; syms text[]; me text; myfeed text;
begin
  if p_token is null or length(p_token) < 8 then return null; end if;
  uid := st_sync_account(p_token);
  if uid is null then return null; end if;
  syms := array(select btrim(x) from unnest(string_to_array(coalesce(p_syms, ''), ',')) x where btrim(x) <> '');
  al := st_ea_alerts(p_token, coalesce(syms[1], ''));
  -- which MT5 this is: its account number (EA 9.07 sends it), else its token and symbols
  me := coalesce(nullif(btrim(coalesce(p_login, '')), ''), md5(p_token || '|' || coalesce(p_syms, '')));
  -- its feed (per-broker candles, 29 Oct 2026): the server its EA reports
  select st_feed_id(e.settings->>'server') into myfeed from public.ea_settings e
   where e.user_id = uid and e.login = nullif(btrim(coalesce(p_login, '')), '') and e.settings ? 'server' limit 1;
  with q as (
    select r.id from public.candle_requests r
    where r.note = 'vol' and r.user_id = uid and r.symbol = any(syms)
      and (r.feed is null or r.feed = myfeed)
      and r.tries < 6 and not (me = any(r.tried))
      and (r.status = 'pending'
           or ((r.status = 'nodata' or (r.status = 'sent' and r.sent_at < now() - interval '5 minutes'))
               and (case when r.feed is null
                         then exists (select 1 from public.candles c
                                      where c.symbol = r.symbol and c.tf = r.tf and c.t between r.from_t and r.to_t and c.v is null)
                         else not exists (select 1 from public.candles_feed k
                                          where k.feed = r.feed and k.symbol = r.symbol and k.tf = r.tf and k.t between r.from_t and r.to_t and k.v is not null)
                    end)))
    order by r.created_at limit 4 for update skip locked
  ), u as (
    update public.candle_requests r set status = 'sent', sent_at = now(), tries = r.tries + 1, tried = r.tried || me
    from q where r.id = q.id
    returning r.id, r.symbol, r.tf, r.from_t, r.to_t
  )
  select string_agg(u.id::text || ',' || u.symbol || ',' || u.tf::text || ',' || u.from_t::text || ',' || u.to_t::text, ';' order by u.id) into vl from u;
  return coalesce(al, '0|') || '#' || coalesce(vl, '');
end $function$;

-- the one-off repair function of 29 Oct is gone
drop function if exists public.st_candles_fix_hl(text, integer, jsonb, bigint, bigint, boolean);

notify pgrst, 'reload schema';
