-- Alerts on any drawing (Nestor, 19 Oct 2026, batch D of "build all the tradingview suggestions!"): a trend line, a ray and a
-- horizontal ray ring when price crosses them; a rectangle and a parallel channel when price enters the zone, leaves it, or
-- either. The app keeps them in price_alerts, as it keeps a horizontal line's (supabase/price_alerts.sql), so the EA watches
-- them with Session Terminal closed and the phone hears them.
--
-- A row now says what it watches:
--   src 'line' / 'price' / 'hray'   a level: price (as before)
--   src 'trend' / 'ray'             a sloping line: price at t0 (unix seconds), slope in price per trading second
--   src 'rect' / 'channel'          a zone: price = its bottom, hi = its top, both at t0 and moving by slope (a channel's
--                                   lines are parallel); mode 1 enter, 2 exit, 3 either; starts_at / expires_at = its left
--                                   and right edges unless it is extended that way
--   mk                              trading time: the weekend close (Friday 17:00 to Sunday 17:00 New York) is left out of a
--                                   slope's run, as the chart's candles leave it out; false for crypto, which trades through it
--
-- st_ea_alerts (read by the EA through st_ea_poll every minute while there are alerts) works the levels out at that moment:
--   a level          '<id>,<price>,<dir>'                                    exactly as before
--   a sloping line   '<id>,<price now>,<dir>,S,<slope per second>'           EAs before 9.05 read the first three fields, so
--                                                                            they watch the line at its level of that minute
--   a zone           '<id>,0,0,Z,<bottom now>,<top now>,<mode>,<slope>'      a price of 0 is skipped by EAs before 9.05;
--                                                                            9.05 judges entering and leaving
-- An expired zone (past its right edge) is not handed out any more; one whose left edge is still ahead, not yet.

alter table public.price_alerts
  add column if not exists hi         double precision,
  add column if not exists t0         double precision,
  add column if not exists slope      double precision,
  add column if not exists mode       smallint,
  add column if not exists mk         boolean not null default true,
  add column if not exists starts_at  timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists fired_how  text;            -- a zone's: 'in' (entered) or 'out' (left), from the EA's report (live-trade)

-- trading seconds from a to b (unix seconds; negative when b is before a): the weekend close left out unless mk is false
create or replace function public.st_mkt_secs(a double precision, b double precision, mk boolean default true)
returns double precision language plpgsql stable set search_path = public as $$
declare lo double precision := least(a, b); hi double precision := greatest(a, b); s double precision := 0; f date;
        ws double precision; we double precision; n int := 0;
begin
  if a is null or b is null then return null; end if;
  if not coalesce(mk, true) or hi <= lo then return b - a; end if;
  f := (to_timestamp(lo) at time zone 'America/New_York')::date;
  f := f - ((extract(isodow from f)::int + 2) % 7);          -- the Friday on or before (isodow: Monday 1 .. Sunday 7)
  loop
    ws := extract(epoch from ((f::timestamp + time '17:00') at time zone 'America/New_York'));
    we := extract(epoch from (((f + 2)::timestamp + time '17:00') at time zone 'America/New_York'));
    exit when ws >= hi or n > 2700;                           -- 50 years of weekends at most
    s := s + greatest(0, least(we, hi) - greatest(ws, lo));
    f := f + 7; n := n + 1;
  end loop;
  return sign(b - a) * ((hi - lo) - s);
end $$;

-- one alert as the EA reads it, at a moment (unix seconds)
create or replace function public.st_alert_item(r public.price_alerts, at double precision default extract(epoch from now()))
returns text language plpgsql stable set search_path = public as $$
declare d double precision := 0; lo double precision; hi double precision;
begin
  if r.src in ('trend', 'ray') and r.t0 is not null and r.slope is not null then
    d := st_mkt_secs(r.t0, at, r.mk);
    lo := r.price + r.slope * d;
    return r.id::text || ',' || round(lo::numeric, 8)::text || ',' || r.dir::text || ',S,' || round(r.slope::numeric, 14)::text;
  elsif r.src in ('rect', 'channel') and r.hi is not null then
    if r.slope is not null and r.t0 is not null then d := st_mkt_secs(r.t0, at, r.mk); end if;
    lo := r.price + coalesce(r.slope, 0) * d; hi := r.hi + coalesce(r.slope, 0) * d;
    return r.id::text || ',0,0,Z,' || round(least(lo, hi)::numeric, 8)::text || ',' || round(greatest(lo, hi)::numeric, 8)::text || ','
      || coalesce(r.mode, 3)::text || ',' || round(coalesce(r.slope, 0)::numeric, 14)::text;
  end if;
  return r.id::text || ',' || r.price::text || ',' || r.dir::text;   -- a level: exactly as before
end $$;

create or replace function public.st_ea_alerts(p_token text, p_sym text) returns text
language plpgsql security definer set search_path = public as $$
declare uid uuid; k text; anyA boolean; lst text; nowe double precision := extract(epoch from now());
begin
  if p_token is null or length(p_token) < 8 then return null; end if;
  uid := st_sync_account(p_token);
  if uid is null then return null; end if;
  k := st_sym_canon(p_sym);
  select exists(select 1 from price_alerts where user_id = uid and active and (expires_at is null or expires_at > now())) into anyA;
  select string_agg(st_alert_item(a, nowe), ';' order by a.created_at) into lst
    from price_alerts a
    where a.user_id = uid and a.active and a.sym = k
      and (a.expires_at is null or a.expires_at > now()) and (a.starts_at is null or a.starts_at <= now());
  return (case when anyA then '1' else '0' end) || '|' || coalesce(lst, '');
end $$;
revoke all on function public.st_ea_alerts(text, text) from public;
grant execute on function public.st_ea_alerts(text, text) to anon, authenticated;
revoke all on function public.st_alert_item(public.price_alerts, double precision) from public, anon, authenticated;
revoke all on function public.st_mkt_secs(double precision, double precision, boolean) from public, anon, authenticated;
