# EA candle export — Stage 2 (two-pass: usable in 30 min, complete by end of day)

Replaces the Stage 1 candle-export block in `MinimalistManager.mq5`. Nothing else in the
EA changes — no trade, SL/TP, PM or sync logic is touched.

> ⚠️ **Compile and run on DEMO first.** I can't compile MQL5 here.

## The problem this fixes

Stage 1 exported once, and only when the *whole* window existed. The widest forward reach
is M1's 6 hours, so `CE_READY = 6*3600` blocked **everything** — including the entry→exit
bars you actually replay — for six hours after close. A trade closed at 09:00 wasn't
replayable until mid-afternoon.

Nothing about the trade itself needs that wait. Those bars exist the moment it closes.

## The two passes

| Pass | Fires | Ships | Then |
|------|-------|-------|------|
| **1** | close + 30 min | every TF, forward-capped to *now* (so ~30 min past exit on M1) | row stays queued, marked stage 1 |
| **2** | end of the trade's server day + 2 min | every TF again, M1 forward extended to **end of that trading day** | row dropped |

Pass 2 keeps the long higher-TF windows (D1 still gets 14 days) — it only ever *extends*
the forward edge, never shortens it:

```mql5
if(full && to < eod) to = eod;     // at least the rest of the trading day
if(to > TimeCurrent()) to = TimeCurrent();
```

If the EA was offline and the day has already ended by the first sweep, it skips pass 1
and goes straight to pass 2 — one export, not two.

"End of the trading day" reuses `PM_EndOfDay()`, which is 23:59:59 in **broker server
time**. That tracks whatever offset your broker runs on, with no input to configure.

## Re-sending is already safe — checked, no backend change needed

Pass 2 re-sends bars pass 1 already sent, so the intake has to be idempotent. It is:
`ingest-candles` posts to `/rest/v1/candles?on_conflict=symbol,tf,t` with
`prefer: resolution=merge-duplicates`.

Two consequences worth knowing:

