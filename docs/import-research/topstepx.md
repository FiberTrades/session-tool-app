# TopstepX - research report (subagent, 27 Sep 2026)

Menu: Trades tab (bottom) -> Export -> date range -> Export. CSV. One account per export. Use TRADES export, not Orders.
Empty export: widen the date range (yesterday .. 2 days ahead). BOM: maybe (strip if present). XLSX: unverified.

Header, 11-col (real 2024 file, TradeZella sample):
Id,ContractName,EnteredAt,ExitedAt,EntryPrice,ExitPrice,Fees,PnL,Size,Type,TradeDay
37199170,NQM4,05/07/2024 13:33:37 +00:00,05/07/2024 13:34:07 +00:00,18228.250000000,18223.750000000,1.4000,90.000000000,1,Short,05/07/2024 05:00:00 +00:00
37419652,NQM4,05/07/2024 14:24:11 +00:00,05/07/2024 14:24:27 +00:00,18193.750000000,18190.500000000,4.2000,-195.000000000,3,Long,05/07/2024 05:00:00 +00:00

Header, 13-col (2026, TopSignal fixture "real Topstep sample" shape):
Id,ContractName,EnteredAt,ExitedAt,EntryPrice,ExitPrice,Fees,PnL,Size,Type,TradeDay,TradeDuration,Commissions
2815118967,MNQU6,07/02/2026 10:10:08 -04:00,07/02/2026 10:10:48 -04:00,30182.500000000,30148.750000000,2.22000,202.500000000,3,Short,07/02/2026 00:00:00 -05:00,00:00:39.6715820,1.50000

Row = closed round trip (entry matched to exit). Scale-ins -> several rows sharing ExitedAt/ExitPrice, adjacent Ids.
Partial exits -> several rows (one entry, multiple exits = 2 lines). Group into positions.
ContractName: root + month letter + 1-digit year (NQM4, MNQU6); root = drop last 2 chars.
Type Long/Short. Size positive int. Prices in points, 9 decimals.
Times: MM/DD/YYYY HH:MM:SS +-HH:MM, per-row offset (2024 +00:00; 2026 -04:00; possibly user's local tz) - always parse offset.
TradeDay: midnight Central; take date part as written.
TradeDuration: .NET TimeSpan hh:mm:ss.fffffff.
PnL: GROSS $ before fees (verified: (18190.5-18193.75)*3*$20 = -195). Negative with leading '-'. No $ or parentheses.
Fees: round-turn total for row (1.40/NQ contract). Commissions: separate col (13-col variant). Net = PnL - Fees - Commissions.
No SL/TP, no account column.
Gotchas: map by header name (11 vs 13 cols); decimals vary; rows not chronological; dedupe on Id.
Orders export (other format): AccountName, ContractName, ExecutePrice, FilledAt, PositionDisposition (Opening/Closing), Side (Bid/Ask), Size, Status (keep Filled) - header not verified verbatim.
Deltalytix topstep-sample.csv is invented - don't use.

Sources:
S1 https://help.topstep.com/en/articles/14434175-topstepx
S2 https://help.topstepx.com/components/trades.md
S3 https://help.tradezella.com/en/articles/9557681-topstepx-how-to-import-trades-from-topstepx-into-tradezella-using-the-file-upload-method
S4 https://tradesviz.crisp.help/en/article/how-to-import-trades-from-topstepx-to-tradesviz-trading-journal-1ti9tl0/
S5 TradeZella sample topstep_trades_export.csv (Intercom attachment linked from S3)
S6 https://raw.githubusercontent.com/squesalman/init-claude/main/docs/domain/topstep-import.md (+ importers/topstep.py, tests/fixtures/topstep_synthetic.csv)
S7 https://raw.githubusercontent.com/drewstake/TopSignal/main/backend/tests/fixtures/topstep_trade_export_utf8.csv (+ _utf8_bom.csv, docs/topstep-live-trade-imports.md, services/trade_imports.py, topstep_fees.py)
S8 https://raw.githubusercontent.com/Eleven-Trading/TradeNote/main/brokers/conversionScripts.md
S9 https://raw.githubusercontent.com/Eleven-Trading/TradeNote/main/src/utils/brokers.js
S10 https://admin.docs.projectx.com/docs/real-time-data/rest-api/data-export-trades/
S11 https://help.topstep.com/en/articles/8284213-topstepx-commissions-and-fees
S12 https://help.topstepx.com/components/orders.md
S13 https://raw.githubusercontent.com/hugodemenez/deltalytix/main/public/samples/import/topstep-sample.csv (invented)
