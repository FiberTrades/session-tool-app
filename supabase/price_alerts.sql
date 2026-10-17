-- Price alerts (Nestor, 17 Oct 2026: "for the live chart i might want to be able to set alarms like in tradingview when a
-- certain price has been reached", "allow to set alarms on horizontal lines too", "these alarms will have to be sent as
-- nudges so i also get them on my phone").
--
-- The app keeps a member's alerts here. The EA (8.99) reads the active ones for its chart's symbol (st_ea_alerts, by the
-- sync token, as st_live_tick does), watches every tick, and when price reaches one posts {"event":"alert"} to live-trade,
-- which marks it fired (once, whichever terminal is first) and pushes it to the member's phone.

-- The app's symbol name for a broker's (the same rules as Practice Replay's canon()): EURUSD.r -> EURUSD, GOLD -> XAUUSD,
-- NAS100 / US100.cash -> NQ ...
create or replace function public.st_sym_canon(raw text) returns text
language plpgsql immutable set search_path = public as $$
declare
  c text; m text; k text; pass int;
  al jsonb := '{"NQ":["US100","NAS100","USTEC","NDX","NQ","USTECH","NAS","NASDAQ","NAS100USD","US100USD"],"US30":["US30","DJ30","DJI","WS30","YM","DOW","US30USD"],"US500":["US500","SPX500","SP500","SPX","ES","US500USD"],"GER40":["GER40","DE40","DAX40","DE30","GER30","DAX"],"UK100":["UK100","FTSE100","FTSE"],"JP225":["JP225","JPN225","NIKKEI","NI225"],"XAUUSD":["XAUUSD","GOLD"],"XAGUSD":["XAGUSD","SILVER"],"USOIL":["USOIL","WTI","XTIUSD","CL","OILUSD","USOUSD"],"UKOIL":["UKOIL","BRENT","XBRUSD"],"BTCUSD":["BTCUSD","BTCUSDT","BITCOIN","XBTUSD"],"ETHUSD":["ETHUSD","ETHUSDT","ETHEREUM"]}';
  ccy text := '^(USD|EUR|GBP|JPY|CHF|AUD|NZD|CAD|SEK|NOK|DKK|PLN|HUF|CZK|TRY|ZAR|MXN|SGD|HKD|CNH)$';
begin
  c := regexp_replace(upper(coalesce(raw, '')), '\.(CASH|PRO|RAW|ECN|STD|STP|R|I|M|A|B|C)$', '');
  c := regexp_replace(c, '[^A-Z0-9]', '', 'g');
  for pass in 1..2 loop
    for k in select jsonb_object_keys(al) loop
      if (al -> k) ? c then return k; end if;
    end loop;
    m := substring(c from '^([A-Z]{6})');
    if m is not null and substr(m, 1, 3) ~ ccy and substr(m, 4, 3) ~ ccy then return m; end if;
    c := regexp_replace(c, '(CASH|M|R|I|PRO|ECN)$', '');
  end loop;
  return c;
end $$;

create table if not exists public.price_alerts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sym        text not null,                     -- the app's name (st_sym_canon), set by the trigger
  price      double precision not null,
  dir        smallint not null default 0,       -- 1: price rising to it, -1: falling to it, 0: the EA judges from the first price it sees
  note       text,
  src        text not null default 'line',      -- 'line' (a horizontal line with its alert on) or 'price'
  created_at timestamptz not null default now(),
  fired_at   timestamptz,
  fired_px   double precision,
  active     boolean not null default true
);
create index if not exists price_alerts_user_active on public.price_alerts (user_id, sym) where active;

create or replace function public.price_alerts_canon() returns trigger
language plpgsql set search_path = public as $$
begin
  new.sym := st_sym_canon(new.sym);
  new.note := left(new.note, 120);
  return new;
end $$;
drop trigger if exists price_alerts_canon on public.price_alerts;
create trigger price_alerts_canon before insert or update of sym, note on public.price_alerts for each row execute function public.price_alerts_canon();

alter table public.price_alerts enable row level security;
drop policy if exists "price_alerts own" on public.price_alerts;
create policy "price_alerts own" on public.price_alerts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.price_alerts from anon;
revoke all on public.price_alerts from authenticated;   -- the defaults include TRUNCATE, which row security does not cover
grant select, insert, update, delete on public.price_alerts to authenticated;

-- For the EA: '<1 if the member has any active alert, else 0>|<id>,<price>,<dir>;...' for its chart's symbol.
-- Plain text, so MQL5 reads it without a JSON parser.
create or replace function public.st_ea_alerts(p_token text, p_sym text) returns text
language plpgsql security definer set search_path = public as $$
declare uid uuid; k text; anyA boolean; lst text;
begin
  if p_token is null or length(p_token) < 8 then return null; end if;
  uid := st_sync_account(p_token);
  if uid is null then return null; end if;
  k := st_sym_canon(p_sym);
  select exists(select 1 from price_alerts where user_id = uid and active) into anyA;
  select string_agg(id::text || ',' || price::text || ',' || dir::text, ';' order by created_at) into lst
    from price_alerts where user_id = uid and active and sym = k;
  return (case when anyA then '1' else '0' end) || '|' || coalesce(lst, '');
end $$;
revoke all on function public.st_ea_alerts(text, text) from public;
grant execute on function public.st_ea_alerts(text, text) to anon, authenticated;
