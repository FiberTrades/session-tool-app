# NinjaTrader 8 - research report (subagent, 27 Sep 2026)

NOT a fixed format: column order/visibility, header LANGUAGE, date format, number format, instrument naming all follow user settings. Map by header name; parse tolerantly.

Menu (official): Control Center -> New -> Trade Performance -> From/To -> Generate -> Display: Trades or Executions -> right-click grid -> Export... -> CSV or Excel.
Display units must be CURRENCY (else Profit/MAE/MFE/ETD in points/ticks/pips/%).
Report may include trades BEFORE the From date (back to last flat) -> overlapping exports duplicate.
Time zone = PC local by default, no offset in export.

## Trades grid: row = round trip (official). Scale in/out -> separate trades sharing the entry execution. "Trade number" = row sequence (not stable id).
Profit is NET (official formula subtracts entry+exit commission). MAE/MFE/ETD definitions official (ETD = MFE - profit).
Default header (Edgewonk, older): Trade number,Instrument,Account,Strategy,Market pos.,Qty,Entry price,Exit price,Entry time,Exit time,Entry name,Exit name,Profit,Cum. net profit,Commission,MAE,MFE,ETD,Bars
Fixture header (TradeTally, 4 fee cols, trailing comma): Trade number,Instrument,Account,Strategy,Market pos.,Qty,Entry price,Exit price,Entry time,Exit time,Entry name,Exit name,Profit,Cum. net profit,Commission,Clearing Fee,Exchange Fee,IP Fee,NFA Fee,MAE,MFE,ETD,Bars,
1,MES 09-26,SIM101,ATM Strategy,Short,1,7427.50,7423.50,7/28/2026 9:45:17 AM,7/28/2026 9:46:05 AM,Entry,Target2,$20.00,$20.00,$0.00,$0.00,$0.00,$0.00,$0.00,$8.75,$21.25,$1.25,0,
1,NQ JUN26,PA-APEX-12345-625!Apex!Apex,100-100-5,Short,1,23960.00,23955.50,01-04-2026 00:27:56,01-04-2026 00:30:54,Entry,Target1,90.00 $,90.00 $,0.00 $,0.00 $,0.00 $,0.00 $,0.00 $,160.00 $,105.00 $,15.00 $,0,
- Market pos. Long/Short; money as text "$20.00" or "90.00 $"; MAE/MFE/ETD positive; Strategy = ATM template; Exit name = order name (Target1); prop account composite name
- French headers exist (Numéro d'ordre, Compte, Stratégie, Pos. marché., Qté, Prix d'entrée, Prix de sortie, Heure d'entrée, Heure de sortie, Nom d'entrée, Nom de la sortie, Profit, Commission) - curly apostrophes possible

## Executions grid: row = fill (official cols)
Instrument, Action, Quantity, Price, Time, ID, E/X, Position, Order ID, Name, Commission, Rate, Account Display Name, Connection (+ optional Account Name)
EU fixture (semicolons, decimal commas, trailing ;):
Instrument;Action;Quantity;Price;Time;ID;E/X;Position;Order ID;Name;Commission;Rate;Account display name;Connection;
MES JUN26;Buy;1;7200,75;27/04/2026 6:05:02;execution-1;Entry;1 L;order-1;Entry;0,62 $;1;Playback101;Playback;
Real user file (LuxAlgo issue #10, reordered, no seconds, exchange-code symbol):
Instrument,Action,Time,Price,E/X,Connection,Quantity,Account display name
MNQZ6,Sell,9/15/2026 9:39,29441.25,Exit,TRADEIFY,6,ACCOUNT-1
- identical rows can be genuine separate fills (copy trading) -> don't dedupe by content
- needs pairing + point-value table

Instruments: "MES 09-26" / "NQ JUN26" / "MNQZ6" (symbology preference).
Dates seen: 7/28/2026 9:45:17 AM | 9/15/2026 9:39 | 27/04/2026 6:05:02 | 01-04-2026 00:27:56 -> follow Windows regional settings (inferred); list separator ; with decimal commas.
Negatives: ($410.16) and -90,00 $ only in synthetic fixtures -> handle both. Encoding/BOM unverified.
NO stop/target price columns in either grid; only order names (Target1...).
Recommendation: support both grids (detect by headers). Tradervue/TradesViz/TradeNote use Executions; Edgewonk/Deltalytix use Trades.

Sources:
https://static.ninjatrader.com/support/helpGuides/nt8/performance_displays.htm
https://static.ninjatrader.com/support/helpGuides/nt8/using_trade_performance.htm
https://static.ninjatrader.com/support/helpGuides/nt8/executions_tab.htm
https://static.ninjatrader.com/support/helpGuides/nt8/working_with_data_grids.htm
https://static.ninjatrader.com/support/helpGuides/nt8/profit_and_loss_calculation_modes.htm
https://static.ninjatrader.com/support/helpGuides/nt8/statistics_definitions.htm
https://static.ninjatrader.com/support/helpGuides/nt8/trade.htm
https://ninjatrader.com/learn/how-to-trade-futures/futures-symbology/
https://edgewonk.zendesk.com/hc/en-us/articles/360018544140-NinjaTrader-7-and-8
https://raw.githubusercontent.com/hugodemenez/deltalytix/main/lib/ninjatrader-number-parser.ts
https://raw.githubusercontent.com/GeneBO98/tradetally/main/backend/tests/utils/csvParser.parsers.test.js
https://raw.githubusercontent.com/LuxAlgo/trade-journal/main/packages/importers/tests/fixtures/ninjatrader-copy-trades.csv
https://github.com/LuxAlgo/trade-journal/issues/10
https://www.tradervue.com/site/platforms/ninjatrader
https://tradesviz.crisp.help/en/article/how-to-import-trades-from-ninjatrader-78-instructions-to-tradesviz-trading-journal-1ln8sw8/
