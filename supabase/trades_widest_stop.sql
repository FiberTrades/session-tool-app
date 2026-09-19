-- ─────────────────────────────────────────────────────────────────────────────
--  trades_inbox / trades_verified: sl_max_pips + risk_max_gbp — the widest stop a trade had
--  Sent by EA v8.4. Apply BEFORE deploying ingest-trade (which writes these columns) and before
--  the st_rebuild_leaderboard change that reads risk_max_gbp.
--
--  WHY
--  sl_pips / risk_gbp are the stop at ENTRY - the EA's stamp, written once at the fill. A stop
--  dragged further from entry afterwards raises the risk the trade really carried, and the
--  stamp can never show it. EA v8.4 takes the widest stop from every source it has: the stop on
--  the opening order (DEAL_SL of the entry deal), each move it logged live, and the stop MT5
--  recorded on each exit deal - that last one is kept by MT5 itself, so a stop widened while
--  the terminal was shut still counts if it is the stop that closed the trade.
--
--  NULL = an EA older than v8.4, or no stop was ever known. Never "the stop did not move".
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.trades_inbox
  add column if not exists sl_max_pips  numeric,
  add column if not exists risk_max_gbp numeric;
alter table public.trades_verified
  add column if not exists sl_max_pips  numeric,
  add column if not exists risk_max_gbp numeric;

create or replace function public.st_archive_trade()
 returns trigger
 language plpgsql
 security definer
as $function$
begin
  insert into public.trades_verified (
    user_id, ticket, symbol, direction, lots, entry_price, exit_price,
    open_time, close_time, pnl, costs, sl_pips, risk_gbp, tp_r, tp_pips,
    mfe_pips, mfe_r, exit_count, sl_max_pips, risk_max_gbp
  ) values (
    new.token, new.ticket, new.symbol, new.direction, new.lots, new.entry_price,
    new.exit_price, new.open_time, new.close_time, new.pnl, new.costs, new.sl_pips,
    new.risk_gbp, new.tp_r, new.tp_pips, new.mfe_pips, new.mfe_r,
    case when jsonb_typeof(new.exits)='array' then jsonb_array_length(new.exits) end,
    new.sl_max_pips, new.risk_max_gbp
  )
  on conflict (user_id, ticket) do update set
    -- a re-push of the same ticket may carry detail the first one lacked
    close_time   = coalesce(excluded.close_time,   trades_verified.close_time),
    pnl          = coalesce(excluded.pnl,          trades_verified.pnl),
    costs        = coalesce(excluded.costs,        trades_verified.costs),
    sl_pips      = coalesce(excluded.sl_pips,      trades_verified.sl_pips),
    risk_gbp     = coalesce(excluded.risk_gbp,     trades_verified.risk_gbp),
    tp_r         = coalesce(excluded.tp_r,         trades_verified.tp_r),
    mfe_r        = coalesce(excluded.mfe_r,        trades_verified.mfe_r),
    exit_count   = coalesce(excluded.exit_count,   trades_verified.exit_count),
    -- the widest stop only ever widens: a re-push can add evidence, never take it away
    sl_max_pips  = greatest(excluded.sl_max_pips,  trades_verified.sl_max_pips),
    risk_max_gbp = greatest(excluded.risk_max_gbp, trades_verified.risk_max_gbp);
  return new;
end;
$function$;
