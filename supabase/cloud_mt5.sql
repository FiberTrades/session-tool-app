-- Cloud MT5 (23 Oct 2026): MT5 accounts a member asks the Session Terminal server to run 24/7 with the EA, so the app,
-- trading from it, nudges and the copier work with their computer off. See cloud/README.md.
--
-- The MT5 password is encrypted in the member's browser with the server's public key (cloud_hosts.public_key, RSA-OAEP
-- SHA-256) before it leaves the page. Only that server holds the private key, so the database, the app and the admin
-- see ciphertext only. A member controls their account: removing the row stops that MT5 and deletes its folder and
-- stored login on the server (FTMO, 23 Oct: "each trader should retain control of their own accounts").
-- Open to every signed-in member since 24 Oct 2026 (see the end of this file): a trial member 1 account, a paid member 5,
-- a server its capacity.

create table if not exists public.cloud_hosts (
  id         text primary key,                 -- e.g. 'uk1'
  region     text not null,
  public_key text not null,                    -- SPKI, base64
  capacity   int  not null default 15,    -- MT5 + EA ~600-700 MB all-in; uk1 has 12 GB
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.cloud_hosts enable row level security;
drop policy if exists cloud_hosts_read on public.cloud_hosts;
create policy cloud_hosts_read on public.cloud_hosts for select to authenticated using (active);
revoke insert, update, delete on public.cloud_hosts from anon, authenticated;

create table if not exists public.cloud_mt5 (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  host_id      text not null references public.cloud_hosts(id),
  login        bigint not null,
  server       text not null,
  enc_password text not null,
  app_trading  boolean not null default true,  -- the EA's App trading switch at its first start
  status       text not null default 'pending', -- pending | starting | running | error
  status_msg   text,
  status_at    timestamptz,
  created_at   timestamptz not null default now(),
  unique (login, server)
);
alter table public.cloud_mt5 enable row level security;
drop policy if exists cloud_mt5_own_select on public.cloud_mt5;
drop policy if exists cloud_mt5_own_insert on public.cloud_mt5;
drop policy if exists cloud_mt5_own_delete on public.cloud_mt5;
create policy cloud_mt5_own_select on public.cloud_mt5 for select to authenticated using (user_id = auth.uid());
create policy cloud_mt5_own_insert on public.cloud_mt5 for insert to authenticated
  with check (user_id = auth.uid() and public.st_is_admin() and status = 'pending');
create policy cloud_mt5_own_delete on public.cloud_mt5 for delete to authenticated using (user_id = auth.uid());
revoke update on public.cloud_mt5 from anon, authenticated;   -- only the server (through cloud-agent) moves the status
revoke all on public.cloud_mt5 from anon;

-- 23 Oct 2026, the alarm (applied as migration cloud_mt5_alarm). The agent reports every account every minute, so
-- status_at is the server's heartbeat. alert_state remembers what the member was last told, one push per incident.
alter table public.cloud_mt5 add column if not exists alert_state text;   -- null | 'down' | 'error'
alter table public.cloud_mt5 add column if not exists alert_at timestamptz;
create or replace function public.st_cloud_watch_due() returns boolean
language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1 from public.cloud_mt5
     where (status in ('running', 'starting') and coalesce(status_at, created_at) < now() - interval '4 minutes' and coalesce(alert_state, '') <> 'down')
        or (status = 'error' and coalesce(alert_state, '') <> 'error')
        or (alert_state is not null and status = 'running' and status_at > now() - interval '2 minutes')
  );
$$;
revoke all on function public.st_cloud_watch_due() from anon, authenticated;
-- st_minute_tick (live only, not mirrored in the repo) gained one block, before its calendar-sync block:
--   if public.st_cloud_watch_due() then net.http_post(nudge-cron, {"mode":"cloud"}) - nudge-cron's cloudWatch() pushes
--   "isn't answering" / the agent's error / "running again" (kind 'cloud', always sent except in quiet hours).

-- The charts a cloud MT5 opens, chosen by its member (23 Oct 2026, Nestor: "remove BTCUSD"). Null = every symbol its EA
-- reported from in the last 30 days, as before. The agent starts the MT5 again when the list changes (while prices run).
alter table public.cloud_mt5 add column if not exists symbols text[];

create or replace function public.st_cloud_set_symbols(p_id uuid, p_symbols text[]) returns boolean
language plpgsql security definer set search_path to 'public' as $$
declare v text[];
begin
  select array_agg(s order by o) into v from (
    select distinct on (s) s, o from unnest(coalesce(p_symbols, '{}'::text[])) with ordinality u(s, o)
     where s ~ '^[A-Za-z0-9._#+-]{1,32}$' order by s, o) x;
  if coalesce(array_length(v, 1), 0) > 20 then raise exception 'at most 20 charts'; end if;
  update public.cloud_mt5 set symbols = v where id = p_id and user_id = auth.uid();
  return found;
end $$;
revoke all on function public.st_cloud_set_symbols(uuid, text[]) from public, anon;
grant execute on function public.st_cloud_set_symbols(uuid, text[]) to authenticated;

-- MT5 in the cloud open to every member, trial included (24 Oct 2026, Nestor: "i need users to have access to these
-- features", "trial users are only allowed to sync 1 account"). The insert policy drops st_is_admin(); the trigger refuses
-- a full server (cloud_full), a trial member's second account (cloud_trial_limit) and a paid member's sixth
-- (cloud_user_limit). The admin is only held by the server's capacity. The app turns each code into its own sentence.
drop policy if exists cloud_mt5_own_insert on public.cloud_mt5;
create policy cloud_mt5_own_insert on public.cloud_mt5 for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');
create or replace function public.st_cloud_mt5_room() returns trigger language plpgsql security definer set search_path to 'public' as $$
declare cap int; n int; mine int; lim int;
begin
  select capacity into cap from public.cloud_hosts where id = new.host_id;
  select count(*) into n from public.cloud_mt5 where host_id = new.host_id;
  if cap is not null and n >= cap then raise exception 'cloud_full'; end if;
  if public.st_is_admin() then return new; end if;
  lim := case when public.st_my_plan() = 'trial' then 1 else 5 end;
  select count(*) into mine from public.cloud_mt5 where user_id = new.user_id;
  if mine >= lim then raise exception '%', case when lim = 1 then 'cloud_trial_limit' else 'cloud_user_limit' end; end if;
  return new;
end $$;
drop trigger if exists cloud_mt5_room on public.cloud_mt5;
create trigger cloud_mt5_room before insert on public.cloud_mt5 for each row execute function public.st_cloud_mt5_room();
-- uk1 was made with capacity 35 (the first default); 15 is what its 12 GB holds.
alter table public.cloud_hosts alter column capacity set default 15;
update public.cloud_hosts set capacity = 15 where id = 'uk1';
