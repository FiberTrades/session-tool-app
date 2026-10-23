-- Cloud MT5 (23 Oct 2026): MT5 accounts a member asks the Session Terminal server to run 24/7 with the EA, so the app,
-- trading from it, nudges and the copier work with their computer off. See cloud/README.md.
--
-- The MT5 password is encrypted in the member's browser with the server's public key (cloud_hosts.public_key, RSA-OAEP
-- SHA-256) before it leaves the page. Only that server holds the private key, so the database, the app and the admin
-- see ciphertext only. A member controls their account: removing the row stops that MT5 and deletes its folder and
-- stored login on the server (FTMO, 23 Oct: "each trader should retain control of their own accounts").
-- While it is tested, only the admin can add one (cloud_mt5_own_insert checks st_is_admin()).

create table if not exists public.cloud_hosts (
  id         text primary key,                 -- e.g. 'uk1'
  region     text not null,
  public_key text not null,                    -- SPKI, base64
  capacity   int  not null default 35,
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
