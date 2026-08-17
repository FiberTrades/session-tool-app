-- ─────────────────────────────────────────────────────────────────────────────
--  trades_inbox.sl_moves / tp_moves — where the stop and target were MOVED to
--  Applied to production 2026-08-17 (migration: trades_inbox_add_sl_tp_moves)
--
--  SHAPE: [[epoch_seconds, price], ...]
--
--  WHY THE EA HAS TO CAPTURE THIS LIVE
--  MT5 keeps no history of stop or target modifications. Once a position closes, where you
--  had moved your stop to is gone — the same reason the EA already kept a _lsl global. So
--  each change is appended on the tick (SyncTrackMFE) and shipped with the trade at CLOSE,
--  not on the post-mortem: the EA has the history in hand the moment the position closes,
--  whereas the post-mortem resolves hours later off bars that do not exist yet.
--
--  NULL IS NOT "NEVER MOVED"
--  It also covers a trade taken before the EA build that records this, and a stop moved from
--  a phone while the terminal was shut. Read it as "not observed". The replay therefore draws
--  no live line at all when it is null, rather than drawing one flat on the original and
--  implying the stop demonstrably never moved.
--
--  A price of 0 is a REMOVAL — the stop or target was cleared — and is kept deliberately:
--  "he took the stop off" is a finding, not missing data.
--
--  Bounded at 12 entries per trade in the EA (MM_MOVE_MAX), so a position trailed on every
--  tick cannot fill the terminal's GlobalVariable store.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.trades_inbox add column if not exists sl_moves jsonb;
alter table public.trades_inbox add column if not exists tp_moves jsonb;
