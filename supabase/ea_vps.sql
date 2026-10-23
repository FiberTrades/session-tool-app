-- EA 9.08 (23 Oct 2026): the EA on a PC stands aside while the same account's EA runs on MetaQuotes' VPS.
-- Nestor moved his EA to the MT5 VPS that night. Algo Trading off on the PC stopped its trading but not the EA,
-- so one account's two copies sent prices, synced trades and answered the app twice.
--   The VPS copy (TERMINAL_VPS) calls st_ea_vps(token, login, true) every 2 minutes: "I am running".
--   Any other copy calls st_ea_vps(token, login, false): seconds since the VPS copy was last heard, -1 never.
--   The EA stands aside while that is under 5 minutes.
-- Only the function reads or writes the table (RLS on, no policies, no grants to the API roles).

create table if not exists public.ea_vps (
  user_id uuid not null,
  login   text not null,
  seen_at timestamptz not null default now(),
  primary key (user_id, login)
);
alter table public.ea_vps enable row level security;
revoke all on public.ea_vps from anon, authenticated;

create or replace function public.st_ea_vps(p_token text, p_login text, p_vps boolean default false)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare uid uuid; lg text; s timestamptz;
begin
  if p_token is null or length(p_token) < 8 then return null; end if;
  uid := st_sync_account(p_token);
  if uid is null then return null; end if;
  lg := left(btrim(coalesce(p_login, '')), 32);
  if lg !~ '^[0-9]+$' then return null; end if;
  if p_vps then
    insert into public.ea_vps (user_id, login, seen_at) values (uid, lg, now())
      on conflict (user_id, login) do update set seen_at = excluded.seen_at;
    return 0;
  end if;
  select v.seen_at into s from public.ea_vps v where v.user_id = uid and v.login = lg;
  if s is null then return -1; end if;
  return greatest(0, floor(extract(epoch from (now() - s))))::integer;
end $function$;

revoke all on function public.st_ea_vps(text, text, boolean) from public;
grant execute on function public.st_ea_vps(text, text, boolean) to anon, authenticated;
