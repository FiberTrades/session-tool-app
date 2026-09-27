# Trade import formats — research checklist (27 Sep 2026)

Goal: let traders on other platforms import their closed trades into Session Tool from the export file
their platform already makes, alongside the existing MT5 report import. **Rule for this build (Nestor): no
guessing.** Every reader must pass on a real export from a real account before it ships.

Status keys:
- **✅ real file (public)** — seen in a real export someone published (help-centre sample, anonymised user file).
- **🟡 fixture only** — seen only in an open-source project's test file (probably real-shaped, origin not stated).
- **❓ unverified** — no file seen; don't build on it.
- **Our file** column — ✔ once we hold a real export from one of our own users / demo accounts.

Full research notes with every source URL: `docs/import-research/` (topstepx, tradovate, ninjatrader,
ctrader, rithmic). The key sources are also listed per platform below.

---

## Cross-platform facts that shape the design

| | TopstepX | Tradovate (Orders) | NinjaTrader (Trades grid) | cTrader (History) | Rithmic R\|Trader Pro |
|---|---|---|---|---|---|
| One row is… | a finished trade (entry→exit) | an **order** (incl. cancelled) | a finished trade | one **closing deal** | an **order** |
| Needs pairing into trades? | group partial exits | **yes** (FIFO) | no | group partial closes | **yes** (FIFO) |
| P&L in the file | gross $; fees + commissions separate | **none** | **net** $ (Profit) | Gross + Net + Swap + Commission | **none** |
| Fees | Fees + Commissions columns | **none** in file | Commission (+ 4 fee cols in newer) | Commission, Swap | rate per contract |
| Stop loss / target | ❌ | ✅ bracket legs' Stop/Limit price | ❌ (order names only) | ❌ | ❌ (stop orders, no stop price seen) |
| Timezone | offset on **every row** | **none — must ask** | **none — must ask** | sometimes in header `(UTC±N)`, else ask | in header name e.g. `(EDT)` |
| Stable ID for de-duplication | `Id` | Order ID | ❌ none (Trade number = row no.) | ID (deal) / Order ID | Order Number |
| Columns fixed? | 11 or 13 (map by name) | 26 or 32 (map by name) | **user-controlled**, can be localised | **user-controlled**, can be localised | **user-controlled** |
| Dates | `MM/DD/YYYY HH:MM:SS ±HH:MM` | `MM/DD/YYYY HH:MM:SS` | follows Windows locale | `DD/MM/YYYY HH:MM:SS.fff` | `YYYY-MM-DD HH:MM:SS` |

Consequences:
1. **Map columns by header name, never by position** (all five change columns).
2. **Ask the timezone** when the file doesn't carry it (Tradovate, NinjaTrader, some cTrader).
3. **Pairing orders into trades** (Tradovate Orders, Rithmic) needs each futures contract's **point value**
   ($ per 1.00 point, e.g. MNQ, NQ, MES, ES…). That table must come from the exchange's (CME) contract
   specs — to be sourced, not typed from memory.
4. **R needs a stop**: only Tradovate Orders carries stop prices. Everyone else types the SL (or risk) after
   importing — as manual trades do today.
5. Imported trades feed the journal, stats, reviews and prop-firm progress; **not** the leaderboard
   (verified EA trades only) or Trade Replay (EA trades only) — see the feature table in the chat of 27 Sep.
6. The existing **MT5 report import is untouched**; its file picker currently lists `.csv` but only reads MT5
   HTML (a CSV fails with "Could not parse this file") — fix as part of this build.

---

## TopstepX — Trades export ✅ real file (public)

- **Where:** TopstepX → **Trades** tab (bottom) → Export → date range → Export. CSV. One account per file.
  Use **Trades**, not Orders. Empty file → widen the date range.
- **Header (current, 13 cols)** 🟡 fixture (TopSignal "real Topstep sample" shape, 2026):
  `Id,ContractName,EnteredAt,ExitedAt,EntryPrice,ExitPrice,Fees,PnL,Size,Type,TradeDay,TradeDuration,Commissions`
- **Header (older, 11 cols)** ✅ real file (TradeZella sample, 2024):
  `Id,ContractName,EnteredAt,ExitedAt,EntryPrice,ExitPrice,Fees,PnL,Size,Type,TradeDay`
  `37419652,NQM4,05/07/2024 14:24:11 +00:00,05/07/2024 14:24:27 +00:00,18193.750000000,18190.500000000,4.2000,-195.000000000,3,Long,05/07/2024 05:00:00 +00:00`
- Row = one round trip. Scale-ins / partial exits = several rows (same ExitedAt for scale-ins) → group.
- `ContractName` = root + month letter + 1-digit year (`NQM4`, `MNQU6`). `Type` = Long/Short.
- `PnL` = **gross** $ (✅ checked: (18190.5−18193.75)×3×$20 = −195). `Fees` = round-turn total.
  Net = PnL − Fees − Commissions. Negatives with `-`, no `$`.
