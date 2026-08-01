-- ═══════════════════════════════════════════════════════════════════════════
-- AI METER — per-user token usage for the admin Settings → AI Meter tab.
-- Run this ONCE in the Supabase SQL Editor. Then redeploy the st-assistant edge
-- function (it now writes a row here per Claude call).
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.ai_usage (
  id                    bigint generated always as identity primary key,
  user_id               uuid not null,
  created_at            timestamptz not null default now(),
  model                 text,
  mode                  text,            -- 'greet' | 'coach' | 'chat' — lets the meter break out greeting spend
  input_tokens          int not null default 0,
  output_tokens         int not null default 0,
  cache_creation_tokens int not null default 0,
  cache_read_tokens     int not null default 0
);
alter table public.ai_usage add column if not exists mode text;   -- for tables created before this column existed
create index if not exists ai_usage_user_idx    on public.ai_usage(user_id);
create index if not exists ai_usage_created_idx on public.ai_usage(created_at);

-- RLS on, with NO user policies: the edge function inserts with the service-role
-- key (bypasses RLS), and the admin reads ONLY through the gated RPC below.
alter table public.ai_usage enable row level security;

-- Admin-only aggregate (per user + day + model). The day lets the tab break a user
-- down by day / week / month. Non-admins get an empty result set.
-- DROP first: Postgres won't let create-or-replace change a function's return columns.
drop function if exists public.st_ai_usage_summary();
create or replace function public.st_ai_usage_summary()
returns table(
  user_id uuid, day date, model text, mode text, calls bigint,
  input_tokens bigint, output_tokens bigint,
  cache_creation_tokens bigint, cache_read_tokens bigint
)
language sql
security definer
set search_path = public
as $$
  select user_id,
         (created_at at time zone 'Europe/London')::date as day,
         model, mode, count(*)::bigint,
         sum(input_tokens)::bigint,          sum(output_tokens)::bigint,
         sum(cache_creation_tokens)::bigint, sum(cache_read_tokens)::bigint
  from public.ai_usage
  where lower(coalesce(auth.jwt() ->> 'email', '')) = 'be.o2@hotmail.com'   -- ← your admin email
  group by user_id, day, model, mode;
$$;

revoke all     on function public.st_ai_usage_summary() from public;
grant  execute on function public.st_ai_usage_summary() to authenticated;
