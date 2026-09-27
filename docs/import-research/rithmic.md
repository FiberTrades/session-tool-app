# Rithmic R|Trader Pro - research report (subagent, 27 Sep 2026)

Key source: TradeZella's real "correct file" sample (signed link from https://help.tradezella.com/en/articles/6839918-...).
No official Rithmic manual text readable.

Menu: "Recent Orders" (today) or "File -> Order(s) History" (older days). Completed Orders section: right-click headings -> Add/Remove columns -> add "Qty Filled" (and "Order Number"). Export CSV via clipboard icon / "Export as CSV".
ONE DAY per export. Hidden columns are not exported; column set/order depends on the user's layout (TradeNote: reset to original template).

Raw layout (LF, no BOM), preamble sections:
Working Orders
"Account","Status","Buy/Sell","Qty To Fill",...,"Update Time (EDT)",...,"Position Disposition",...,"Create Time (EDT)","Liquidity Indicator","Executing Venue"
<blank>
<blank>
Completed Orders
"Account","Status","Remarks","Buy/Sell","Qty To Fill","Max Show Qty","Symbol","Price Type","Avg Fill Price","Limit Price","Order Number","Original Sequence Number","Current Sequence Number","User Id","Update Time (EDT)","Qty Filled","Create Time (EDT)","Commission","Liquidity Indicator","Executing Venue","Commission Fill Rate"
"APEX-33521-11","Filled","","B","1","","MNQM4","M","17730.0000","","1285662879","AAG2X5HQ","AAG2X5HQ","APEX-33521","2024-04-24 10:30:05","1","2024-04-24 10:30:05","","","","0.51"
"APEX-33521-11","Cancelled","","B","1","","MNQM4","STP","","","1285638967","AAG2W353","AAG3DBD3","APEX-33521","2024-04-24 10:55:32","0","2024-04-24 10:28:11","","","","0.51"
"APEX-33521-11","Filled","","S","2","","MNQM4","M","17771.6250","","1284801488","AAG1VGEK","AAG20H33","APEX-33521","2024-04-24 09:52:19","2","2024-04-24 09:42:38","","","","0.51"
- section titles bare (unquoted); all values quoted; trailing 2 blank lines
- row = ORDER (total Qty Filled + VWAP Avg Fill Price, e.g. 17771.6250 not a tick)
- Buy/Sell B/S; Price Type M/L/STP; Status Filled/Cancelled (TradeNote mentions Failed)
- Avg Fill Price 4 dp; Limit Price 2 dp
- Symbol MNQM4 (root+month+1-digit yr); no exchange col
- Commission empty; Commission Fill Rate 0.51 (per contract per side, inferred) -> commission = rate x Qty Filled
- NO P&L column -> FIFO pairing + point value
- Timestamps YYYY-MM-DD HH:MM:SS; zone only in HEADER NAME e.g. "Update Time (EDT)" (user's PC local tz; PDT seen too)
- rows sorted by Order Number desc, not time; same-second rows exist
- stop/limit: Price Type STP rows (cancelled stops) carry... Limit Price col only; stop price column not in sample
Parsers: find header after "Completed Orders"; match "Update Time" by prefix; root = slice(0,-2); FIFO per account+symbol sorted by Update Time (tie: Order Number); filter Qty Filled > 0 (inferred, safer than Status).
Unverified: Order History export also includes Working Orders?; Position Disposition values; "Rithmic Performance" format (Deltalytix synthetic: Entry Order Number,Entry Buy/Sell,Entry Price,Entry Time,Exit Order Number,Exit Price,Exit Time,Fill Size,Trade P&L,Trade Life Span,Commission & Fees).
Excel re-saved files may have DD/MM/YYYY HH:mm.

Sources:
https://help.tradezella.com/en/articles/6839918-rithmic-r-trader-how-to-import-trades-from-rithmic-r-trader-into-tradezella-using-the-file-upload-method
https://raw.githubusercontent.com/Eleven-Trading/TradeNote/main/src/utils/brokers.js
https://raw.githubusercontent.com/Eleven-Trading/TradeNote/main/brokers/README.md
https://raw.githubusercontent.com/hugodemenez/deltalytix/main/app/%5Blocale%5D/dashboard/components/import/rithmic/rithmic-order-processor-new.tsx
https://raw.githubusercontent.com/hugodemenez/deltalytix/main/lib/rithmic-performance-import.ts
https://journalit.co/docs/broker-guides-rithmic
https://tradesviz.crisp.help/en/article/how-to-import-trades-from-rithmic-trader-pro-instructions-to-tradesviz-trading-journal-1vrmdb
https://trademetria.com/integrations/rithmic-trader
https://community.optimusfutures.com/t/export-all-trades-order-history/5965
https://community.optimusfutures.com/t/risk-parameter-time-zones/4843
https://community.optimusfutures.com/t/question-about-order-history-using-r-trader/4628