- Times carry their own offset per row — parse it. `TradeDay` = trading day; take the date as written.
- No SL/TP, no account column. Rows not in time order. De-duplicate on `Id`. BOM possible.
- **Still needed:** a real **13-column** export from a current Topstep user.
- Sources: help.topstep.com/en/articles/14434175-topstepx · help.topstepx.com/components/trades.md ·
  help.tradezella.com (TopstepX file upload article + sample) · github drewstake/TopSignal fixtures ·
  squesalman/init-claude docs/domain/topstep-import.md.

## Tradovate — Orders export ✅ real file (public, anonymised Tradeify file)

- **Where:** Tradovate web → **Reports** → Report Type **Orders** → dates → GO → CSV
  (desktop: account → gear → Account Reports → Orders → Download).
- **Header (32 cols):**
  `orderId,Account,Order ID,B/S,Contract,Product,Product Description,avgPrice,filledQty,Fill Time,lastCommandId,Status,_priceFormat,_priceFormatType,_tickSize,spreadDefinitionId,Version ID,Timestamp,Date,Quantity,Text,Type,Limit Price,Stop Price,decimalLimit,decimalStop,Filled Qty,Avg Fill Price,decimalFillAvg,Venue,Notional Value,Currency`
  (older files: first 26 columns only).
  `537862110206,ACCT0000000000000,537862110206, Sell,MNQU6,MNQ,Micro E-mini NASDAQ-100,30740.75,5,06/16/2026 10:19:37,537862110218, Filled,-2,0,0.25,,537862110218,06/16/2026 09:10:14,6/16/26,5,multibracket, Stop,,30747.50,,30747.5,5,30740.75,30740.75,,"307,407.50",USD`
- Row = an order (Filled or Canceled); Filled rows carry total qty + average fill price.
  **Leading spaces** in B/S, Status, Type → trim. Keep `Filled`.
- `Fill Time` = fill time; `Timestamp` = order placed; `Date` (M/D/YY) = placed date — don't use as fill day.
- Bracket legs carry `Stop Price` / `Limit Price` → **SL/TP recoverable → R**.
- **No P&L and no fee column** → FIFO pairing per contract + point value; fees entered separately.
- **No timezone** in the file (default local, or Central) → ask.
- Alternatives (pre-paired, simpler, no account/side/stops/fees): **Performance** ✅
  (`pnl` like `$(400.00)` / `"$1,200.00"`, gross) and **Position History** ✅ (has Account, plain `-12.50`).
- **Still needed:** our own Orders export (a demo/sim account is enough).
- Sources: support.tradovate.com "Tradovate Account Reports" · github Richy701/FreeTradeJournal fixtures ·
  GeneBO98/tradetally fixtures + parser · community.tradovate.com (commission, timezone threads) ·
  TradeZella / TradesViz Tradovate guides.

## NinjaTrader 8 — Trade Performance export ✅ real file (public, anonymised user file) + official docs

- **Where:** Control Center → New → Trade Performance → From/To → Generate → Display **Trades** (or
  Executions) → right-click grid → Export → CSV. **Display units must be Currency.**
- **Trades grid** (row = one round trip, official; Profit is **net**, official formula):
  default `Trade number,Instrument,Account,Strategy,Market pos.,Qty,Entry price,Exit price,Entry time,Exit time,Entry name,Exit name,Profit,Cum. net profit,Commission,MAE,MFE,ETD,Bars`
  newer adds `Clearing Fee,Exchange Fee,IP Fee,NFA Fee` 🟡 fixture.
  `1,MES 09-26,SIM101,ATM Strategy,Short,1,7427.50,7423.50,7/28/2026 9:45:17 AM,7/28/2026 9:46:05 AM,Entry,Target2,$20.00,$20.00,$0.00,...` 🟡
- **Executions grid** (row = one fill): `Instrument, Action, Quantity, Price, Time, ID, E/X, Position, Order ID, Name, Commission, Rate, Account Display Name, Connection` (official);
  real user file ✅: `Instrument,Action,Time,Price,E/X,Connection,Quantity,Account display name` /
  `MNQZ6,Sell,9/15/2026 9:39,29441.25,Exit,TRADEIFY,6,ACCOUNT-1`.
- **Everything follows the trader's settings:** column order/visibility, header **language** (French seen),
  dates (`7/28/2026 9:45:17 AM`, `27/04/2026 6:05:02`), decimal commas with `;` separators, money as
  `$20.00` or `90.00 $`, instrument naming `MES 09-26` / `NQ JUN26` / `MNQZ6`. No timezone → ask.
- Trades grid has **MAE/MFE** in $ (useful: Pot R). No stop prices anywhere (order names like Target1).
- No stable ID in Trades grid; report can include trades before the From date → overlapping exports duplicate.
  Identical Executions rows can be genuine separate fills — don't de-duplicate by content.
