# cTrader - research report (subagent, 27 Sep 2026)

No fixed format: only ticked History columns are exported; header wording varies; tz + currency inside header text. Match headers loosely.
Menu (official): History tab -> right-click header to choose columns -> Statement -> HTML or .xlsx statement -> Save as CSV. Excel/CSV dropdown = Windows Desktop only; Mac .htm only; Web HTML (CSV save button bug 2024).
Documented columns: ID (deal ID), Order ID, Symbol, Opening direction, Closing direction, Opening time, Closing time, Entry price, Closing price, Closing quantity (lots), Closing volume (currency), Requested quantity, Swap, Commissions, Pips, Gross (ccy), Net (ccy), Gross (USD), Net (USD), Label, Comment, Balance (ccy), Channel (+ web: Last modified, Margin).
NO SL/TP column. Row = one CLOSING DEAL, not a position. FIFO closes; each closing row has the entry price of the opening deal it closed.

Sample A (xlsx fixture, abhidp repo, sheet "Records"):
Order ID | Symbol | Opening direction | Closing time | Entry price | Closing price | Closing Quantity | Swap | Commission | Gross AUD | Net AUD | Balance AUD | Pips
OID329360964 | CADJPY | Buy | 17/01/2026 01:54:32.633 | 114.285 | 113.557 | 0.5 | -1.27 | -4.49 | -344.63 | -350.39 | 17458.89 | -72.8
- dates as TEXT DD/MM/YYYY HH:MM:SS.fff; numbers numeric '.'; OID prefix; Buy/Sell; newest first; Net = Gross + Swap + Commission (commission negative); Balance running; gold pips 0.1

Sample B (CSV fixture, TradeTally), all quoted:
"Symbol","Opening direction","Opening time (UTC-4)","Closing time (UTC-4)","Entry price","Closing price","Closing Quantity","Net $"
"TSLA","Buy","15/04/2026 15:09:58.271","17/04/2026 15:53:04.151","392.06","400.24","2.00 Lots","16.04"

Variants: Spanish headers (Símbolo, Dirección de apertura, Hora de apertura, Cantidad de Cierre, Volumen de Cierre en USD, Comisión, $ neto, Saldo $); tz suffix (UTC-6)/(UTC+1); currency Gross €/Net USD/Balance USD.
Gotchas: case-insensitive headers; strip (UTC±N); money cols by prefix Gross/Net/Balance; qty "0.5" or "2.00 Lots"; dates DD/MM/YYYY (Excel re-save damages); thousands sep may be spaces/nbsp; English export required by TradesViz/TradeZella; don't accept backtest export ("Order ID","Position ID","Event","Time (UTC+2)",...).
Inferred: tz suffix = user time offset; no suffix = unknown (ask). Partial closes = separate rows; Position ID not documented -> group by Symbol + Opening time + Entry price + direction.
Not verified: US month-first dates; USD gross/net header text; HTML statement layout; encoding/BOM; deposits in History.

Sources:
https://help.ctrader.com/ctrader/trading/history/
https://help.ctrader.com/ctrader-web/trading/history/
https://help.ctrader.com/ctrader/interface/user-time-offset/
https://help.ctrader.com/trading-with-ctrader/positions-and-deals/
https://community.ctrader.com/forum/fix-api/11789/
https://community.ctrader.com/forum/ctrader-support/37615/
https://community.ctrader.com/forum/ctrader-support/42155/
https://community.ctrader.com/forum/ctrader-support/1237/
https://community.ctrader.com/forum/ctrader-support/44450/
https://github.com/abhidp/trading-notional-volume-calculator
https://raw.githubusercontent.com/GeneBO98/tradetally/HEAD/backend/tests/utils/csvParser.parsers.test.js
https://github.com/For-zenx/TradeSX
https://raw.githubusercontent.com/pramuk92/Trading-journal-for-cTrader-trading-history/HEAD/app.py
https://www.tradesviz.com/brokers/cTrader
https://trademetria.com/integrations/ctrader
https://help.tradezella.com/en/articles/9546392-ctrader-how-to-import-trades-from-ctrader-into-tradezella-using-the-file-upload-method
https://tradersstack.com/import/ctrader
