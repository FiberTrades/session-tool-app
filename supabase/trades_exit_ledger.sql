-- ─────────────────────────────────────────────────────────────────────────────
--  trades_inbox.exits / trades_verified.exit_count — scale-outs
--  Applied to production 2026-08-21 (migrations: trades_add_exit_ledger,
--  tp_pulled_ignores_scaled_out_trades)
--
--  SHAPE: exits = [[epoch_seconds, price, volume], ...]
--
--  WHY IT IS NEEDED AT ALL
--  The EA already gets this right where it matters. SyncCollectAndPush selects a position's
--  deals with HistorySelectByPosition and folds them into ONE row: entry and exit are
--  volume-weighted, pnl sums profit + swap + commission, open_time is the first IN deal and
--  close_time the last OUT. So a trader taking three partials produces one trade, with the
--  true total. Nothing double-counts and nothing goes missing, and the 5-second dedup in
--  st_rebuild_leaderboard never engages because that collapses multiple ENTRIES.
--
--  What is lost is the fact that it happened. Two consequences:
--    1. exit_price becomes a volume-weighted average the chart never printed, so anything
--       drawing "where the trade ended" shows a level that did not exist.
--    2. tp_pulled read a deliberate scale-out as a pulled target — TP set, price reached it,
--       realised R short of it. All three are true of half at 1R and half at a 2R target.
--
--  NULL IS NOT "ONE EXIT"
--  It also covers every trade written before the EA ships the ledger. Read it as "not
--  observed" and fall back to the original behaviour: coalesce(exit_count,1) <= 1 leaves every
--  historical row meaning exactly what it meant before. Verified by rebuilding the whole
--  leaderboard against a fingerprint of all 33 rows — byte-identical.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.trades_inbox    add column if not exists exits      jsonb;
alter table public.trades_verified add column if not exists exit_count integer;

-- st_archive_trade also carries exit_count across, derived from the ledger's length.
-- See the migration trades_add_exit_ledger for the full function body.