- **Still needed:** our own exports — Nestor can make them free on NinjaTrader's Sim101 account
  (Trades + Executions, in his own regional settings).
- Sources: static.ninjatrader.com/support/helpGuides/nt8 (performance_displays, using_trade_performance,
  executions_tab, statistics_definitions, trade) · edgewonk NinjaTrader article · github LuxAlgo/trade-journal
  issue #10 + fixture · GeneBO98/tradetally tests · hugodemenez/deltalytix ninjatrader-number-parser.ts.

## cTrader — History statement 🟡 fixture only (+ official docs)

- **Where:** History tab → right-click header to choose columns → **Statement** → xlsx / HTML → Save as CSV.
  Excel/CSV only on **Windows desktop**; Mac and Web give HTML.
- Official columns: ID (deal), Order ID, Symbol, Opening direction, Closing direction, Opening time, Closing
  time, Entry price, Closing price, Closing quantity (lots), Closing volume, Requested quantity, Swap,
  Commissions, Pips, Gross (ccy), Net (ccy), Gross (USD), Net (USD), Label, Comment, Balance (ccy), Channel.
- 🟡 xlsx fixture: `Order ID | Symbol | Opening direction | Closing time | Entry price | Closing price | Closing Quantity | Swap | Commission | Gross AUD | Net AUD | Balance AUD | Pips`
  `OID329360964 | CADJPY | Buy | 17/01/2026 01:54:32.633 | 114.285 | 113.557 | 0.5 | -1.27 | -4.49 | -344.63 | -350.39 | 17458.89 | -72.8`
  (Net = Gross + Swap + Commission ✅ arithmetic.)
- Row = one **closing deal** (official). Partial closes = separate rows. FIFO.
- Headers vary: only ticked columns; case; `(UTC±N)` suffix on times; currency inside the name
  (`Gross AUD`, `Net $`, `Balance €`); Spanish headers seen. Quantity `0.5` or `2.00 Lots`.
  Dates DD/MM/YYYY as text. Thousands separator may be a space.
- No SL/TP. Don't accept the **backtest** export (different file).
- **Still needed:** our own Windows-desktop export (free demo account).
- Sources: help.ctrader.com (history, user-time-offset, positions-and-deals) · community.ctrader.com staff
  posts · github abhidp/trading-notional-volume-calculator, GeneBO98/tradetally, For-zenx/TradeSX.

## Rithmic R|Trader Pro — Completed Orders export ✅ real file (public, TradeZella sample)

- **Where:** Recent Orders (today) or File → Order(s) History; Completed Orders → right-click headings →
  add **Qty Filled** (and Order Number) → Export as CSV. **One day per file.** Only visible columns export.
- File has sections: `Working Orders` header, blank lines, then `Completed Orders` + its header:
  `"Account","Status","Remarks","Buy/Sell","Qty To Fill","Max Show Qty","Symbol","Price Type","Avg Fill Price","Limit Price","Order Number","Original Sequence Number","Current Sequence Number","User Id","Update Time (EDT)","Qty Filled","Create Time (EDT)","Commission","Liquidity Indicator","Executing Venue","Commission Fill Rate"`
  `"APEX-33521-11","Filled","","S","2","","MNQM4","M","17771.6250","","1284801488","AAG1VGEK","AAG20H33","APEX-33521","2024-04-24 09:52:19","2","2024-04-24 09:42:38","","","","0.51"`
- Row = an order (total Qty Filled + average price). `B`/`S`; `M`/`L`/`STP`; `Filled`/`Cancelled`.
- **No P&L** → FIFO pairing + point value. Commission = Commission Fill Rate × Qty Filled (inferred).
- Timezone only in the header name (`(EDT)`, `(PDT)`); rows sorted by order number, not time.
- **Still needed:** a real export from an Apex/Bulenox member (needs a Rithmic account).
- Sources: help.tradezella.com Rithmic R|Trader file-upload article + sample · TradeNote brokers.js ·
  deltalytix rithmic processor · community.optimusfutures.com threads · journalit Rithmic guide.

---

## Suggested build order (each only after its real file arrives)

1. **Groundwork:** rename "Import from MT5" → "Import trades"; shared CSV reader (quotes, BOM, `;`, decimal
   commas, `$( )` negatives, spaced thousands); header-name mapping; timezone question; fix the `.csv` picker.
2. **TopstepX** — already finished trades, per-row timezone, stable Id. Simplest.
3. **NinjaTrader Trades grid** — finished trades, net P&L, MAE/MFE; Nestor can make real files on Sim101.
4. **cTrader** — closing deals, net/gross given.
5. **Tradovate Orders** — needs pairing + point values; gives stops → R.
6. **Rithmic** — needs pairing; one day per file; column setup.
7. **"Match your columns"** fallback for any other broker.
