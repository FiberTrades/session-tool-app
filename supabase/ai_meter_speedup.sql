-- ═══════════════════════════════════════════════════════════════════════════
-- AI METER — make the "AI Meter" tab load FAST.
-- The tab calls st_ai_usage_summary(), which GROUP BYs the WHOLE ai_usage table
-- every time. As greeting rows pile up that scan is what makes the tab sit on
-- "Loading…". This does two things:
--   1) A covering index so the aggregate is an index-only scan (semantics UNCHANGED).
--   2) An OPTIONAL rolling-window version of the RPC (much faster on a big table).
-- Run in the Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) COVERING INDEX — safe, no behaviour change. Lets Postgres aggregate straight
--    from the index without touching the table heap.
create index if not exists ai_usage_summary_cov
  on public.ai_usage (user_id, created_at)
  include (model, mode, input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) OPTIONAL: only summarise the last N days. The meter measures "spend since you
--    last set your credit balance", and you paste that balance recently — so a
--    rolling window (default 180 days) gives the same practical number while
--    scanning far fewer rows. Bump/lower the `180` to taste. Comment this whole
--    block out if you'd rather keep lifetime totals.
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
    and created_at >= now() - interval '180 days'
  group by user_id, day, model, mode;
$$;
revoke all     on function public.st_ai_usage_summary() from public;
grant  execute on function public.st_ai_usage_summary() to authenticated;
