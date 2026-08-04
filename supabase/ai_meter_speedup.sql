-- ═══════════════════════════════════════════════════════════════════════════
-- AI METER — make the "AI Meter" tab load FAST.
-- The tab calls st_ai_usage_summary(), which GROUP BYs the WHOLE ai_usage table
-- every time. As greeting rows pile up, that scan is what makes the tab sit on
-- "Loading…".
--
-- This is a SAFE, behaviour-preserving speedup: a covering index that lets
-- Postgres aggregate straight from the index without touching the table heap.
-- Same numbers, same everything — just faster. It does NOT change the app build
-- (no index.html / edge redeploy needed); it's a database-only change.
--
-- Run once in the Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════

create index if not exists ai_usage_summary_cov
  on public.ai_usage (user_id, created_at)
  include (model, mode, input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens);
