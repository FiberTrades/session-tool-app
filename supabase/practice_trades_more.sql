-- Practice trades keep what the Practice log's All Trades History table shows (Nestor, 17 Oct 2026: "can the log for practice
-- replay also look like this?"): the exit, the stop and the target (Aimed R · P, Risk · SL), the distance moved and its unit
-- (Real R · P), the risk in money (Risk) and how far price ran its way (Pot R · P). Until now a synced trade came back without
-- them. Applied 17 Oct 2026.
alter table public.practice_trades
  add column if not exists exit double precision,
  add column if not exists sl double precision,
  add column if not exists tp double precision,
  add column if not exists dist double precision,
  add column if not exists unit text,
  add column if not exists rm double precision,
  add column if not exists mfe double precision;
