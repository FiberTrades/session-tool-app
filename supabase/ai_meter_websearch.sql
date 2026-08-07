-- ═══════════════════════════════════════════════════════════════════════════
-- AI METER — web-search cost tracking.
-- Anthropic bills server-side web search SEPARATELY from tokens (~$0.01 per
-- search / $10 per 1,000). The ECA actuals fetcher does ~5 searches per run, so
-- without counting them the meter's token-only estimate under-counts and the
-- credit "left" figure drifts ABOVE the real claude.com balance.
--
-- Run this ONCE in the Supabase SQL editor. Then:
--   1. redeploy the st-assistant edge function (now writes web_search_requests), and
--   2. update the ECA worker (forex-worker) to write web_search_requests too — see chat.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.ai_usage
  add column if not exists web_search_requests int not null default 0;

-- Recreate the admin aggregate to also sum web searches per user + day + model.
-- DROP first: Postgres won't let create-or-replace change a function's return columns.
drop function if exists public.st_ai_usage_summary();
create or replace function public.st_ai_usage_summary()
returns table(
  user_id uuid, day date, model text, mode text, calls bigint,
  input_tokens bigint, output_tokens bigint,
  cache_creation_tokens bigint, cache_read_tokens bigint,
  web_search_requests bigint
)
language sql
security definer
set search_path = public
as $$
  select user_id,
         (created_at at time zone 'Europe/London')::date as day,
         model, mode, count(*)::bigint,
         sum(input_tokens)::bigint,          sum(output_tokens)::bigint,
         sum(cache_creation_tokens)::bigint, sum(cache_read_tokens)::bigint,
         sum(web_search_requests)::bigint
  from public.ai_usage
  where lower(coalesce(auth.jwt() ->> 'email', '')) = 'be.o2@hotmail.com'   -- ← your admin email
  group by user_id, day, model, mode;
$$;

revoke all     on function public.st_ai_usage_summary() from public;
grant  execute on function public.st_ai_usage_summary() to authenticated;
