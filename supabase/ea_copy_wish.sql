-- EA 9.10 (23 Oct 2026): the Trade Copier's role set from the app.
-- Nestor: "can you not add this in the app so its easier in the EA panel?" The role used to be set only on the EA's
-- panel in MT5. With his 70K's EA on MetaQuotes' VPS, the Lead role belongs to the account's copy on his PC, which
-- feeds the Follow accounts there while it stands aside. That copy has no live line, so the app leaves the
-- request here instead:
--   the app:  st_copy_wish(login, role) - the signed-in member's own account; then a "role" poke on the live line
--   the EAs:  st_ea_vps2(token, login, vps) - st_ea_vps's answer plus the wish: "<age>|<role>|<set epoch>"
--             (every copy of the account reads it; one applies a wish newer than the last it applied, at most a day old)
-- The table is closed: RLS on, no policies, no grants to the API roles; only these functions touch it.

create table if not exists public.ea_copy_wish (
  user_id uuid not null,
  login   text not null,
  role    text not null check (role in ('off', 'lead', 'follow')),
  set_at  timestamptz not null default now(),
  primary key (user_id, login)
);
alter table public.ea_copy_wish enable row level security;
revoke all on public.ea_copy_wish from anon, authenticated;

create or replace function public.st_copy_wish(p_login text, p_role text)
returns bigint
language plpgsql
security definer
set search_path to 'public'
as $function$
declare uid uuid := auth.uid(); lg text := left(btrim(coalesce(p_login, '')), 32); t timestamptz := now();
begin
  if uid is null then raise exception 'not signed in'; end if;
  if lg !~ '^[0-9]+$' or coalesce(p_role, '') not in ('off', 'lead', 'follow') then raise exception 'bad request'; end if;
  insert into public.ea_copy_wish (user_id, login, role, set_at) values (uid, lg, p_role, t)
    on conflict (user_id, login) do update set role = excluded.role, set_at = excluded.set_at;
  return floor(extract(epoch from t))::bigint;
end $function$;
revoke all on function public.st_copy_wish(text, text) from public;
revoke execute on function public.st_copy_wish(text, text) from anon;   -- Supabase grants new functions to anon by default
grant execute on function public.st_copy_wish(text, text) to authenticated;

create or replace function public.st_ea_vps2(p_token text, p_login text, p_vps boolean default false)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare age integer; uid uuid; r text; e bigint;
begin
  age := public.st_ea_vps(p_token, p_login, p_vps);
  if age is null then return null; end if;
  uid := st_sync_account(p_token);
  select w.role, floor(extract(epoch from w.set_at))::bigint into r, e
    from public.ea_copy_wish w where w.user_id = uid and w.login = left(btrim(coalesce(p_login, '')), 32);
  return age::text || '|' || coalesce(r, '') || '|' || coalesce(e, 0)::text;
end $function$;
revoke all on function public.st_ea_vps2(text, text, boolean) from public;
grant execute on function public.st_ea_vps2(text, text, boolean) to anon, authenticated;
