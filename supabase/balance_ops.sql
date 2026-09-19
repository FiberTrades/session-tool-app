-- ─────────────────────────────────────────────────────────────────────────────
--  balance_ops - money moved in or out of an MT5 account that is NOT a trade
--  Sent by EA v8.5 (withdrawals only: DEAL_TYPE_BALANCE deals with a negative amount).
--  Written by ingest-trade (service role, kind = "balance"); read by the app to offer each
--  withdrawal as a payout, then stamped handled_at so it is never offered twice.
--
--  WHY A TABLE OF ITS OWN
--  trades_inbox rows are trades: the importer, the leaderboard archive trigger and the replay
--  all assume a symbol, prices and a P&L. A withdrawal has none of those, and letting one into
--  that pipeline would put a -5,000 "trade" into someone's stats.
--
--  token = the member's user id (as trades_inbox), never the sync secret.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.balance_ops (
  token      uuid        not null,
  deal       bigint      not null,           -- MT5 deal ticket: unique per broker server
  login      bigint,                          -- the MT5 account it happened on
  amount     numeric     not null,            -- negative = money taken out
  op_time    timestamptz,
  comment    text,                            -- the broker's own label, e.g. "Withdrawal"
  created_at timestamptz not null default now(),
  handled_at timestamptz,                     -- recorded as a payout, or dismissed as not one
  primary key (token, deal)
);

alter table public.balance_ops enable row level security;
revoke all on public.balance_ops from anon;
revoke all on public.balance_ops from authenticated;
grant select on public.balance_ops to authenticated;
grant update (handled_at) on public.balance_ops to authenticated;

create policy balance_ops_select_own on public.balance_ops
  for select to authenticated using (token = auth.uid());
create policy balance_ops_update_own on public.balance_ops
  for update to authenticated using (token = auth.uid()) with check (token = auth.uid());
