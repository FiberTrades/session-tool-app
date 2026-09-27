# Tradovate - research report (subagent, 27 Sep 2026)

Menu (official, support.tradovate.com updated 9/8/2026): Web -> Reports -> Report Type + date range + filters -> GO -> PDF or CSV.
Types: Performance, Orders, Position History, Cash History, Order Details, Fills, Account Balance History, Client Statements.
Desktop (TradeZella/TradesViz): account dropdown -> gear -> Account Reports -> Orders tab -> Download Report.

## Orders (PRIMARY; verified: FreeTradeJournal fixture = real Tradeify file anonymised)
orderId,Account,Order ID,B/S,Contract,Product,Product Description,avgPrice,filledQty,Fill Time,lastCommandId,Status,_priceFormat,_priceFormatType,_tickSize,spreadDefinitionId,Version ID,Timestamp,Date,Quantity,Text,Type,Limit Price,Stop Price,decimalLimit,decimalStop,Filled Qty,Avg Fill Price,decimalFillAvg,Venue,Notional Value,Currency
537862110004,ACCT0000000000000,537862110004, Buy,MNQM6,MNQ,Micro E-mini NASDAQ-100,28531.75,5,06/10/2026 16:00:05,537862110004, Filled,-2,0,0.25,,537862110004,06/10/2026 16:00:04,6/10/26,5,Chart, Market,,,,,5,28531.75,28531.75,,"285,317.50",USD
537862110026,ACCT0000000000000,537862110026, Buy,MNQM6,MNQ,Micro E-mini NASDAQ-100,,,,537862110036, Canceled,-2,0,0.25,,537862110036,06/10/2026 16:00:29,6/10/26,5,multibracket, Limit,27891.75,,27891.75,,,,,,,USD
537862110206,ACCT0000000000000,537862110206, Sell,MNQU6,MNQ,Micro E-mini NASDAQ-100,30740.75,5,06/16/2026 10:19:37,537862110218, Filled,-2,0,0.25,,537862110218,06/16/2026 09:10:14,6/16/26,5,multibracket, Stop,,30747.50,,30747.5,5,30740.75,30740.75,,"307,407.50",USD
- one row per ORDER (incl. Canceled); Filled row = total filled qty + avg fill price
- leading spaces in B/S, Status, Type -> trim
- Fill Time MM/DD/YYYY HH:MM:SS; Timestamp = order placed; Date M/D/YY = Timestamp date (not fill day)
- Text = source (Chart, multibracket, Ticket, Exit)
- bracket legs carry Limit/Stop Price (even canceled) -> SL/TP recoverable -> R
- partial closes = separate orders (short 4 closed by stops of 2,1,1)
- NO commission/fee column
- older layout = first 26 cols only -> map by name
- needs FIFO pairing per product + point-value table for P/L

## Performance (verified: FreeTradeJournal fixture)
symbol,_priceFormat,_priceFormatType,_tickSize,buyFillId,sellFillId,qty,buyPrice,sellPrice,pnl,boughtTimestamp,soldTimestamp,duration
MNQM6,-2,0,0.25,537862110007,537862110018,5,28531.75,28491.75,$(400.00),06/10/2026 16:00:05,06/10/2026 16:00:29,24sec
MNQM6,-2,0,0.25,537862110155,537862110184,5,29262.00,29382.00,"$1,200.00",06/12/2026 09:45:49,06/12/2026 09:57:07,11min 18sec
- one row per fill PAIR; no side/account/product/fee; pnl gross accounting format $(x) negative, "$1,200.00" quoted
- direction: bought before sold = long; duration >1h format unverified

## Position History (verified: TradeTally fixture from real Apex account)
Position ID,Timestamp,Trade Date,Net Pos,Net Price,Bought,Avg. Buy,Sold,Avg. Sell,Account,Contract,Product,Product Description,_priceFormat,_priceFormatType,_tickSize,Pair ID,Buy Fill ID,Sell Fill ID,Paired Qty,Buy Price,Sell Price,P/L,Currency,Bought Timestamp,Sold Timestamp
465747740010,04/09/2026 17:14:44,2026-04-09,0,,24,25065.97,24,25061.03,APEX4977960000002,MNQM6,MNQ,Micro E-mini NASDAQ-100,-2,0,0.25,465747740223,465747740203,465747740221,5,25073.25,25072.00,-12.50,USD,04/09/2026 17:14:44,04/09/2026 17:14:44
- fill pairs + account/product/trade date (ISO); newest first; P/L plain -12.50 (positive format unseen)
- bought/sold ts can be identical -> use fill id order (inferred: lower id = earlier)

## Fills / Cash History / Account Balance History - NOT verified
Cash History (detection only): Account, Transaction ID, Timestamp, Date, Delta, Amount, Cash Change Type, Currency, Contract. Deposits+withdrawals both "Fund Transaction".

## Timezone: NO offset in any file; default local tz (or Central) -> importer must ask the tz.
Dedupe (Performance/PosHistory): account + buyFillId + sellFillId. Filter Status == Filled (trimmed). Possible BOM. Some rows fully quoted with doubled quotes (TradeTally test).

Sources:
https://support.tradovate.com/s/article/Tradovate-Account-Reports?language=en_US
https://raw.githubusercontent.com/Richy701/FreeTradeJournal/main/src/utils/__fixtures__/tradovate-orders-history.csv
https://raw.githubusercontent.com/Richy701/FreeTradeJournal/main/src/utils/__fixtures__/tradovate-trades-performance.csv
https://raw.githubusercontent.com/Richy701/FreeTradeJournal/main/src/utils/csv-parser.ts
https://raw.githubusercontent.com/GeneBO98/tradetally/main/backend/tests/fixtures/tradovate-paired-trades-sample.csv
https://raw.githubusercontent.com/GeneBO98/tradetally/main/backend/src/utils/csv/parsers/tradovate.js
https://raw.githubusercontent.com/hugodemenez/deltalytix/main/app/%5Blocale%5D/dashboard/components/import/tradovate/tradovate-processor.tsx
https://raw.githubusercontent.com/Eleven-Trading/TradeNote/main/src/utils/brokers.js
https://help.tradezella.com/en/articles/6472250-tradovate-how-to-import-trades-from-tradovate-into-tradezella-using-the-file-upload-method
https://tradesviz.crisp.help/en/article/how-to-import-trades-from-tradovate-to-tradesviz-step-by-step-guide-1sf9viu/
https://community.tradovate.com/t/export-csv-dat-in-new-york-est-time/10187
https://community.tradovate.com/t/no-commission-included-on-order-csv-download/5446
https://community.tradovate.com/t/differentiating-between-deposit-and-withdrawal/10840
https://journalit.co/docs/broker-guides-tradovate
