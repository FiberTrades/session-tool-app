-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
-- Volume for the Minimalist's volume profile in Practice Replay (Nestor, 17 Oct 2026: "Tick volume from the EA, but the
-- EA should only send the information about the P/D zone selected so it shouldnt take up that much space?").
--   * every candle the EA sends from 9.00 on carries MT5's tick volume (one number on a row that is there anyway);
--   * candles stored before that get it only when a zone on someone's chart needs them: the app asks (candle_requests,
--     note 'vol'), the EA's regular poll (st_ea_poll) hands it the ask, it sends those candles again with their volume.
-- Applied 17 Oct 2026.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════

-- 1) the number: null until the EA has sent the candle with it
alter table public.candles add column if not exists v integer;

-- 2) the range read returns it (a new result column: drop and create, same grants as before)
drop function if exists public.st_candles(text, integer, bigint, bigint);
create function public.st_candles(p_symbol text, p_tf integer, p_from bigint, p_to bigint)
returns table(t bigint, o double precision, h double precision, l double precision, c double precision, v integer)
language sql stable security definer set search_path = public as $$
  select t, o, h, l, c, v from public.candles
  where symbol = p_symbol and tf = p_tf and t between p_from and p_to
  order by t;
$$;
revoke all on function public.st_candles(text, integer, bigint, bigint) from public;
grant execute on function public.st_candles(text, integer, bigint, bigint) to anon, authenticated, service_role;

-- 3) the asks. Row security covered reads and inserts, but the default grants also let anyone TRUNCATE the table.
revoke all on public.candle_requests from anon;
revoke all on public.candle_requests from authenticated;
grant select, insert on public.candle_requests to authenticated;

-- 4) the EA's one poll (replaces st_ea_alerts from 9.00): its price alerts exactly as st_ea_alerts gives them, then '#',
--    then up to 4 volume asks for symbols it sends: 'id,symbol,tf,from,to;...' (tf in minutes, times unix UTC). Handed
--    out once: the ask is marked 'sent'.
create or replace function public.st_ea_poll(p_token text, p_syms text) returns text
language plpgsql security definer set search_path = public as $$
declare uid uuid; al text; vl text; syms text[];
begin
  if p_token is null or length(p_token) < 8 then return null; end if;
  uid := st_sync_account(p_token);
  if uid is null then return null; end if;
  syms := array(select btrim(x) from unnest(string_to_array(coalesce(p_syms, ''), ',')) x where btrim(x) <> '');
  al := st_ea_alerts(p_token, coalesce(syms[1], ''));
  with q as (
    select id from public.candle_requests
    where status = 'pending' and note = 'vol' and symbol = any(syms)
    order by created_at limit 4 for update skip locked
  ), u as (
    update public.candle_requests r set status = 'sent' from q where r.id = q.id
    returning r.id, r.symbol, r.tf, r.from_t, r.to_t
  )
  select string_agg(u.id::text || ',' || u.symbol || ',' || u.tf::text || ',' || u.from_t::text || ',' || u.to_t::text, ';' order by u.id) into vl from u;
  return coalesce(al, '0|') || '#' || coalesce(vl, '');
end $$;
revoke all on function public.st_ea_poll(text, text) from public;
grant execute on function public.st_ea_poll(text, text) to anon, authenticated;
