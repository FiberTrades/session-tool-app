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


-- BE-OFFSET SIMULATION
-- =====================================================================================
-- The clearance columns above say how much room each trade HAD. These say what each
-- candidate offset would have DONE, replayed bar by bar from the moment the stop really
-- moved. Ladder, in R past entry: 0, 0.25, 0.5, 0.75, 1.0, 1.5.
--
--   be_off_r[k]       what the trade would have been worth under offset k, in R.
--                     0 = scratched at entry, +0.5 = banked at a half-R stop,
--                     -1 = the original stop, tpR = the target.
--   be_off_missed[k]  1 = offset k stopped this trade AND the target was then validly
--                     reached, so that offset COST you the trade. Summed over winners,
--                     this is the answer to "how many would it have taken me out of".
--
-- "Validly" excludes the case the trader called out: if price runs past the ORIGINAL stop
-- before reaching the target, the trade was never going to be held that far, so it does
-- not count as a cost. The replay is spread-aware from MqlRates — a short exits on the
-- ask, so a stop can be filled by a bar whose plotted high never reached it.
--
-- NULL on both when the question does not arise: no TP, or the stop never moved to BE.

alter table public.trades_inbox
  add column if not exists be_off_r      jsonb,
  add column if not exists be_off_missed jsonb;

comment on column public.trades_inbox.be_off_r is
  'R outcome per BE-offset [0, 0.25, 0.5, 0.75, 1.0, 1.5] R past entry, replayed from the real BE-move time, spread-aware.';
comment on column public.trades_inbox.be_off_missed is
  '1 per offset where that offset stopped the trade and the TP was then reached without first breaching the original stop.';
