-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
-- Volume asks, v2 (Nestor, 20 Oct 2026: "the volumen tool from the indicator stays empty if i go back a few month in time
-- whilst back testing, why?" - then "yes do 1, 2 and 3"). What went wrong with v1 (candle_volume.sql):
--   * st_ea_poll handed an ask to ANY member's EA that sends the symbol, once, for good. Nestor's asks for Oct-Nov 2025
--     went to another member's MT5, which keeps 100,000 bars (about 3 months of 1-minute candles): it could not answer,
--     dropped them silently, and nobody else was ever asked - the chart waited for ever.
--   * ingest-candles, past its storage cap, dropped old 1-minute candles - their volume answers too.
-- Now:
--   1) an ask goes only to the asking member's own MT5s, and when one has not answered in 5 minutes (or says it has no
--      candles that far back, EA 9.07) the next of them gets it - up to 6 tries, each MT5 once;
--   2) st_candles_set_v: volume goes onto candles already stored, even past the cap (no new rows);
--   3) st_ea_vol_none: EA 9.07 says when its MT5 has no candles for the ask, with its Max bars in chart, so the chart
--      can say so instead of "is MT5 open?".
-- Applied 20 Oct 2026.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════

alter table public.candle_requests
  add column if not exists sent_at timestamptz,
  add column if not exists tries smallint not null default 0,
  add column if not exists tried text[] not null default '{}',
  add column if not exists reason text,
  add column if not exists maxbars integer;

-- 1) the poll: the old two-argument one goes (EA 9.06 and older call this one with p_login left out)
drop function if exists public.st_ea_poll(text, text);
create or replace function public.st_ea_poll(p_token text, p_syms text, p_login text default null) returns text
language plpgsql security definer set search_path = public as $$
declare uid uuid; al text; vl text; syms text[]; me text;
begin
  if p_token is null or length(p_token) < 8 then return null; end if;
  uid := st_sync_account(p_token);
  if uid is null then return null; end if;
  syms := array(select btrim(x) from unnest(string_to_array(coalesce(p_syms, ''), ',')) x where btrim(x) <> '');
  al := st_ea_alerts(p_token, coalesce(syms[1], ''));
  -- which MT5 this is: its account number (EA 9.07 sends it), else its token and symbols
  me := coalesce(nullif(btrim(coalesce(p_login, '')), ''), md5(p_token || '|' || coalesce(p_syms, '')));
  with q as (
    select r.id from public.candle_requests r
    where r.note = 'vol' and r.user_id = uid and r.symbol = any(syms)
      and r.tries < 6 and not (me = any(r.tried))
      and (r.status = 'pending'
           or ((r.status = 'nodata' or (r.status = 'sent' and r.sent_at < now() - interval '5 minutes'))
               and exists (select 1 from public.candles c
                           where c.symbol = r.symbol and c.tf = r.tf and c.t between r.from_t and r.to_t and c.v is null)))
    order by r.created_at limit 4 for update skip locked
  ), u as (
    update public.candle_requests r set status = 'sent', sent_at = now(), tries = r.tries + 1, tried = r.tried || me
    from q where r.id = q.id
    returning r.id, r.symbol, r.tf, r.from_t, r.to_t
  )
  select string_agg(u.id::text || ',' || u.symbol || ',' || u.tf::text || ',' || u.from_t::text || ',' || u.to_t::text, ';' order by u.id) into vl from u;
  return coalesce(al, '0|') || '#' || coalesce(vl, '');
end $$;
revoke all on function public.st_ea_poll(text, text, text) from public;
grant execute on function public.st_ea_poll(text, text, text) to anon, authenticated;

-- 3) EA 9.07: "this MT5 has no candles for that ask" (and how many bars it keeps). The next MT5 of the member gets it.
create or replace function public.st_ea_vol_none(p_token text, p_id bigint, p_maxbars integer default null, p_reason text default 'nohist')
returns boolean language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if p_token is null or length(p_token) < 8 then return false; end if;
  uid := st_sync_account(p_token);
  if uid is null then return false; end if;
  update public.candle_requests set status = 'nodata', reason = left(coalesce(p_reason, 'nohist'), 40), maxbars = p_maxbars
   where id = p_id and user_id = uid and status = 'sent';
  return found;
end $$;
revoke all on function public.st_ea_vol_none(text, bigint, integer, text) from public;
grant execute on function public.st_ea_vol_none(text, bigint, integer, text) to anon, authenticated;

-- 2) volume onto candles already stored (ingest-candles past its storage cap): updates only, never a new row
create or replace function public.st_candles_set_v(p_symbol text, p_tf integer, p_rows jsonb)
returns integer language sql security definer set search_path = public as $$
  with x as (select (e->>0)::bigint t, (e->>1)::int v from jsonb_array_elements(p_rows) e),
  u as (update public.candles c set v = x.v from x
        where c.symbol = p_symbol and c.tf = p_tf and c.t = x.t and c.v is distinct from x.v returning 1)
  select count(*)::int from u;
$$;
revoke all on function public.st_candles_set_v(text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.st_candles_set_v(text, integer, jsonb) to service_role;

notify pgrst, 'reload schema';
