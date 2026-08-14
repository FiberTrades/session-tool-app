-- BE-stop clearance, in pips and in R
-- =====================================================================================
-- Answers: "how many of my winners would have been stopped if my BE stop sat N past
-- entry instead of AT entry?"
--
-- The existing be_slack_pips cannot answer it. Its accumulator is clamped at zero, so it
-- only records price CROSSING entry — which is precisely what never happens on a winner.
-- Every winning trade stores 0 and the question is unanswerable from stored data.
--
-- be_clear_pips is the same measurement with the clamp removed, negated: the CLOSEST
-- price came to entry after the stop moved to BE, on the profit side.
--   be_clear_pips = 3.2  -> price never came nearer than 3.2 pips above entry.
--                           A BE offset up to +3.2 would still have survived.
--   be_clear_pips = 0.4  -> a +0.5 offset would have stopped this trade.
--   NULL                 -> not applicable: no TP set, or the stop never moved to BE.
--
-- be_clear_r is the same figure divided by the trade's stop distance, so the two are one
-- measurement in two units. Both are stored because "+0.5" means different things in each:
-- on a 4-pip stop, 0.5R is 2 pips.
--
-- Run in the Supabase SQL editor. Safe to re-run.

alter table public.trades_inbox
  add column if not exists be_clear_pips numeric,
  add column if not exists be_clear_r    numeric;

comment on column public.trades_inbox.be_clear_pips is
  'Closest approach to entry (pips, profit side) after the stop moved to BE, until TP. Larger = more room a BE offset had. NULL when no TP or no BE move.';
comment on column public.trades_inbox.be_clear_r is
  'be_clear_pips expressed in R (divided by the trade''s stop distance).';

-- Partial index: the analysis only ever reads rows where the question applies.
create index if not exists trades_inbox_be_clear_idx
  on public.trades_inbox (token, be_clear_pips)
  where be_clear_pips is not null;