- **The unique index exists.** PostgREST's `on_conflict` needs a unique index on those
  columns; without one Postgres rejects the whole request ("no unique or exclusion
  constraint matching the ON CONFLICT specification") and the function returns
  `db upsert failed`. Stage 1 has been storing candles successfully, so it is there.
- **`merge-duplicates` is doing real work here, not just avoiding duplicates.** Pass 1
  fires at close + 30 min with `to = TimeCurrent()`, so its last M1 bar is probably still
  *forming* — an incomplete OHLC. Under `do nothing` that provisional bar would be frozen
  wrong forever; merge overwrites it with the closed values on pass 2.

(Naming: the table is `public.candles`. `st_candles` is the RPC the app reads it through.)

---

## Step 1 — replace the whole `TRADE REPLAY — candle export` block

From `string CE_FILE = ...` down to the end of `CE_CatchupOnce()`. Paste this in its place:

```mql5
//==================================================================
//  TRADE REPLAY — candle export (Stage 2: two-pass)
//  Pass 1 at close+30m makes the trade replayable inside the session.
//  Pass 2 after the trading day ends extends the M1 window to cover
//  the rest of that day. Mirrors the PM queue/sweep file idiom.
//==================================================================
string CE_FILE    = "MMReplayCandles2.csv";  // v2 queue: 5 cols (adds stage)
string CE_FILE_V1 = "MMReplayCandles.csv";   // legacy 4-col queue, retired on upgrade

int             CE_TF_MIN[6] = {1,5,15,60,240,1440};
ENUM_TIMEFRAMES CE_TF_PER[6] = {PERIOD_M1,PERIOD_M5,PERIOD_M15,PERIOD_H1,PERIOD_H4,PERIOD_D1};
long            CE_BACK[6]   = {10*86400, 10*86400, 20*86400, 90*86400, 365*86400, 1460*86400};
long            CE_FWD[6]    = { 6*3600,     86400,    86400,  3*86400,   7*86400,     14*86400};
int             CE_BATCH     = 3000;      // bars per POST
long            CE_READY     = 30*60;     // PASS 1: replayable this soon after close
long            CE_DAY_M     = 120;       // PASS 2: grace past end-of-day so the last bar has closed

// Fire-and-forget POST to ingest-candles (mirrors SyncPost, longer timeout for big batches).
bool CandlePost(string json)
  {
   char post[]; StringToCharArray(json,post,0,StringLen(json),CP_UTF8);
   char result[]; string rh;
   string headers="Content-Type: application/json\r\nAuthorization: Bearer "+SYNC_KEY+"\r\n";
   ResetLastError();
   int code=WebRequest("POST",InpCandlesURL,headers,15000,post,result,rh);
   if(code==-1)
     {
      int err=GetLastError();
      if(err==4060) PrintFormat("Replay candles: '%s' not allowed. Add it under Tools > Options > Expert Advisors > Allow WebRequest.",InpCandlesURL);
      else          PrintFormat("Replay candles: WebRequest failed (error %d).",err);
      return false;
     }
   if(code==200) return true;
   PrintFormat("Replay candles: server returned HTTP %d (%s)",code,CharArrayToString(result));
   return false;
  }

// Queue a closed trade for candle export. stage 0 = nothing sent yet.
void CE_Queue(ulong posId,string sym,datetime openT,datetime closeT)
  {
   if(StringLen(g_syncTokenEff)==0) return;
   if(FileIsExist(CE_FILE))    // de-dupe: don't queue the same position twice
     {
      int hr=FileOpen(CE_FILE,FILE_READ|FILE_CSV|FILE_ANSI|FILE_SHARE_READ|FILE_SHARE_WRITE,',');
      if(hr!=INVALID_HANDLE)
        {
         while(!FileIsEnding(hr))
           { string p=FileReadString(hr); if(StringLen(p)==0) break;
             FileReadString(hr); FileReadString(hr); FileReadString(hr); FileReadString(hr);  // sym,open,close,stage
             if(p==(string)posId){ FileClose(hr); return; } }
         FileClose(hr);
        }
     }
   int h=FileOpen(CE_FILE,FILE_READ|FILE_WRITE|FILE_CSV|FILE_ANSI|FILE_SHARE_READ,',');
   if(h==INVALID_HANDLE) return;
   FileSeek(h,0,SEEK_END);
   FileWrite(h,(string)posId,sym,(string)(long)openT,(string)(long)closeT,"0");
   FileClose(h);
  }

// Pull every timeframe's window for one trade and POST it.
//   full=false  PASS 1: forward edge is simply "whatever exists now".
//   full=true   PASS 2: M1 (and any TF whose window is shorter) is extended to the END
//               of the trade's server day. Longer windows are never shortened, so D1
//               keeps its 14 days.
// Returns false on any failure so the caller keeps the trade queued and retries.
bool CE_ExportTrade(string sym,datetime openT,datetime closeT,bool full)
  {
   int dg=(int)SymbolInfoInteger(sym,SYMBOL_DIGITS); if(dg<=0) dg=g_digits;
   long off=BrokerOff();   // server -> UTC, QUANTIZED (stable across runs, so a bar can't land at t and t+1)
   datetime eod=PM_EndOfDay(closeT);
   for(int ti=0;ti<6;ti++)
     {
      datetime from=(datetime)((long)openT  - CE_BACK[ti]);
      datetime to  =(datetime)((long)closeT + CE_FWD[ti]);
      if(full && to<eod) to=eod;               // extend to the rest of the trading day
      if(to>TimeCurrent()) to=TimeCurrent();   // never ask for bars that do not exist yet
      MqlRates r[];
      int n=CopyRates(sym,CE_TF_PER[ti],from,to,r);
      if(n<=0) continue;                       // broker keeps nothing here — skip this TF
      int i=0;
      while(i<n)
        {
         string bars=""; int cnt=0;
         for(; i<n && cnt<CE_BATCH; i++,cnt++)
           {
            long tu=(long)r[i].time - off;
            if(cnt>0) bars+=",";
            bars+=StringFormat("[%I64d,%s,%s,%s,%s]",tu,
                     DoubleToString(r[i].open,dg),DoubleToString(r[i].high,dg),
                     DoubleToString(r[i].low,dg), DoubleToString(r[i].close,dg));
           }
         string js=StringFormat("{\"token\":\"%s\",\"symbol\":\"%s\",\"tf\":%d,\"bars\":[%s]}",
                                 g_syncTokenEff,sym,CE_TF_MIN[ti],bars);
         if(!CandlePost(js)) return false;
        }
     }
   return true;
  }

// Work the queue. At most ONE export per call, to bound the WebRequest burst.
void CE_Sweep()
  {
   if(StringLen(g_syncTokenEff)==0) return;
   if(!FileIsExist(CE_FILE)) return;
   int h=FileOpen(CE_FILE,FILE_READ|FILE_CSV|FILE_ANSI|FILE_SHARE_READ|FILE_SHARE_WRITE,',');
   if(h==INVALID_HANDLE) return;

   string keep[]; int kept=0; ArrayResize(keep,0);
   int done=0;
   while(!FileIsEnding(h))
     {
      string sPos=FileReadString(h); if(StringLen(sPos)==0) break;
      string sSym  =FileReadString(h);
      string sOpen =FileReadString(h);
      string sClose=FileReadString(h);
      string sStage=FileReadString(h);
      datetime openT =(datetime)StringToInteger(sOpen);
      datetime closeT=(datetime)StringToInteger(sClose);
      int      stage =(int)StringToInteger(sStage);

      bool s1ready=(TimeCurrent() >= (datetime)((long)closeT + CE_READY));
      bool s2ready=(TimeCurrent() >= (datetime)((long)PM_EndOfDay(closeT) + CE_DAY_M));

      int newStage=stage; bool drop=false;
      if(done<1 && s2ready)
        {
         // The day is over: send the complete window and be done. Also the path taken when
         // the EA was offline all day — one export, not a pointless pass 1 first.
         done++;
         if(CE_ExportTrade(sSym,openT,closeT,true)) drop=true;
        }
      else if(done<1 && stage==0 && s1ready)
        {
         done++;
         if(CE_ExportTrade(sSym,openT,closeT,false)) newStage=1;   // replayable now; keep for the top-up
        }

      if(!drop)
        {
         ArrayResize(keep,kept+1);
         keep[kept]=sPos+","+sSym+","+sOpen+","+sClose+","+(string)newStage;
         kept++;
        }
     }
   FileClose(h);

   FileDelete(CE_FILE);
   if(kept>0)
     {
      int w=FileOpen(CE_FILE,FILE_WRITE|FILE_TXT|FILE_ANSI,',');
      if(w!=INVALID_HANDLE){ for(int i=0;i<kept;i++) FileWrite(w,keep[i]); FileClose(w); }
     }
  }

// Backfill: queue candle export for every closed position in the last InpSyncDays.
// CE_Queue de-dupes, so this is safe to call repeatedly.
void CE_Catchup()
  {
   if(StringLen(g_syncTokenEff)==0) return;
   datetime from=(datetime)((long)TimeGMT()+BrokerOff()-(long)InpSyncDays*86400);
   datetime to  =(datetime)((long)TimeGMT()+BrokerOff()+3600);
   if(!HistorySelect(from,to)) return;

   ulong posIds[]; int np=0;
   int deals=HistoryDealsTotal();
   for(int i=0;i<deals;i++)
     {
      ulong dt=HistoryDealGetTicket(i); if(dt==0) continue;
      long de=(long)HistoryDealGetInteger(dt,DEAL_ENTRY);
      if(de!=DEAL_ENTRY_OUT && de!=DEAL_ENTRY_INOUT && de!=DEAL_ENTRY_OUT_BY) continue;
      ulong pid=(ulong)HistoryDealGetInteger(dt,DEAL_POSITION_ID);
      if(pid==0) continue;
      bool seen=false; for(int k=0;k<np;k++) if(posIds[k]==pid){ seen=true; break; }
      if(!seen){ ArrayResize(posIds,np+1); posIds[np]=pid; np++; }
     }

   for(int j=0;j<np;j++)
     {
      ulong pid=posIds[j];
      if(!HistorySelectByPosition(pid)) continue;
      int n=HistoryDealsTotal(); string sym=""; datetime oT=0,cT=0;
      for(int k=0;k<n;k++)
        {
         ulong d2=HistoryDealGetTicket(k); if(d2==0) continue;
         if(sym=="") sym=HistoryDealGetString(d2,DEAL_SYMBOL);
         long e2=(long)HistoryDealGetInteger(d2,DEAL_ENTRY);
         datetime tt=(datetime)HistoryDealGetInteger(d2,DEAL_TIME);
         if(e2==DEAL_ENTRY_IN){ if(oT==0 || tt<oT) oT=tt; }
         else                 { if(tt>cT) cT=tt; }
        }
      if(sym!="" && oT>0 && cT>0) CE_Queue(pid,sym,oT,cT);
     }
  }

// Run the backfill once per queue version. The v1 file had four columns and cannot be
// parsed by the five-column reader above, so it is retired rather than migrated — the
// backfill re-queues those trades in the new format, and CE_Queue de-dupes.
// To force a re-run, delete "MTM_ce_catchup_v2" in the Global Variables window (F3).
void CE_CatchupOnce()
  {
   if(StringLen(g_syncTokenEff)==0) return;
   string key="MTM_ce_catchup_v2";
   if(GlobalVariableCheck(key)) return;
   if(FileIsExist(CE_FILE_V1)) FileDelete(CE_FILE_V1);
   CE_Catchup();
   GlobalVariableSet(key,1.0);
  }
```

## Step 2 — nothing else to change

`CE_Queue` is still called from `SyncCollectAndPush`, and `CE_Sweep` / `CE_CatchupOnce`
from `OnTick` and `OnInit`, exactly as before. The signatures that callers use are
unchanged; only `CE_ExportTrade` gained a parameter, and it is only called from
`CE_Sweep`.

## What you'll see

- **~30 min after a trade closes** — Replay works, showing the trade plus about half an
  hour past your exit.
- **A few minutes after the trading day ends** — the same trade silently gains the rest of
  the day. No app action needed: `fetchCandles` queries live on every replay open, so it
  just appears next time you look.

MAE/MFE figures are correct from pass 1 — they're measured entry→exit only, which pass 1
covers completely.

## App side: no changes required

Verified in `index.html`: `fetchCandles()` re-queries Supabase on every open (no caching)
and already collapses bars less than 30s apart, so the overlap between passes cannot
double-draw even if a duplicate reached the table.
