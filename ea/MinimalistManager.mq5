//+------------------------------------------------------------------+
//|                                           MinimalistManager.mq5  |
//|   Manual trade-management Expert Advisor for MT5.                 |
//|   Single-panel manager with mouse-driven execution.              |
//+------------------------------------------------------------------+
#property copyright "Minimalist Manager"
#property link      "https://www.mql5.com"
#property version   "5.1"
#property description "Minimalist manual trade manager: risk-based lot sizing,"
#property description "hover-to-set stop with min/max clamp, single take-profit,"
#property description "and a draggable break-even line. Discretionary tool -"
#property description "trades are placed by the user, not automatically."
#property strict

#include <Trade/Trade.mqh>

//==================================================================
//  ENUMS
//==================================================================
enum ENUM_RISK_MODE  { RISK_PERCENT, RISK_AMOUNT, RISK_FIXED_LOT };
enum ENUM_ORDER_KIND { OK_MARKET, OK_LIMIT, OK_STOP };
enum ENUM_TP_MODE    { TP_BY_RR, TP_BY_PIPS };
enum ENUM_BEOFF_MODE { BEOFF_BY_PIPS, BEOFF_BY_RR };   // BE offset read as pips or as R

//==================================================================
//  INPUTS
//==================================================================
input group "===== Trade Setup ====="
input ENUM_ORDER_KIND  InpOrderKind     = OK_MARKET;   // Default order type
input long             InpMagic         = 990088;      // Magic number
input ulong            InpSlippage      = 30;          // Max slippage (points)

input group "===== Risk ====="
input ENUM_RISK_MODE   InpRiskMode      = RISK_AMOUNT; // Risk mode
input double           InpRiskPercent   = 1.0;         // Risk percentage (%)
input double           InpRiskAmount    = 50.0;        // Risk amount (account currency)
input double           InpFixedLot      = 0.10;        // Fixed lot size
input bool             InpOverrideBal   = false;       // Override account balance?
input double           InpCustomBalance = 0.0;         // Custom balance (if overriding)

input group "===== Stop Loss (pips) ====="
input double           InpMinSLpips     = 1.8;         // Minimum SL size (pips)
input double           InpMaxSLpips     = 3.8;         // Maximum SL size (pips)

input group "===== Take Profit ====="
input ENUM_TP_MODE     InpTPMode        = TP_BY_RR;    // TP measured by RR or pips
input bool             InpTP_On         = true;        // Take-profit enabled
input double           InpTP_Val        = 2.0;         // TP target (RR or pips)
input double           InpTP_Pct        = 100.0;       // % of position to close at TP (rest runs)

input group "===== Break Even ====="
input bool             InpUseBE         = true;        // Show break-even line?
input double           InpBE_RR         = 1.0;         // BE trigger distance (in R)
input ENUM_BEOFF_MODE  InpBE_OffMode    = BEOFF_BY_PIPS; // BE offset measured in pips or R
input double           InpBE_Offset     = 0.5;         // SL offset past entry on BE (pips or R)

input group "===== Panel ====="
input int              InpPanelX        = 8;           // Panel X (from left)
input int              InpPanelY        = 22;          // Panel Y (from top)
input bool             InpStartOpen     = true;        // Start with panel expanded?

input group "===== Chart Scale ====="
input bool             InpScaleLock     = false;       // Lock chart scale on load (adds padding, free vertical scroll)
input double           InpScalePadPips  = 50.0;        // Padding above & below price (pips) — forex default
input group "===== Hotkeys ====="
input string           InpExecKeyChar   = "O";         // Execution-mode key (type any single letter)
input int              InpKeyExecute    = 13;          // Execute trade (backup) (Enter=13)
input int              InpKeyCancel     = 80;          // Cancel all pending      (P=80)
input int              InpKeyClose      = 67;          // Close all positions     (C=67)
input int              InpKeyRiskOff    = 32;          // Close 50% of each pos   (Space=32)
input int              InpKeySwitch     = 8;           // Switch order type  (HOTKEY DISABLED in code - use panel button)

input group "===== SessionTool.app Sync ====="
input string InpSyncToken = "";                         // Your SessionTool.app sync token (account id)
input string InpSyncURL   = "https://figozyxoyobixadhqewr.supabase.co/functions/v1/ingest-trade"; // Endpoint
input int    InpSyncDays  = 90;                         // On start, re-scan this many days of history
input string InpLiveURL   = "https://figozyxoyobixadhqewr.supabase.co/functions/v1/live-trade"; // Live status endpoint (private)
input string InpCandlesURL= "https://figozyxoyobixadhqewr.supabase.co/functions/v1/ingest-candles"; // Trade Replay candle endpoint

enum ENUM_DST_MODE { DST_AUTO=0, DST_NONE=1, DST_EU=2, DST_US=3, DST_SOUTH=4 };
input group "===== Daily Trade Limit ====="
input int           InpMaxTradesDay = 0;      // Max trades per day (default; also editable on the panel)
input double        InpDayResetUTC  = 0.0;    // Manual STANDARD (winter) UTC offset - used only when Auto is NOT selected (UK 0, Spain 1, NY -5, Tokyo 9, India 5.5)
input ENUM_DST_MODE InpDstMode      = DST_AUTO; // Timezone: Auto (from this PC/VPS clock) / None / EU / US / South (AU-NZ)

//==================================================================
//  COLOURS
//==================================================================
#define COL_TITLE     C'12,12,12'
#define COL_TITLE_ON  C'22,58,42'
#define COL_BODY      C'20,20,20'
#define COL_TAB       C'42,42,42'
#define COL_TAB_ON    C'96,165,250'
#define COL_TXT       clrWhite
#define COL_TXT_DIM   C'136,136,136'
#define COL_HEADER    clrWhite
#define COL_DIV       C'42,42,42'
#define COL_BTN       C'34,34,34'
#define COL_TRADE     C'47,158,106'
#define COL_DANGER    C'210,75,75'
#define COL_WARN      C'199,147,48'
#define COL_EDIT_BG   C'26,26,26'
#define COL_EDIT_TX   clrWhite

#define COL_LINE_ENTRY C'190,194,200'
#define COL_LINE_SL    clrTomato
#define COL_LINE_TP    clrLimeGreen
#define COL_LINE_BE    C'30,120,255'

// ---- Refined panel palette (v2.32 redesign) ----
#define COL_PANEL_BG   C'11,13,16'
#define COL_PANEL_CARD C'20,23,28'
#define COL_PANEL_LINE C'34,39,47'
#define COL_PANEL_NAME C'230,237,243'
#define COL_PANEL_SECT C'91,99,109'
#define COL_PANEL_LBL  C'139,147,157'
#define COL_PANEL_BTN  C'28,33,40'
#define COL_PANEL_BTX  C'201,209,217'
#define COL_PANEL_NUMB C'11,13,16'
#define COL_PANEL_NUMX C'230,237,243'
#define COL_PANEL_ACC  C'45,212,167'
#define COL_PANEL_ACCX C'6,37,27'
#define COL_PANEL_OFF  C'33,38,45'
#define COL_PANEL_OFFX C'110,118,129'
#define COL_PANEL_ICON C'110,118,129'
#define COL_PANEL_X    C'192,91,87'
#define COL_PANEL_XBG  C'42,26,28'
#define COL_PANEL_WARN C'209,162,74'

//==================================================================
//  GLOBALS
//==================================================================
CTrade trade;

// forward declarations
double PositionsSL(int &cnt);
bool   PositionsEntry(double &entry,int &dir);
void   BuildPanel();
void   mkLabelBL(string n,int x,int y,string text,color clr,int fs);
void   RedrawTargets();
void   SaveState();
bool   LoadState();

string PFX     = "MTM_";
string PP      = "MTM_P_";
string LN_ENTRY= "MTM_LINE_ENTRY";
string LN_SL   = "MTM_LINE_SL";
string LN_BE   = "MTM_LINE_BE";
string LN_TP   = "MTM_LINE_TP";
string LN_MSL  = "MTM_LINE_POSSL";   // draggable SL for the LIVE position
string LN_EFILL= "MTM_LINE_EFILL";   // fixed grey line at the actual fill price
string TX_SL   = "MTM_TXT_SL";
string TX_EF   = "MTM_TXT_EF";
string TX_TP   = "MTM_TXT_TP";
string TX_BE   = "MTM_TXT_BE";

ENUM_ORDER_KIND g_orderKind;
ENUM_RISK_MODE  g_riskMode;
double g_riskPercent, g_riskAmount, g_fixedLot;
double g_minSL, g_maxSL, g_beOffset, g_beRR;
bool   g_useBE;
ENUM_TP_MODE g_tpMode;
ENUM_BEOFF_MODE g_beOffMode;
bool   g_tpOn[6];
double g_tpVal[6];
double g_tpPct[6];

bool g_panelOpen = true;
double g_ui      = 1.0;   // UI scale = display DPI / 96 (keeps the panel proportional on high-DPI screens)
bool g_active    = true;   // master visual ON/OFF (hides all chart lines when off)
bool g_pausedByLimit = false;   // true when the daily limit auto-paused ACTIVE; auto-cleared on the new day, and a manual ACTIVE toggle clears it too
int  PX, PY, PWID = 335;
int  g_panelH = 24;
int  g_maxTradesDay = 0;   // runtime daily-trade cap (from InpMaxTradesDay, editable on panel)
bool   g_scaleLock    = false;   // chart scale lock on/off (off by default; forex-style padding)
double g_scalePadPips = 50.0;    // pips of air added above and below the visible price range

bool   g_execMode = false;
double g_slSetPips = 0.0;   // SL distance (pips) chosen by hover - held as price drifts
int    g_slSetSide = -1;    // -1 = SL below price (buy), +1 = above (sell)
bool   g_beArmed  = false;
double g_beTrigger= 0.0;
int    g_beDir    = 0;
bool   g_prevLeftDown = false;
int    g_execKey = 79;       // resolved key code
string g_execKeyChar = "O";  // display char for the exec key
bool   g_awaitKey = false;   // true while waiting for the user to press a new key

double g_point, g_pip;
int    g_digits;
double g_volStep, g_volMin, g_volMax;
int    g_volDigits;

// ---- Session Tool sync ----
#define SYNC_KEY "sb_publishable_h-TrkkVzrGOkwX6LxMDsaQ_hE8540Nv"
#define SYNC_TOKEN_FILE "SessionTool_sync_token.txt"   // remembers the token across re-attaches
ulong  g_syncQueue[];
string g_liveQueue[];   // ready-to-send live-status JSON (open/close), flushed in OnTimer
int    g_liveTries[];   // parallel retry counter per queued event (v4.2: don't lose a card to one blip)
datetime g_liveReAt=0;  // last time open positions were re-announced (v4.3: self-heal the feed after a reset)
bool   g_syncCatchupPending = false;
datetime g_syncCatchAt = 0;   // last periodic catch-up (v4.5: re-scan history so a close missed in real time self-heals)
bool   g_wasConnected = true; // last-seen broker connection state (v4.5: reconnect/wake -> catch-up immediately)
string g_syncTokenEff = "";   // token actually used: the input if given, else restored from file
// trade-detail captured at entry (stamped to the position id, read back at close)
double g_pendSL=0, g_pendRisk=0, g_pendTPr=0, g_pendTPp=0;
bool   g_pendValid=false;
// Requested SL/TP distances (pips) for the on-fill re-anchor. Stored at order time and
// applied from OnTradeTransaction once the broker confirms the fill - the reliable place
// on a Market-Execution account, where the position does not exist yet inside PlaceTrade.
int    g_reqDir=0;
double g_reqSLpips=0.0, g_reqTPpips=0.0;
bool   g_anchorPending=false;   // set at order time; cleared once the on-fill re-anchor has run

//==================================================================
//  SMALL HELPERS
//==================================================================
double PipSize() { return (g_digits==3 || g_digits==5) ? g_point*10.0 : g_point; }
int    _s(int v){ return (int)MathRound(v*g_ui); }   // scale a design pixel by the UI factor
int VolumeDigits(double step){ int d=0; double s=step; while(s<1.0 && d<8){s*=10.0;d++;} return d; }

double NormalizeVolume(double v)
  {
   if(g_volStep<=0) return 0.0;
   v=MathFloor(v/g_volStep)*g_volStep;
   if(v<g_volMin) v=g_volMin;
   if(v>g_volMax) v=g_volMax;
   return NormalizeDouble(v,g_volDigits);
  }
double CurrentBalance()
  {
   if(InpOverrideBal && InpCustomBalance>0) return InpCustomBalance;
   return AccountInfoDouble(ACCOUNT_BALANCE);
  }
string Fmt(double v,int d){ return DoubleToString(v,d); }

double RiskValGet(){ return g_riskMode==RISK_PERCENT?g_riskPercent:(g_riskMode==RISK_AMOUNT?g_riskAmount:g_fixedLot); }
void   RiskValSet(double v){ if(g_riskMode==RISK_PERCENT)g_riskPercent=v; else if(g_riskMode==RISK_AMOUNT)g_riskAmount=v; else g_fixedLot=v; }
string CurSymbol()
  {
   string c=AccountInfoString(ACCOUNT_CURRENCY);
   if(c=="USD"||c=="AUD"||c=="CAD"||c=="NZD"||c=="SGD"||c=="HKD") return "$";
   if(c=="GBP") return "£";
   if(c=="EUR") return "€";
   if(c=="JPY") return "¥";
   return c;   // fall back to the 3-letter code (e.g. CHF)
  }
string RiskModeText(){ return g_riskMode==RISK_PERCENT?"RISK %":(g_riskMode==RISK_AMOUNT?("RISK "+CurSymbol()):"RISK LOT"); }
string OrderKindText(){ return g_orderKind==OK_MARKET?"MARKET":(g_orderKind==OK_LIMIT?"LIMIT":"STOP"); }

double CalcLot(double slPips,double &riskMoneyOut)
  {
   riskMoneyOut=0.0;
   if(g_riskMode==RISK_FIXED_LOT)
     {
      double lots=NormalizeVolume(g_fixedLot);
      double tv=SymbolInfoDouble(_Symbol,SYMBOL_TRADE_TICK_VALUE);
      double ts=SymbolInfoDouble(_Symbol,SYMBOL_TRADE_TICK_SIZE);
      if(ts>0) riskMoneyOut=(slPips*g_pip/ts)*tv*lots;
      return lots;
     }
   double bal=CurrentBalance();
   double riskMoney=(g_riskMode==RISK_PERCENT)? bal*g_riskPercent/100.0 : g_riskAmount;
   riskMoneyOut=riskMoney;
   double tickVal =SymbolInfoDouble(_Symbol,SYMBOL_TRADE_TICK_VALUE);
   double tickSize=SymbolInfoDouble(_Symbol,SYMBOL_TRADE_TICK_SIZE);
   if(tickSize<=0||tickVal<=0) return 0.0;
   double lossPerLot=(slPips*g_pip/tickSize)*tickVal;
   if(lossPerLot<=0) return 0.0;
   return NormalizeVolume(riskMoney/lossPerLot);
  }
void Warn(string m){ Print("WARNING: ",m); }

void DeleteByPrefix(string pfx)
  {
   for(int i=ObjectsTotal(0,-1,-1)-1;i>=0;i--)
     {
      string nm=ObjectName(0,i,-1,-1);
      if(StringFind(nm,pfx)==0) ObjectDelete(0,nm);
     }
  }

//==================================================================
//  PIXEL <-> PRICE
//==================================================================
double YToPrice(int x,int y)
  {
   int sub=0; datetime t=0; double price=0;
   if(ChartXYToTimePrice(0,x,y,sub,t,price)) return price;
   return 0.0;
  }
int PriceToY(double price)
  {
   // Map price -> pixel using the visible price range (no time/x dependency, so it never
   // intermittently fails the way ChartTimePriceToXY does as the chart scrolls).
   double pmax=ChartGetDouble(0,CHART_PRICE_MAX,0);
   double pmin=ChartGetDouble(0,CHART_PRICE_MIN,0);
   long   h   =ChartGetInteger(0,CHART_HEIGHT_IN_PIXELS,0);
   if(pmax<=pmin || h<=0) return -1;
   double frac=(pmax-price)/(pmax-pmin);
   return (int)MathRound(frac*(double)h);
  }

//==================================================================
//  CHART LINES
//==================================================================
void EnsureHLine(string name,double price,color clr,int style,bool selectable)
  {
   if(ObjectFind(0,name)<0)
     {
      ObjectCreate(0,name,OBJ_HLINE,0,0,price);
      ObjectSetInteger(0,name,OBJPROP_HIDDEN,false);
      ObjectSetInteger(0,name,OBJPROP_SELECTABLE,selectable);
      ObjectSetInteger(0,name,OBJPROP_SELECTED,selectable);  // pre-selected => single-drag, no click first
      ObjectSetString (0,name,OBJPROP_TOOLTIP,"\n");          // suppress the default object-name tooltip
     }
   ObjectSetDouble (0,name,OBJPROP_PRICE,price);
   ObjectSetInteger(0,name,OBJPROP_COLOR,clr);
   ObjectSetInteger(0,name,OBJPROP_STYLE,style);
   ObjectSetInteger(0,name,OBJPROP_WIDTH,1);
   // Foreground layer: the EA's SL/TP/BE/entry lines must sit IN FRONT of MT5's own native
   // position SL/TP lines (and the candles), so keep BACK=false. Native trade-level lines are
   // drawn in the chart layer, below every graphical object, so any foreground object beats
   // them. The settings panel is still kept ON TOP of these lines via a higher OBJPROP_ZORDER
   // on the panel objects (see mkRect/mkLabel/mkButton/mkEdit) — NOT by pushing the lines to
   // the background, which was what buried them under MT5's own lines. ZORDER 0 on the lines
   // (set every call) undoes any BACK/ZORDER left over from an older build on the same chart.
   ObjectSetInteger(0,name,OBJPROP_BACK,false);
   ObjectSetInteger(0,name,OBJPROP_ZORDER,0);
  }
double LinePrice(string name){ return ObjectFind(0,name)<0 ? 0.0 : ObjectGetDouble(0,name,OBJPROP_PRICE); }

// Label pinned to the far right of the chart, vertically tracking a price level.
void SetLineText(string name,double price,string txt,color clr)
  {
   if(price<=0) return;
   long ch=ChartGetInteger(0,CHART_HEIGHT_IN_PIXELS);
   double pmax=ChartGetDouble(0,CHART_PRICE_MAX,0);
   double pmin=ChartGetDouble(0,CHART_PRICE_MIN,0);

   if(ObjectFind(0,name)<0)
     {
      ObjectCreate(0,name,OBJ_LABEL,0,0,0);
      ObjectSetInteger(0,name,OBJPROP_CORNER,CORNER_RIGHT_UPPER);
      ObjectSetInteger(0,name,OBJPROP_ANCHOR,ANCHOR_RIGHT_LOWER);
      ObjectSetInteger(0,name,OBJPROP_FONTSIZE,8);
      ObjectSetString (0,name,OBJPROP_FONT,"Arial");
      ObjectSetInteger(0,name,OBJPROP_SELECTABLE,false);
      ObjectSetInteger(0,name,OBJPROP_BACK,false);
      ObjectSetInteger(0,name,OBJPROP_XDISTANCE,_s(58));
     }
   if(pmax>pmin && ch>0)
     {
      int yy=(int)MathRound((pmax-price)/(pmax-pmin)*(double)ch);
      if(yy<2) yy=2;
      if(yy>(int)ch-2) yy=(int)ch-2;
      ObjectSetInteger(0,name,OBJPROP_YDISTANCE,yy-1);
     }
   ObjectSetInteger(0,name,OBJPROP_TIMEFRAMES,OBJ_ALL_PERIODS);
   ObjectSetString (0,name,OBJPROP_TEXT,txt);
   ObjectSetInteger(0,name,OBJPROP_COLOR,clr);
  }

// Resolve entry & direction from current lines (no SL clamp). Returns false if invalid.
bool GetEntryDir(int &dir,double &entry,double &slPrice,double &slDist)
  {
   double ask=SymbolInfoDouble(_Symbol,SYMBOL_ASK);
   double bid=SymbolInfoDouble(_Symbol,SYMBOL_BID);
   double mid=(ask+bid)/2.0;
   slPrice=LinePrice(LN_SL);
   if(slPrice<=0) return false;
   if(g_orderKind==OK_MARKET)
     {
      dir=(slPrice<mid)?+1:-1;
      entry=(dir>0)?ask:bid;
     }
   else
     {
      entry=LinePrice(LN_ENTRY);
      if(entry<=0) return false;
      dir=(slPrice<entry)?+1:-1;
     }
   slDist=MathAbs(entry-slPrice);
   return (slDist>0);
  }

// Bottom-left hint. Not armed: how to enter exec mode. Armed: how to place a trade.
void DrawHint()
  {
   if(!g_active){ ObjectDelete(0,PFX+"HINT"); return; }
   string msg = g_execMode
              ? "Left-click mouse to execute a trade"
              : "Press "+g_execKeyChar+" to enter/exit execution mode";
   mkLabelBL(PFX+"HINT",12,12,msg,clrBlack,9);
  }

void ShowExecutionLines()
  {
   double ask=SymbolInfoDouble(_Symbol,SYMBOL_ASK);
   double bid=SymbolInfoDouble(_Symbol,SYMBOL_BID);
   double mid=(ask+bid)/2.0;
   if(g_orderKind!=OK_MARKET) EnsureHLine(LN_ENTRY,mid,COL_LINE_ENTRY,STYLE_SOLID,true);
   else ObjectDelete(0,LN_ENTRY);
   // SL is NOT selectable: it follows (and is clamped to) the mouse
   g_slSetPips=g_minSL; g_slSetSide=-1;   // default: min distance, below price (buy)
   EnsureHLine(LN_SL,mid-g_minSL*g_pip,COL_LINE_SL,STYLE_SOLID,false);
   DrawHint();
   RedrawTargets();
   ChartRedraw();
  }
// Full teardown of every exec/preview object (used when leaving exec mode without a trade).
void HideExecutionLines()
  {
   DeleteByPrefix(LN_TP);
   ObjectDelete(0,LN_ENTRY);
   ObjectDelete(0,LN_SL);
   ObjectDelete(0,LN_BE);
   ObjectDelete(0,TX_SL); ObjectDelete(0,TX_TP); ObjectDelete(0,TX_BE);
   DrawHint();                       // revert to the "press key to enter exec mode" hint
   Comment("");
   ChartRedraw();
  }
// Hide EVERY chart line + label this EA drew (master OFF switch). Panel stays.
void HideAllVisuals()
  {
   DeleteByPrefix("MTM_LINE");
   DeleteByPrefix("MTM_TXT");
   Comment("");
   ChartRedraw();
  }
// Clears the entry-setup lines but KEEPS the BE line (so it stays draggable in the live trade).
void ClearEntryLines()
  {
   DeleteByPrefix(LN_TP);
   ObjectDelete(0,LN_ENTRY);
   ObjectDelete(0,LN_SL);
   ObjectDelete(0,TX_SL); ObjectDelete(0,TX_TP);
   Comment("");
   ChartRedraw();
  }

// Redraw the SL clamp + TP line from current SL/entry, update labels + readout.
// (BE line is NOT shown in preview - it only appears once a trade is placed.)
void RedrawTargets()
  {
   if(!g_execMode) return;
   double ask=SymbolInfoDouble(_Symbol,SYMBOL_ASK);
   double bid=SymbolInfoDouble(_Symbol,SYMBOL_BID);

   // Hold the SL at the distance the user set, measured from the live fill price.
   double slPips=g_slSetPips;
   if(slPips<g_minSL) slPips=g_minSL;
   if(slPips>g_maxSL) slPips=g_maxSL;
   int side=g_slSetSide;          // -1 below price (buy), +1 above (sell)
   int dir =-side;                 // trade direction is opposite the SL side
   double entry;
   if(g_orderKind==OK_MARKET) entry=(dir>0)?ask:bid;
   else { entry=LinePrice(LN_ENTRY); if(entry<=0) entry=(ask+bid)/2.0; }
   double slPrice=entry-dir*slPips*g_pip;
   double slDist =slPips*g_pip;
   ObjectSetDouble(0,LN_SL,OBJPROP_PRICE,slPrice);

   // Single TP line (solid, draggable) labelled "TP"
   string nm=LN_TP+"0";
   if(g_tpOn[0])
     {
      double dist;
      if(g_tpMode==TP_BY_RR)
         dist=g_tpVal[0]*slDist;
      else
        {                                          // pips: exact distance from entry (no spread)
         dist=g_tpVal[0]*g_pip;
        }
      double tpPrice=entry+dir*dist;
      EnsureHLine(nm,tpPrice,COL_LINE_TP,STYLE_SOLID,true);
      SetLineText(TX_TP,tpPrice,"TP",COL_LINE_TP);
     }
   else { ObjectDelete(0,nm); ObjectDelete(0,TX_TP); }
   for(int i=1;i<6;i++) ObjectDelete(0,LN_TP+IntegerToString(i));

   // SL label (word + live pips) at far right
   SetLineText(TX_SL,slPrice,StringFormat("SL  %.1f pips",slPips),COL_LINE_SL);
  }

// After a drag, convert the new line price back into stored settings.
void RecalcFromDrag(string name)
  {
   int dir; double entry,slPrice,slDist;
   if(!GetEntryDir(dir,entry,slPrice,slDist)) return;
   if(name==LN_BE)
     {
      g_beRR = MathAbs(LinePrice(LN_BE)-entry)/slDist;
      return;
     }
   for(int i=0;i<6;i++)
     {
      if(name==LN_TP+IntegerToString(i))
        {
         double dist=MathAbs(LinePrice(name)-entry);
         g_tpVal[i]=(g_tpMode==TP_BY_RR)? dist/slDist : dist/g_pip;
         return;
        }
     }
   // entry line moved -> nothing to store; RedrawTargets handles it
  }

bool ResolveForOrder(int &dir,double &entry,double &slPrice,double &slPips,string &err)
  {
   double slDist;
   if(!GetEntryDir(dir,entry,slPrice,slDist)){ err="Set the stop-loss first."; return false; }
   double ask=SymbolInfoDouble(_Symbol,SYMBOL_ASK);
   double bid=SymbolInfoDouble(_Symbol,SYMBOL_BID);
   if(g_orderKind==OK_LIMIT)
     {
      if(dir>0 && entry>=ask){ err="Buy Limit must be BELOW price."; return false; }
      if(dir<0 && entry<=bid){ err="Sell Limit must be ABOVE price."; return false; }
     }
   else if(g_orderKind==OK_STOP)
     {
      if(dir>0 && entry<=ask){ err="Buy Stop must be ABOVE price."; return false; }
      if(dir<0 && entry>=bid){ err="Sell Stop must be BELOW price."; return false; }
     }
   slPips=slDist/g_pip;
   double clamp=slPips; if(clamp<g_minSL)clamp=g_minSL; if(clamp>g_maxSL)clamp=g_maxSL;
   if(MathAbs(clamp-slPips)>1e-8)
     {
      slPrice=entry-dir*clamp*g_pip;
      slPips=clamp;
     }
   return true;
  }

//==================================================================
//  TRADING ACTIONS
//==================================================================
bool SendOne(int dir,double volume,double entry,double slPrice,double tpPrice)
  {
   if(volume<=0) return false;
   string cm="MTM";
   if(g_orderKind==OK_MARKET)
      return dir>0 ? trade.Buy(volume,_Symbol,0,slPrice,tpPrice,cm)
                   : trade.Sell(volume,_Symbol,0,slPrice,tpPrice,cm);
   if(g_orderKind==OK_LIMIT)
      return dir>0 ? trade.BuyLimit(volume,entry,_Symbol,slPrice,tpPrice,ORDER_TIME_GTC,0,cm)
                   : trade.SellLimit(volume,entry,_Symbol,slPrice,tpPrice,ORDER_TIME_GTC,0,cm);
   return dir>0 ? trade.BuyStop(volume,entry,_Symbol,slPrice,tpPrice,ORDER_TIME_GTC,0,cm)
                : trade.SellStop(volume,entry,_Symbol,slPrice,tpPrice,ORDER_TIME_GTC,0,cm);
  }

//==================================================================
//  DAILY TRADE LIMIT  (timezone-aware; resets at the user's local midnight)
//==================================================================
int      g_tradesToday = 0;
datetime g_dayStartSrv = 0;
long     g_brokerOff   = LONG_MAX;   // server-time minus UTC, in seconds. LONG_MAX = not known yet.

string StateKey(string field);       // defined further down; declared here so the offset helpers can use it

// Measure the broker offset ONLY on a fresh tick. TimeCurrent() is the time of the last
// tick, so between ticks (weekends, holidays, a terminal that just started) it is stale
// and subtracting TimeGMT() from it gives nonsense. Called from OnTick, where a tick has
// by definition just arrived.
void UpdateBrokerOffset()
  {
   static datetime lastSeen = 0;
   datetime tc = TimeCurrent();
   if(tc == lastSeen) return;                       // no new tick: TimeCurrent() cannot be trusted
   lastSeen = tc;
   long off = (long)tc - (long)TimeGMT();
   if(MathAbs((double)off) > 14*3600) return;       // no broker sits more than 14h from UTC
   long q = 15*60;                                  // brokers use whole or half hours; quantise away jitter
   off = (long)(MathRound((double)off/(double)q)*q);
   if(off == g_brokerOff) return;
   g_brokerOff = off;
   GlobalVariableSet(StateKey("brokerOff"), (double)off);
  }

// The last offset we actually trusted. Survives restarts, so a Monday-morning start with
// no ticks yet still knows what day it is.
long BrokerOff()
  {
   if(g_brokerOff != LONG_MAX) return g_brokerOff;
   if(GlobalVariableCheck(StateKey("brokerOff")))
     { g_brokerOff = (long)GlobalVariableGet(StateKey("brokerOff")); return g_brokerOff; }
   long off = (long)TimeCurrent() - (long)TimeGMT();          // never measured one: best effort
   if(MathAbs((double)off) > 14*3600) off = 0;
   return off;
  }

// Last Sunday of a month at a given UTC hour (EU/UK DST switch points).
datetime LastSundayOfMonth(int yr,int mon,int hourUTC)
  {
   MqlDateTime t; t.year=yr; t.mon=mon; t.day=31; t.hour=hourUTC; t.min=0; t.sec=0; t.day_of_week=0; t.day_of_year=0;
   datetime dd=StructToTime(t);
   MqlDateTime td; TimeToStruct(dd,td);
   return dd - (datetime)(td.day_of_week*86400);
  }
// Nth Sunday of a month at a given UTC hour (US DST switch points).
datetime NthSundayOfMonth(int yr,int mon,int n,int hourUTC)
  {
   MqlDateTime t; t.year=yr; t.mon=mon; t.day=1; t.hour=hourUTC; t.min=0; t.sec=0; t.day_of_week=0; t.day_of_year=0;
   datetime dd=StructToTime(t);
   MqlDateTime td; TimeToStruct(dd,td);
   int firstSun=(7-td.day_of_week)%7;
   return dd + (datetime)((firstSun+(n-1)*7)*86400);
  }
bool IsEuDST(datetime utc)
  {
   MqlDateTime t; TimeToStruct(utc,t);
   datetime s=LastSundayOfMonth(t.year,3,1);   // last Sun Mar 01:00 UTC
   datetime e=LastSundayOfMonth(t.year,10,1);  // last Sun Oct 01:00 UTC
   return (utc>=s && utc<e);
  }
bool IsUsDST(datetime utc)
  {
   MqlDateTime t; TimeToStruct(utc,t);
   datetime s=NthSundayOfMonth(t.year,3,2,7);   // 2nd Sun Mar 07:00 UTC
   datetime e=NthSundayOfMonth(t.year,11,1,6);  // 1st Sun Nov 06:00 UTC
   return (utc>=s && utc<e);
  }
bool IsSouthDST(datetime utc)   // Southern hemisphere (AU/NZ approx): 1st Sun Oct -> 1st Sun Apr
  {
   MqlDateTime t; TimeToStruct(utc,t);
   datetime octStart=NthSundayOfMonth(t.year,10,1,16);  // ~1st Sun Oct (local ~02:00 = ~16:00 UTC)
   datetime aprEnd  =NthSundayOfMonth(t.year,4,1,16);    // ~1st Sun Apr
   return (utc>=octStart || utc<aprEnd);
  }
// Effective UTC offset for the day-reset boundary = standard offset + DST (in season).
double EffectiveUTCOffset()
  {
   if(InpDstMode==DST_AUTO) return (double)((long)TimeLocal()-(long)TimeGMT())/3600.0;  // this PC clock offset (OS handles DST)
   double dst=0.0;
   if(InpDstMode==DST_EU    && IsEuDST(TimeGMT()))    dst=1.0;
   if(InpDstMode==DST_US    && IsUsDST(TimeGMT()))    dst=1.0;
   if(InpDstMode==DST_SOUTH && IsSouthDST(TimeGMT())) dst=1.0;
   return InpDayResetUTC + dst;
  }

// What the day-reset is actually keyed to, in words. A trader on a VPS in another country
// will otherwise never discover that their "midnight" is somebody else's.
string DayResetLabel()
  {
   double off = EffectiveUTCOffset();
   int    hh  = (int)MathFloor(MathAbs(off));
   int    mm  = (int)MathRound((MathAbs(off)-hh)*60.0);
   string sgn = (off<0) ? "-" : "+";
   string tz  = "UTC" + ((MathAbs(off)<0.01) ? "" : sgn+IntegerToString(hh)+(mm>0 ? ":"+StringFormat("%02d",mm) : ""));
   return "Resets 00:00 " + tz;
  }

int UserDayIndex()
  {
   int      offSec  = (int)MathRound(EffectiveUTCOffset()*3600.0);
   long     userNow = (long)TimeGMT() + offSec;
   return (int)(userNow / 86400);          // days since epoch, in the trader's own timezone
  }

datetime UserDayStartServer()
  {
   datetime nowUTC   = TimeGMT();                            // always advances, ticks or not
   int      offSec   = (int)MathRound(EffectiveUTCOffset()*3600.0);
   datetime userNow  = nowUTC + offSec;
   datetime userMid  = userNow - (userNow % 86400);          // local midnight (shifted)
   datetime startUTC = userMid - offSec;                     // back to UTC
   return (datetime)((long)startUTC + BrokerOff());          // trusted offset, NOT TimeCurrent()
  }

int CountTradesSince(datetime dayStart)
  {
   // End bound from TimeGMT() too - TimeCurrent()+3600 is stale over a weekend, and an end
   // that lands BEFORE dayStart makes HistorySelect return an empty set at random.
   datetime endSrv = (datetime)((long)TimeGMT() + BrokerOff() + 3600);
   if(!HistorySelect(dayStart, endSrv)) return 0;
   int cnt=0, total=HistoryDealsTotal();
   for(int i=0;i<total;i++)
     {
      ulong tk=HistoryDealGetTicket(i);
      if(tk==0) continue;
      if((long)HistoryDealGetInteger(tk,DEAL_ENTRY)!=DEAL_ENTRY_IN) continue;
      long dt=(long)HistoryDealGetInteger(tk,DEAL_TYPE);
      if(dt!=DEAL_TYPE_BUY && dt!=DEAL_TYPE_SELL) continue;
      cnt++;
     }
   return cnt;
  }

void RefreshDayCount()
  {
   g_dayStartSrv = UserDayStartServer();
   g_tradesToday = CountTradesSince(g_dayStartSrv);
  }

bool DayLimitReached()
  {
   if(g_maxTradesDay<=0) return false;
   if(UserDayStartServer()!=g_dayStartSrv) RefreshDayCount();
   return (g_tradesToday>=g_maxTradesDay);
  }

void PlaceTrade()
  {
   if(!TerminalInfoInteger(TERMINAL_TRADE_ALLOWED) || !MQLInfoInteger(MQL_TRADE_ALLOWED))
     { Comment("\n  >> Trading not allowed - enable Algo Trading."); Warn("Trading not allowed (Algo Trading off)."); return; }
   if(DayLimitReached())
     { Comment("\n  >> Daily limit reached ("+IntegerToString(g_maxTradesDay)+" trades). Paused until your next day."); Warn("Daily trade limit reached - paused until next day."); return; }
   int dir; double entry,slPrice,slPips; string err;
   if(!ResolveForOrder(dir,entry,slPrice,slPips,err)){ Comment("\n  >> CANNOT TRADE: "+err); Warn(err); return; }
   double riskMoney; double total=CalcLot(slPips,riskMoney);
   if(total<=0){ Warn("Computed lot is zero - check risk settings."); return; }

   // Single TP closes the whole position (TP set on the order itself).
   double tpPrice=0.0;
   if(g_tpOn[0])
     {
      double dist;
      if(g_tpMode==TP_BY_RR)
         dist=g_tpVal[0]*slPips*g_pip;
      else
        {                                          // pips: exact distance from entry (no spread)
         dist=g_tpVal[0]*g_pip;
        }
      tpPrice=entry+dir*dist;
     }
   if(!SendOne(dir,NormalizeVolume(total),entry,slPrice,tpPrice)){ Warn("Order failed."); return; }

   // Remember the exact distances the user asked for, so OnTradeTransaction can re-anchor
   // SL/TP to the real fill once the broker confirms it (works on Market Execution, where
   // the synchronous block just below finds no position yet and quietly skips).
   g_reqDir=dir;
   g_reqSLpips=slPips;
   g_reqTPpips=g_tpOn[0] ? ((g_tpMode==TP_BY_RR) ? g_tpVal[0]*slPips : g_tpVal[0]) : 0.0;
   g_anchorPending=true;

   // ---- Re-anchor SL/TP to the REAL fill (market orders only) ----------------
   // The stop and target go out as absolute prices worked out from the quote at the
   // moment of the click. A market order rarely fills exactly there, and because those
   // prices are fixed, a fill 0.2 pips the wrong way makes the stop 0.2 WIDER and the
   // target 0.2 NEARER. Slippage should not be allowed to push the stop past the max the
   // user set. So once the broker reports the true open price, shift both back to the
   // exact distances that were asked for.
   if(g_orderKind==OK_MARKET)
     {
      double realOpen=0.0, curSL=0.0, curTP=0.0; ulong fixTk=0;
      for(int _i=PositionsTotal()-1;_i>=0;_i--)
        {
         ulong _tk=PositionGetTicket(_i);
         if(!PositionSelectByTicket(_tk)) continue;
         if(PositionGetString(POSITION_SYMBOL)!=_Symbol) continue;
         if(PositionGetInteger(POSITION_MAGIC)!=InpMagic) continue;
         realOpen=PositionGetDouble(POSITION_PRICE_OPEN);
         curSL   =PositionGetDouble(POSITION_SL);
         curTP   =PositionGetDouble(POSITION_TP);
         fixTk   =_tk;
         break;
        }
      if(fixTk>0 && realOpen>0 && g_pip>0)
        {
         double wantSL=NormalizeDouble(realOpen-dir*slPips*g_pip,g_digits);
         double wantTP=0.0;
         if(g_tpOn[0])
           {
            double d2=(g_tpMode==TP_BY_RR) ? g_tpVal[0]*slPips*g_pip : g_tpVal[0]*g_pip;
            wantTP=NormalizeDouble(realOpen+dir*d2,g_digits);
           }
         // Only talk to the broker if the fill actually moved something, and never set a
         // stop the broker will reject for sitting inside its minimum stop distance.
         double tol=g_pip*0.05;
         bool needSL=(MathAbs(wantSL-curSL)>tol);
         bool needTP=(g_tpOn[0] && MathAbs(wantTP-curTP)>tol);
         if(needSL || needTP)
           {
            double stopLvl=(double)SymbolInfoInteger(_Symbol,SYMBOL_TRADE_STOPS_LEVEL)*g_point;
            double refBid=SymbolInfoDouble(_Symbol,SYMBOL_BID);
            double refAsk=SymbolInfoDouble(_Symbol,SYMBOL_ASK);
            double cmpSL=(dir>0)?refBid:refAsk;
            bool okSL=(stopLvl<=0) || (MathAbs(cmpSL-wantSL)>=stopLvl);
            bool okTP=(!g_tpOn[0]) || (stopLvl<=0) || (MathAbs(cmpSL-wantTP)>=stopLvl);
            if(okSL && okTP)
              {
               // Diagnostic: log every re-anchor so the Experts tab shows the fill price and
               // the exact SL/TP distances applied. If SL/TP still read 0.2 off after this,
               // these lines say whether the modify ran, and whether the broker accepted it.
               bool okMod=trade.PositionModify(fixTk,wantSL,g_tpOn[0]?wantTP:curTP);
               double appTP=g_tpOn[0]?wantTP:curTP;
               Print("MTM re-anchor: fill=",DoubleToString(realOpen,g_digits),
                     "  SL ",DoubleToString(curSL,g_digits),"->",DoubleToString(wantSL,g_digits),
                     " (",DoubleToString(MathAbs(realOpen-wantSL)/g_pip,1)," pips)",
                     "  TP ",DoubleToString(curTP,g_digits),"->",DoubleToString(appTP,g_digits),
                     " (",DoubleToString(g_tpOn[0]?MathAbs(realOpen-wantTP)/g_pip:0.0,1)," pips)",
                     "  modify=",(okMod?"OK":"FAILED")," ret=",(int)trade.ResultRetcode());
              }
            else
               Print("MTM re-anchor BLOCKED by broker min stop distance (",DoubleToString(stopLvl/g_pip,1),
                     " pips): wanted SL=",DoubleToString(wantSL,g_digits)," TP=",DoubleToString(wantTP,g_digits),
                     " at fill=",DoubleToString(realOpen,g_digits),". Left at SL=",DoubleToString(curSL,g_digits),
                     " TP=",DoubleToString(curTP,g_digits)," - the broker will not allow a stop this tight.");
           }
         else
            Print("MTM re-anchor: fill=",DoubleToString(realOpen,g_digits),
                  " matched the click within ",DoubleToString(tol/g_pip,2),
                  " pips - SL=",DoubleToString(curSL,g_digits)," TP=",DoubleToString(curTP,g_digits),
                  " already at the requested distance, no change.");
        }
     }

   // ---- Session Tool: remember this trade's detail, stamped to the position at entry ----
   g_pendSL=slPips; g_pendRisk=riskMoney;
   if(g_tpOn[0])
     {
      if(g_tpMode==TP_BY_RR){ g_pendTPr=g_tpVal[0];           g_pendTPp=g_tpVal[0]*slPips; }
      else                  { g_pendTPp=g_tpVal[0];           g_pendTPr=(slPips>0)?g_tpVal[0]/slPips:0; }
     }
   else { g_pendTPr=0; g_pendTPp=0; }
   g_pendValid=true;

   g_execMode=false;
   ClearEntryLines();          // removes SL/TP/entry lines and their labels

   // Fixed light-grey line at the ACTUAL fill price (non-draggable, marks your entry).
   double fill=entry;
   double pe; int pd;
   if(PositionsEntry(pe,pd)) fill=pe;   // use the broker's real fill if available
   // ---- Session Tool: re-measure SL from the ACTUAL fill to the ACTUAL stop ----
   // A market BUY fills at the ask, a SELL at the bid, so the real risk is the nominal
   // line-to-line distance PLUS the spread. Read the live position's real open + stop and
   // restamp g_pendSL (and keep the TP metrics consistent). Falls back to nominal slPips.
   {
      double posSL=0.0;
      for(int _i=PositionsTotal()-1;_i>=0;_i--)
        {
         ulong _tk=PositionGetTicket(_i);
         if(!PositionSelectByTicket(_tk)) continue;
         if(PositionGetString(POSITION_SYMBOL)!=_Symbol) continue;
         if(PositionGetInteger(POSITION_MAGIC)!=InpMagic) continue;
         posSL=PositionGetDouble(POSITION_SL);
         break;
        }
      if(posSL>0 && g_pip>0)
        {
         double realSL=MathAbs(fill-posSL)/g_pip;
         if(realSL>0)
           {
            g_pendSL=realSL;
            if(g_tpOn[0])
              {
               if(g_tpMode==TP_BY_RR) g_pendTPp=g_tpVal[0]*realSL;
               else                   g_pendTPr=(realSL>0)?g_tpVal[0]/realSL:0;
              }
           }
        }
   }
   EnsureHLine(LN_EFILL,fill,COL_LINE_ENTRY,STYLE_SOLID,false);

   // NOW create the draggable break-even line (only appears after a trade).
   // It starts up NEAR THE TP (safely away from price) - drag it down when you want it.
   g_beArmed=false;
   if(g_useBE)
     {
      double bePrice;
      if(tpPrice>0) bePrice=tpPrice-dir*5*g_pip;        // just inside the TP
      else          bePrice=fill+dir*g_beRR*slPips*g_pip; // no TP set -> fall back to R distance
      EnsureHLine(LN_BE,bePrice,COL_LINE_BE,STYLE_SOLID,true);
      SetLineText(TX_BE,bePrice,"BE",COL_LINE_BE);
      g_beTrigger=bePrice; g_beDir=dir; g_beArmed=true;
     }
   else g_beDir=dir;   // remember direction in case BE is switched on mid-trade
   Print(StringFormat("Placed order. %s SLpips=%.1f Lot=%.2f",dir>0?"BUY":"SELL",slPips,total));
   BuildPanel();
  }

// The BE offset in PRICE, for one position's stop distance. In pips mode the stop
// distance is irrelevant; in R mode it is the whole point - 0.5R is 2 pips on a 4-pip
// stop and 3 on a 6-pip one, which is a different stop on every trade.
// Falls back to treating the number as pips when the stop distance is unknown, so a
// missing SL can never silently place the stop AT entry.
double BEOffsetPx(double slDistPx)
  {
   if(g_beOffMode==BEOFF_BY_RR)
     {
      if(slDistPx>0) return g_beOffset*slDistPx;
      return g_beOffset*g_pip;
     }
   return g_beOffset*g_pip;
  }

void BreakEvenAll()
  {
   for(int i=PositionsTotal()-1;i>=0;i--)
     {
      ulong tk=PositionGetTicket(i);
      if(!PositionSelectByTicket(tk)) continue;
      if(PositionGetString(POSITION_SYMBOL)!=_Symbol) continue;
      if(PositionGetInteger(POSITION_MAGIC)!=InpMagic) continue;
      long type=PositionGetInteger(POSITION_TYPE);
      double open=PositionGetDouble(POSITION_PRICE_OPEN);
      double tp=PositionGetDouble(POSITION_TP);
      int d=(type==POSITION_TYPE_BUY)?+1:-1;
      // R mode needs THIS position's own stop distance, taken from the position itself.
      // g_reqSLpips is the panel's CURRENT setting, which may have been changed since the
      // trade was opened - sizing the offset off a stop this trade never had. The panel
      // value is a fallback only, for a position carrying no SL at all.
      double curSl=PositionGetDouble(POSITION_SL);
      double slDist=(curSl>0) ? MathAbs(open-curSl)
                              : ((g_reqSLpips>0) ? g_reqSLpips*g_pip : 0.0);
      trade.PositionModify(tk,open+d*BEOffsetPx(slDist),tp);
     }
   g_beArmed=false; ObjectDelete(0,LN_BE); ObjectDelete(0,TX_BE);
   int cnt; double sl=PositionsSL(cnt);   // keep the draggable SL line on the new stop
   if(sl>0 && ObjectFind(0,LN_MSL)>=0) ObjectSetDouble(0,LN_MSL,OBJPROP_PRICE,sl);
   ChartRedraw();
  }
void CancelPending()
  {
   for(int i=OrdersTotal()-1;i>=0;i--)
     {
      ulong tk=OrderGetTicket(i);
      if(!OrderSelect(tk)) continue;
      if(OrderGetString(ORDER_SYMBOL)!=_Symbol) continue;
      if(OrderGetInteger(ORDER_MAGIC)!=InpMagic) continue;
      trade.OrderDelete(tk);
     }
  }
void CloseAll()
  {
   for(int i=PositionsTotal()-1;i>=0;i--)
     {
      ulong tk=PositionGetTicket(i);
      if(!PositionSelectByTicket(tk)) continue;
      if(PositionGetString(POSITION_SYMBOL)!=_Symbol) continue;
      if(PositionGetInteger(POSITION_MAGIC)!=InpMagic) continue;
      trade.PositionClose(tk);
     }
   g_beArmed=false;
  }
void RiskOffHalf()
  {
   for(int i=PositionsTotal()-1;i>=0;i--)
     {
      ulong tk=PositionGetTicket(i);
      if(!PositionSelectByTicket(tk)) continue;
      if(PositionGetString(POSITION_SYMBOL)!=_Symbol) continue;
      if(PositionGetInteger(POSITION_MAGIC)!=InpMagic) continue;
      double vol=PositionGetDouble(POSITION_VOLUME);
      double half=NormalizeVolume(vol/2.0);
      if(half>=g_volMin && half<vol) trade.PositionClosePartial(tk,half);
     }
  }

// Cycle MARKET -> LIMIT -> STOP. Reachable ONLY from the panel "Order type" button now (the
// keyboard shortcut that used to call this was disabled — it was a stray Backspace, left over
// from editing a panel number field, that silently flipped MARKET->LIMIT). A button click is a
// deliberate action, so it must always work — including while the EA is toggled off (e.g. to set
// the order type before turning it on). No g_active guard here.
void SwitchOrderKind(){ g_orderKind=(ENUM_ORDER_KIND)(((int)g_orderKind+1)%3); if(g_execMode) ShowExecutionLines(); BuildPanel(); }
void CycleRiskMode(){ g_riskMode=(ENUM_RISK_MODE)(((int)g_riskMode+1)%3); BuildPanel(); }
void ToggleExecMode(){ if(!g_active) return; if(!g_execMode && DayLimitReached()){ Comment("\n  >> Daily limit reached ("+IntegerToString(g_maxTradesDay)+" trades). Execution stays off until your next day."); Warn("Daily trade limit reached - execution disabled."); return; } g_execMode=!g_execMode; if(g_execMode) ShowExecutionLines(); else HideExecutionLines(); BuildPanel(); }

void MonitorBE()
  {
   if(!g_beArmed) return;
   double bid=SymbolInfoDouble(_Symbol,SYMBOL_BID);
   double ask=SymbolInfoDouble(_Symbol,SYMBOL_ASK);
   if((g_beDir>0 && bid>=g_beTrigger)||(g_beDir<0 && ask<=g_beTrigger)) BreakEvenAll();
  }

//==================================================================
//  LIVE POSITION SL  (draggable after a trade is entered)
//==================================================================
// Return the shared SL of matching open positions; cnt = how many.
double PositionsSL(int &cnt)
  {
   cnt=0; double sl=0;
   for(int i=PositionsTotal()-1;i>=0;i--)
     {
      ulong tk=PositionGetTicket(i);
      if(!PositionSelectByTicket(tk)) continue;
      if(PositionGetString(POSITION_SYMBOL)!=_Symbol) continue;
      if(PositionGetInteger(POSITION_MAGIC)!=InpMagic) continue;
      if(cnt==0) sl=PositionGetDouble(POSITION_SL);
      cnt++;
     }
   return sl;
  }

// Entry price & direction of the live position(s) for this symbol. Returns false if flat.
bool PositionsEntry(double &entry,int &dir)
  {
   for(int i=PositionsTotal()-1;i>=0;i--)
     {
      ulong tk=PositionGetTicket(i);
      if(!PositionSelectByTicket(tk)) continue;
      if(PositionGetString(POSITION_SYMBOL)!=_Symbol) continue;
      if(PositionGetInteger(POSITION_MAGIC)!=InpMagic) continue;
      entry=PositionGetDouble(POSITION_PRICE_OPEN);
      dir=(PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_BUY)?+1:-1;
      return true;
     }
   return false;
  }

// Re-pin every visible line label to its line's current pixel position (after pan/zoom).
// Lightweight: only repositions existing labels - does NOT rebuild lines (that's RedrawTargets'
// job on ticks). Calling the full rebuild here caused double-redraw flicker during fast moves.
void RefreshLabels()
  {
   if(!g_active) return;
   if(ObjectFind(0,LN_MSL)  >=0) SetLineText(TX_SL,LinePrice(LN_MSL),"SL",COL_LINE_SL);
   if(ObjectFind(0,LN_SL)   >=0 && g_execMode)
      SetLineText(TX_SL,LinePrice(LN_SL),StringFormat("SL  %.1f pips",g_slSetPips),COL_LINE_SL);
   if(ObjectFind(0,LN_BE)   >=0) SetLineText(TX_BE,LinePrice(LN_BE),"BE",COL_LINE_BE);
   if(ObjectFind(0,LN_TP+"0")>=0)SetLineText(TX_TP,LinePrice(LN_TP+"0"),"TP",COL_LINE_TP);
  }

// Maintain the live-position lines (SL draggable, entry fixed, BE draggable) from state.
void UpdateManageLine()
  {
   int cnt; double sl=PositionsSL(cnt);
   if(cnt>0)
     {
      double pe; int pd; PositionsEntry(pe,pd);
      // draggable SL
      if(ObjectFind(0,LN_MSL)<0)
         EnsureHLine(LN_MSL,(sl>0?sl:pe),COL_LINE_SL,STYLE_SOLID,true);
      SetLineText(TX_SL,LinePrice(LN_MSL),"SL",COL_LINE_SL);
      // fixed grey entry line (no label)
      if(ObjectFind(0,LN_EFILL)<0) EnsureHLine(LN_EFILL,pe,COL_LINE_ENTRY,STYLE_SOLID,false);
      // green TP line at the position's broker TP (draggable), if one is set
      double ptp=0;
      for(int i=PositionsTotal()-1;i>=0;i--)
        {
         ulong tk=PositionGetTicket(i);
         if(!PositionSelectByTicket(tk)) continue;
         if(PositionGetString(POSITION_SYMBOL)!=_Symbol) continue;
         if(PositionGetInteger(POSITION_MAGIC)!=InpMagic) continue;
         ptp=PositionGetDouble(POSITION_TP); break;
        }
      if(ptp>0)
        {
         if(ObjectFind(0,LN_TP+"0")<0) EnsureHLine(LN_TP+"0",ptp,COL_LINE_TP,STYLE_SOLID,true);
         else if(MathAbs(LinePrice(LN_TP+"0")-ptp)>g_point) ObjectSetDouble(0,LN_TP+"0",OBJPROP_PRICE,ptp);
         SetLineText(TX_TP,LinePrice(LN_TP+"0"),"TP",COL_LINE_TP);
        }
      else { ObjectDelete(0,LN_TP+"0"); ObjectDelete(0,TX_TP); }
      // draggable BE line (only if armed)
      if(g_useBE && g_beArmed)
        {
         if(ObjectFind(0,LN_BE)<0) EnsureHLine(LN_BE,g_beTrigger,COL_LINE_BE,STYLE_SOLID,true);
         SetLineText(TX_BE,LinePrice(LN_BE),"BE",COL_LINE_BE);
        }
     }
   else
     {
      ObjectDelete(0,LN_MSL);
      ObjectDelete(0,LN_EFILL);ObjectDelete(0,TX_EF);
      ObjectDelete(0,LN_BE);   ObjectDelete(0,TX_BE);
      g_beArmed=false;
      // When exec mode is armed, RedrawTargets owns the SL/TP preview lines + labels -
      // do NOT delete them here or they flicker (delete/recreate fight every tick).
      if(!g_execMode)
        {
         ObjectDelete(0,TX_SL);
         ObjectDelete(0,LN_TP+"0"); ObjectDelete(0,TX_TP);
        }
     }
  }

// Apply a dragged SL to every matching open position, then resync the line.
void ModifyPositionsSL(double newSL)
  {
   newSL=NormalizeDouble(newSL,g_digits);
   for(int i=PositionsTotal()-1;i>=0;i--)
     {
      ulong tk=PositionGetTicket(i);
      if(!PositionSelectByTicket(tk)) continue;
      if(PositionGetString(POSITION_SYMBOL)!=_Symbol) continue;
      if(PositionGetInteger(POSITION_MAGIC)!=InpMagic) continue;
      double tp=PositionGetDouble(POSITION_TP);
      if(!trade.PositionModify(tk,newSL,tp))
         Warn(StringFormat("Could not move SL on #%I64u (%d - %s). Too close to price?",
                           tk,trade.ResultRetcode(),trade.ResultRetcodeDescription()));
     }
   // snap the line back to whatever the broker actually accepted
   int cnt; double sl=PositionsSL(cnt);
   if(sl>0 && ObjectFind(0,LN_MSL)>=0) ObjectSetDouble(0,LN_MSL,OBJPROP_PRICE,sl);
   ChartRedraw();
  }

// Apply a dragged TP to every matching open position; returns true if a position was found.
bool ModifyPositionsTP(double newTP)
  {
   newTP=NormalizeDouble(newTP,g_digits);
   bool found=false;
   for(int i=PositionsTotal()-1;i>=0;i--)
     {
      ulong tk=PositionGetTicket(i);
      if(!PositionSelectByTicket(tk)) continue;
      if(PositionGetString(POSITION_SYMBOL)!=_Symbol) continue;
      if(PositionGetInteger(POSITION_MAGIC)!=InpMagic) continue;
      found=true;
      double slv=PositionGetDouble(POSITION_SL);
      if(!trade.PositionModify(tk,slv,newTP))
         Warn(StringFormat("Could not move TP on #%I64u (broker rejected - too close to price?).",tk));
     }
   return found;
  }

//==================================================================
//  PANEL
//==================================================================
void mkRect(string n,int x,int y,int w,int h,color bg,color border)
  {
   x=_s(x); y=_s(y); w=_s(w); h=_s(h);
   ObjectCreate(0,n,OBJ_RECTANGLE_LABEL,0,0,0);
   ObjectSetInteger(0,n,OBJPROP_CORNER,CORNER_LEFT_UPPER);
   ObjectSetInteger(0,n,OBJPROP_XDISTANCE,x); ObjectSetInteger(0,n,OBJPROP_YDISTANCE,y);
   ObjectSetInteger(0,n,OBJPROP_XSIZE,w);     ObjectSetInteger(0,n,OBJPROP_YSIZE,h);
   ObjectSetInteger(0,n,OBJPROP_BGCOLOR,bg);
   ObjectSetInteger(0,n,OBJPROP_BORDER_TYPE,BORDER_FLAT);
   ObjectSetInteger(0,n,OBJPROP_COLOR,border);
   ObjectSetInteger(0,n,OBJPROP_BACK,false);
   ObjectSetInteger(0,n,OBJPROP_ZORDER,10);   // panel sits ABOVE the SL/TP/BE/entry lines (which are ZORDER 0)
   ObjectSetInteger(0,n,OBJPROP_SELECTABLE,false);
   ObjectSetInteger(0,n,OBJPROP_HIDDEN,true);
  }
void mkLabel(string n,int x,int y,string text,color clr,int fs)
  {
   x=_s(x); y=_s(y);
   ObjectCreate(0,n,OBJ_LABEL,0,0,0);
   ObjectSetInteger(0,n,OBJPROP_CORNER,CORNER_LEFT_UPPER);
   ObjectSetInteger(0,n,OBJPROP_ANCHOR,ANCHOR_LEFT_UPPER);
   ObjectSetInteger(0,n,OBJPROP_XDISTANCE,x); ObjectSetInteger(0,n,OBJPROP_YDISTANCE,y);
   ObjectSetString (0,n,OBJPROP_TEXT,text);
   ObjectSetInteger(0,n,OBJPROP_COLOR,clr);
   ObjectSetInteger(0,n,OBJPROP_FONTSIZE,fs);
   ObjectSetString (0,n,OBJPROP_FONT,"Arial");
   ObjectSetInteger(0,n,OBJPROP_ZORDER,10);   // panel label above the chart lines
   ObjectSetInteger(0,n,OBJPROP_SELECTABLE,false);
   ObjectSetInteger(0,n,OBJPROP_HIDDEN,true);
  }
// Frameless clickable title-bar icon (a centered label - no button frame).
void mkIcon(string n,int cx,int cy,string glyph,color clr,int fs,string font)
  {
   cx=_s(cx); cy=_s(cy);
   if(ObjectFind(0,n)<0) ObjectCreate(0,n,OBJ_LABEL,0,0,0);
   ObjectSetInteger(0,n,OBJPROP_CORNER,CORNER_LEFT_UPPER);
   ObjectSetInteger(0,n,OBJPROP_ANCHOR,ANCHOR_CENTER);
   ObjectSetInteger(0,n,OBJPROP_XDISTANCE,cx); ObjectSetInteger(0,n,OBJPROP_YDISTANCE,cy-2);
   ObjectSetString (0,n,OBJPROP_TEXT,glyph);
   ObjectSetInteger(0,n,OBJPROP_COLOR,clr);
   ObjectSetInteger(0,n,OBJPROP_FONTSIZE,fs);
   ObjectSetString (0,n,OBJPROP_FONT,font);
   ObjectSetInteger(0,n,OBJPROP_ZORDER,10);   // panel icon above the chart lines
   ObjectSetInteger(0,n,OBJPROP_SELECTABLE,false);
   ObjectSetInteger(0,n,OBJPROP_HIDDEN,true);
  }
// Title-bar icon with a subtle box behind it. The box is a flat rectangle whose border
// colour equals its fill, so there is NO bright button edge; the glyph label on top is clickable.
void mkIconBtn(string n,int cx,int cy,string glyph,color fg,int fs,string font,color boxbg=COL_PANEL_BTN)
  {
   // Box centre is derived from the SAME scaled centre the glyph uses, so the two never drift
   // apart at fractional DPI (width/height = 2*half, so the centre lands exactly on scx/scy).
   int scx=_s(cx), scy=_s(cy), hw=_s(10), hh=_s(9);
   string b=n+"_BX";
   if(ObjectFind(0,b)<0) ObjectCreate(0,b,OBJ_RECTANGLE_LABEL,0,0,0);
   ObjectSetInteger(0,b,OBJPROP_CORNER,CORNER_LEFT_UPPER);
   ObjectSetInteger(0,b,OBJPROP_XDISTANCE,scx-hw); ObjectSetInteger(0,b,OBJPROP_YDISTANCE,scy-hh);
   ObjectSetInteger(0,b,OBJPROP_XSIZE,hw*2);       ObjectSetInteger(0,b,OBJPROP_YSIZE,hh*2);
   ObjectSetInteger(0,b,OBJPROP_BGCOLOR,boxbg);
   ObjectSetInteger(0,b,OBJPROP_BORDER_TYPE,BORDER_FLAT);
   ObjectSetInteger(0,b,OBJPROP_COLOR,boxbg);
   ObjectSetInteger(0,b,OBJPROP_BACK,false);
   ObjectSetInteger(0,b,OBJPROP_ZORDER,10);   // icon box above the chart lines
   ObjectSetInteger(0,b,OBJPROP_SELECTABLE,false);
   ObjectSetInteger(0,b,OBJPROP_HIDDEN,true);
   mkIcon(n,cx,cy,glyph,fg,fs,font);
  }
// Label anchored to the BOTTOM-RIGHT corner of the chart (x,y are insets from that corner).
void mkLabelBR(string n,int x,int y,string text,color clr,int fs)
  {
   x=_s(x); y=_s(y);
   if(ObjectFind(0,n)<0) ObjectCreate(0,n,OBJ_LABEL,0,0,0);
   ObjectSetInteger(0,n,OBJPROP_CORNER,CORNER_RIGHT_LOWER);
   ObjectSetInteger(0,n,OBJPROP_ANCHOR,ANCHOR_RIGHT_LOWER);
   ObjectSetInteger(0,n,OBJPROP_XDISTANCE,x); ObjectSetInteger(0,n,OBJPROP_YDISTANCE,y);
   ObjectSetString (0,n,OBJPROP_TEXT,text);
   ObjectSetInteger(0,n,OBJPROP_COLOR,clr);
   ObjectSetInteger(0,n,OBJPROP_FONTSIZE,fs);
   ObjectSetString (0,n,OBJPROP_FONT,"Consolas");
   ObjectSetInteger(0,n,OBJPROP_ZORDER,10);   // corner readout above the chart lines
   ObjectSetInteger(0,n,OBJPROP_SELECTABLE,false);
   ObjectSetInteger(0,n,OBJPROP_HIDDEN,true);
  }
// Label anchored to the BOTTOM-LEFT corner of the chart (x,y are insets from that corner).
void mkLabelBL(string n,int x,int y,string text,color clr,int fs)
  {
   x=_s(x); y=_s(y);
   if(ObjectFind(0,n)<0) ObjectCreate(0,n,OBJ_LABEL,0,0,0);
   ObjectSetInteger(0,n,OBJPROP_CORNER,CORNER_LEFT_LOWER);
   ObjectSetInteger(0,n,OBJPROP_ANCHOR,ANCHOR_LEFT_LOWER);
   ObjectSetInteger(0,n,OBJPROP_XDISTANCE,x); ObjectSetInteger(0,n,OBJPROP_YDISTANCE,y);
   ObjectSetString (0,n,OBJPROP_TEXT,text);
   ObjectSetInteger(0,n,OBJPROP_COLOR,clr);
   ObjectSetInteger(0,n,OBJPROP_FONTSIZE,fs);
   ObjectSetString (0,n,OBJPROP_FONT,"Consolas");
   ObjectSetInteger(0,n,OBJPROP_ZORDER,10);   // corner readout above the chart lines
   ObjectSetInteger(0,n,OBJPROP_SELECTABLE,false);
   ObjectSetInteger(0,n,OBJPROP_HIDDEN,true);
  }
void mkButton(string n,int x,int y,int w,int h,string text,color bg,color tx)
  {
   x=_s(x); y=_s(y); w=_s(w); h=_s(h);
   ObjectCreate(0,n,OBJ_BUTTON,0,0,0);
   ObjectSetInteger(0,n,OBJPROP_CORNER,CORNER_LEFT_UPPER);
   ObjectSetInteger(0,n,OBJPROP_XDISTANCE,x); ObjectSetInteger(0,n,OBJPROP_YDISTANCE,y);
   ObjectSetInteger(0,n,OBJPROP_XSIZE,w);     ObjectSetInteger(0,n,OBJPROP_YSIZE,h);
   ObjectSetString (0,n,OBJPROP_TEXT,text);
   ObjectSetInteger(0,n,OBJPROP_COLOR,tx);
   ObjectSetInteger(0,n,OBJPROP_BGCOLOR,bg);
   ObjectSetInteger(0,n,OBJPROP_FONTSIZE,8);
   ObjectSetString (0,n,OBJPROP_FONT,"Arial");
   ObjectSetInteger(0,n,OBJPROP_STATE,false);
   ObjectSetInteger(0,n,OBJPROP_ZORDER,10);   // panel button above the chart lines
   ObjectSetInteger(0,n,OBJPROP_SELECTABLE,false);
   ObjectSetInteger(0,n,OBJPROP_HIDDEN,true);
  }
void mkEdit(string n,int x,int y,int w,int h,string text)
  {
   x=_s(x); y=_s(y); w=_s(w); h=_s(h);
   ObjectCreate(0,n,OBJ_EDIT,0,0,0);
   ObjectSetInteger(0,n,OBJPROP_CORNER,CORNER_LEFT_UPPER);
   ObjectSetInteger(0,n,OBJPROP_XDISTANCE,x); ObjectSetInteger(0,n,OBJPROP_YDISTANCE,y);
   ObjectSetInteger(0,n,OBJPROP_XSIZE,w);     ObjectSetInteger(0,n,OBJPROP_YSIZE,h);
   ObjectSetString (0,n,OBJPROP_TEXT,text);
   ObjectSetInteger(0,n,OBJPROP_COLOR,COL_PANEL_NUMX);
   ObjectSetInteger(0,n,OBJPROP_BGCOLOR,COL_PANEL_NUMB);
   ObjectSetString (0,n,OBJPROP_FONT,"Lucida Console");   // monospace numerals (ships on all Windows)
   ObjectSetInteger(0,n,OBJPROP_ALIGN,ALIGN_CENTER);
   ObjectSetInteger(0,n,OBJPROP_FONTSIZE,8);
   ObjectSetInteger(0,n,OBJPROP_READONLY,false);
   ObjectSetInteger(0,n,OBJPROP_ZORDER,10);   // panel edit box above the chart lines
   ObjectSetInteger(0,n,OBJPROP_SELECTABLE,false);
   ObjectSetInteger(0,n,OBJPROP_HIDDEN,true);
  }

// Section header: small accent label with a thin divider underline.
void mkHeader(string n,int x,int y,int w,string text)
  {
   mkLabel(n,x+12,y,text,COL_HEADER,8);
   mkRect (n+"_DIV",x+12,y+16,w-24,1,COL_DIV,COL_DIV);
  }

//==================================================================
//  CHART SCALE LOCK
//  Frames the chart like TradingView: takes the visible candle high/low,
//  pads each side by g_scalePadPips, and pins the scale (Scale Fix on,
//  auto-scroll off). Locking the scale also STOPS MT5 auto-rescaling, so
//  the chart no longer jumps mid-session. Re-applied only when the scale
//  gets reset (e.g. you double-click the axis) — never on a timer.
//==================================================================
void ApplyScaleLock()
  {
   if(!g_scaleLock) return;
   int first=(int)ChartGetInteger(0,CHART_FIRST_VISIBLE_BAR);
   int vis  =(int)ChartGetInteger(0,CHART_VISIBLE_BARS);
   if(first<0 || vis<=0) return;                 // chart not ready yet
   double hi=-DBL_MAX, lo=DBL_MAX;
   for(int i=0;i<vis;i++)
     {
      int sh=first-i; if(sh<0) break;
      double h=iHigh(_Symbol,_Period,sh), l=iLow(_Symbol,_Period,sh);
      if(h>hi) hi=h; if(l<lo) lo=l;
     }
   if(hi<=lo) return;
   double off=g_scalePadPips*g_pip;              // pips -> price, per-symbol pip size
   ChartSetInteger(0,CHART_SCALEFIX,true);
   ChartSetDouble (0,CHART_FIXED_MAX,hi+off);
   ChartSetDouble (0,CHART_FIXED_MIN,lo-off);
   ChartSetInteger(0,CHART_AUTOSCROLL,false);
   ChartRedraw();
  }
void ReleaseScaleLock()
  {
   ChartSetInteger(0,CHART_SCALEFIX,false);       // back to MT5 auto-scaling
   ChartSetInteger(0,CHART_AUTOSCROLL,true);
   ChartRedraw();
  }
void BuildPanel()
  {
   // Deleting and recreating ~53 objects on every keystroke is what makes the panel flash:
   // the terminal repaints on its own schedule and can catch the moment where they are gone.
   // Rebuild in place instead, and only wipe when the layout genuinely changes shape.
   static bool s_built   = false;
   static bool s_wasOpen = false;
   if(!s_built || s_wasOpen != g_panelOpen) DeleteByPrefix(PP);
   s_built   = true;
   s_wasOpen = g_panelOpen;
   int x=PX, y=PY, w=PWID;
   int titleH=34, mX=8, padX=12;
   int cardX=x+mX, cardW=w-2*mX;
   int labelX=cardX+padX;
   int Rend=cardX+cardW-padX;
   int BW=90, CH=23, GAP=7, ROWH=27;
   int box1=Rend-BW;               // rightmost control box
   int box2=Rend-2*BW-GAP;         // left box of a two-box row

   // ---- Title bar ----
   mkRect (PP+"TITLE",x,y,w,titleH,COL_PANEL_CARD,COL_PANEL_CARD);
   mkRect (PP+"TLINE",x,y+titleH-1,w,1,COL_PANEL_LINE,COL_PANEL_LINE);
   mkLabel(PP+"NAME",x+12,y+11,"Minimalist Manager",COL_PANEL_NAME,9);
   mkIconBtn(PP+"SCREFRAME",x+w-64,y+17,ShortToString(0x27F3),COL_PANEL_ICON,12,"Segoe UI Symbol");
   ObjectSetString(0,PP+"SCREFRAME",OBJPROP_TOOLTIP,"Reframe chart now");
   mkIconBtn(PP+"TOGGLE",x+w-40,y+17,g_panelOpen?ShortToString(0x2212):"+",COL_PANEL_ICON,12,"Segoe UI Symbol");
   mkIconBtn(PP+"QUIT",x+w-16,y+17,ShortToString(0x00D7),COL_PANEL_X,12,"Segoe UI Symbol",COL_PANEL_XBG);

   if(!g_panelOpen){ g_panelH=titleH; DrawHint(); ChartRedraw(); return; }

   int bTop=y+titleH;
   // Measured from the cards at the end of this function, then REMEMBERED - so every rebuild
   // after the first creates the background at the right size and never has to resize it.
   // (Resizing on every rebuild is what made the panel flicker on each click.)
   static int s_bodyH = 616;
   int bodyH = s_bodyH;
   mkRect(PP+"BODY",x,bTop,w,bodyH,COL_PANEL_BG,COL_PANEL_BG);

   int cy=bTop+6, cardH, ry;

   // ===== ORDER =====
   cardH=31+ROWH*3;
   mkRect (PP+"C_ORD",cardX,cy,cardW,cardH,COL_PANEL_CARD,COL_PANEL_CARD);
   mkLabel(PP+"ST_ORD",labelX,cy+7,"ORDER",COL_PANEL_SECT,8);
   ry=cy+23;
   mkLabel (PP+"L_ACT",labelX,ry+6,"Active",COL_PANEL_LBL,8);
   mkButton(PP+"ACTIVE",box1,ry+2,BW,CH,g_active?"ON":"OFF",g_active?COL_PANEL_ACC:COL_PANEL_OFF,g_active?COL_PANEL_ACCX:COL_PANEL_OFFX);
   ry+=ROWH;
   mkLabel (PP+"L_OK",labelX,ry+6,"Order type",COL_PANEL_LBL,8);
   mkButton(PP+"ORDKIND",box1,ry+2,BW,CH,OrderKindText(),COL_PANEL_BTN,COL_PANEL_BTX);
   ry+=ROWH;
   mkLabel (PP+"L_EXEC",labelX,ry+6,"Execution key",COL_PANEL_LBL,8);
   mkButton(PP+"EXECKEY",box1,ry+2,BW,CH,g_awaitKey?"...":("Key "+g_execKeyChar),g_awaitKey?COL_PANEL_WARN:COL_PANEL_BTN,g_awaitKey?COL_PANEL_ACCX:COL_PANEL_BTX);
   cy+=cardH+6;

   // ===== RISK & STOPS =====
   cardH=31+ROWH*3;
   mkRect (PP+"C_RSK",cardX,cy,cardW,cardH,COL_PANEL_CARD,COL_PANEL_CARD);
   mkLabel(PP+"ST_RSK",labelX,cy+7,"RISK & STOPS",COL_PANEL_SECT,8);
   ry=cy+23;
   mkLabel (PP+"L_RM",labelX,ry+6,"Risk",COL_PANEL_LBL,8);
   mkButton(PP+"RISKMODE",box2,ry+2,BW,CH,RiskModeText(),COL_PANEL_BTN,COL_PANEL_BTX);
   mkEdit  (PP+"RISKVAL",box1,ry+2,BW,CH,Fmt(RiskValGet(),2));
   ry+=ROWH;
   mkLabel (PP+"L_MIN",labelX,ry+6,"Min SL",COL_PANEL_LBL,8);
   mkEdit  (PP+"MINSL",box1,ry+2,BW,CH,Fmt(g_minSL,1));
   ry+=ROWH;
   mkLabel (PP+"L_MAX",labelX,ry+6,"Max SL",COL_PANEL_LBL,8);
   mkEdit  (PP+"MAXSL",box1,ry+2,BW,CH,Fmt(g_maxSL,1));
   cy+=cardH+6;

   // ===== TAKE PROFIT =====
   cardH=31+ROWH*2;
   mkRect (PP+"C_TP",cardX,cy,cardW,cardH,COL_PANEL_CARD,COL_PANEL_CARD);
   mkLabel(PP+"ST_TP",labelX,cy+7,"TAKE PROFIT",COL_PANEL_SECT,8);
   ry=cy+23;
   mkLabel (PP+"L_TPM",labelX,ry+6,"Target by",COL_PANEL_LBL,8);
   mkButton(PP+"TPMODE",box1,ry+2,BW,CH,(g_tpMode==TP_BY_RR)?"R : R":"PIPS",COL_PANEL_BTN,COL_PANEL_BTX);
   ry+=ROWH;
   mkLabel (PP+"L_TP",labelX,ry+6,"Take profit",COL_PANEL_LBL,8);
   mkButton(PP+"TPON0",box2,ry+2,BW,CH,g_tpOn[0]?"ON":"OFF",g_tpOn[0]?COL_PANEL_ACC:COL_PANEL_OFF,g_tpOn[0]?COL_PANEL_ACCX:COL_PANEL_OFFX);
   mkEdit  (PP+"TPVAL0",box1,ry+2,BW,CH,Fmt(g_tpVal[0],2));
   cy+=cardH+6;

   // ===== BREAK-EVEN =====
   cardH=31+ROWH*3;       // three rows: BE line, offset value, offset unit
   mkRect (PP+"C_BE",cardX,cy,cardW,cardH,COL_PANEL_CARD,COL_PANEL_CARD);
   mkLabel(PP+"ST_BE",labelX,cy+7,"BREAK-EVEN",COL_PANEL_SECT,8);
   ry=cy+23;
   mkLabel (PP+"L_BEU",labelX,ry+6,"BE line",COL_PANEL_LBL,8);
   mkButton(PP+"BEUSE",box1,ry+2,BW,CH,g_useBE?"ON":"OFF",g_useBE?COL_PANEL_ACC:COL_PANEL_OFF,g_useBE?COL_PANEL_ACCX:COL_PANEL_OFFX);
   ry+=ROWH;
   mkLabel (PP+"L_BEO",labelX,ry+6,(g_beOffMode==BEOFF_BY_RR)?"BE offset (R)":"BE offset (pips)",COL_PANEL_LBL,8);
   mkEdit  (PP+"BEOFF",box1,ry+2,BW,CH,Fmt(g_beOffset,g_beOffMode==BEOFF_BY_RR?2:1));
   ry+=ROWH;
   mkLabel (PP+"L_BEM",labelX,ry+6,"Offset unit",COL_PANEL_LBL,8);
   mkButton(PP+"BEOMODE",box1,ry+2,BW,CH,(g_beOffMode==BEOFF_BY_RR)?"R":"PIPS",COL_PANEL_BTN,COL_PANEL_BTX);
   cy+=cardH+6;

   // ===== DAILY LIMIT =====
   cardH=31+ROWH*2;       // two rows: Max trades, and the reset-timezone line
   mkRect (PP+"C_DL",cardX,cy,cardW,cardH,COL_PANEL_CARD,COL_PANEL_CARD);
   mkLabel(PP+"ST_DL",labelX,cy+7,"DAILY LIMIT",COL_PANEL_SECT,8);
   ry=cy+23;
   mkLabel (PP+"L_DL",labelX,ry+6,"Max trades",COL_PANEL_LBL,8);
   {
      bool _dmax =(g_maxTradesDay>0 && g_tradesToday>=g_maxTradesDay);   // reached
      bool _dlock=(g_maxTradesDay>0 && g_tradesToday>=1);                // frozen after first trade
      string _dtext=_dlock ? (IntegerToString(g_tradesToday)+" : "+IntegerToString(g_maxTradesDay)) : IntegerToString(g_maxTradesDay);
      mkEdit(PP+"MAXTRD",box1,ry+2,BW,CH,_dtext);
      // Set both ways round: without the delete-all, a property left unset simply keeps
      // whatever it was on the previous build.
      ObjectSetInteger(0,PP+"MAXTRD",OBJPROP_READONLY,_dlock);
      ObjectSetInteger(0,PP+"MAXTRD",OBJPROP_COLOR,_dmax?COL_PANEL_WARN:COL_PANEL_NUMX);
   }
   ry+=ROWH;
   mkLabel(PP+"L_DLTZ",labelX,ry+6,DayResetLabel(),COL_PANEL_LBL,8);
   cy+=cardH+6;

   // ===== CHART SCALE =====
   cardH=31+ROWH;
   mkRect (PP+"C_SC",cardX,cy,cardW,cardH,COL_PANEL_CARD,COL_PANEL_CARD);
   mkLabel(PP+"ST_SC",labelX,cy+7,"CHART SCALE",COL_PANEL_SECT,8);
   ry=cy+23;
   mkLabel (PP+"L_SC",labelX,ry+6,"Lock scale",COL_PANEL_LBL,8);
   mkButton(PP+"SCLOCK",box2,ry+2,BW,CH,g_scaleLock?"ON":"OFF",g_scaleLock?COL_PANEL_ACC:COL_PANEL_OFF,g_scaleLock?COL_PANEL_ACCX:COL_PANEL_OFFX);
   mkEdit  (PP+"SCPAD",box1,ry+2,BW,CH,Fmt(g_scalePadPips,0));
   cy+=cardH+6;

   // ===== SESSION TOOL SYNC =====
   cardH=31+ROWH;
   mkRect (PP+"C_SY",cardX,cy,cardW,cardH,COL_PANEL_CARD,COL_PANEL_CARD);
   mkLabel(PP+"ST_SY",labelX,cy+7,"SESSIONTOOL.APP SYNC",COL_PANEL_SECT,8);
   ry=cy+23;
   mkLabel (PP+"L_SYNC",labelX,ry+6,"Status",COL_PANEL_LBL,8);
   if(StringLen(g_syncTokenEff)>0)
     {
      mkLabel (PP+"V_SYNC",box2,ry+6,"ON "+SyncTokenMasked(),COL_PANEL_ACC,8);
      mkButton(PP+"SYNCCLR",box1,ry+2,BW,CH,"clear",COL_PANEL_BTN,COL_PANEL_BTX);
     }
   else
     {
      mkLabel (PP+"V_SYNC",box2,ry+6,"no token",COL_PANEL_WARN,8);
      ObjectDelete(0,PP+"SYNCCLR");        // the only conditionally-created object: it must go
     }
   cy+=cardH+6;

   // The background is drawn FIRST (so the cards sit on top of it) but can only be MEASURED
   // last. cy has walked past the final card, and each card left a 6px gap behind it, which
   // becomes the bottom padding - matching the 6px we started with at the top.
   bodyH = cy - bTop;                       // true content height: cards + the 6px gap each left
   if(bodyH != s_bodyH)                     // only ever touches the object when it actually changed
     {
      s_bodyH = bodyH;
      ObjectSetInteger(0,PP+"BODY",OBJPROP_YSIZE,_s(bodyH));
     }

   g_panelH=titleH+bodyH;
   DrawHint();
   ChartRedraw();
  }


//==================================================================
//  PANEL EVENT HANDLING
//==================================================================
double ReadEdit(string name){ return StringToDouble(ObjectGetString(0,name,OBJPROP_TEXT)); }

void HandleClick(string s)
  {
   if(s==PP+"TOGGLE"){ g_panelOpen=!g_panelOpen; BuildPanel(); return; }
   if(s==PP+"QUIT")
     {
      SaveState();                 // keep settings for next time
      DeleteByPrefix(PFX);         // remove every panel + chart object
      Comment("");
      ChartRedraw();
      ExpertRemove();              // detach the EA from the chart
      return;
     }
   if(s==PP+"ACTIVE")
     {
      if(!g_active && DayLimitReached()){ Comment("\n  >> Daily limit reached ("+IntegerToString(g_maxTradesDay)+" trades). Stays off until your next day."); Warn("Daily trade limit reached - stays off until next day."); return; }
      g_active=!g_active;
      if(!g_active){ g_execMode=false; HideExecutionLines(); HideAllVisuals(); }   // hide every line; pause activity
      else UpdateManageLine();                                // repaint live-trade lines NOW
      g_pausedByLimit=false;                                  // manual toggle = user owns the ACTIVE state now
      SaveState(); BuildPanel(); return;
     }
   if(s==PP+"SYNCCLR"){ SyncTokenClear(); BuildPanel(); return; }
   if(s==PP+"SCLOCK"){ g_scaleLock=!g_scaleLock; if(g_scaleLock) ApplyScaleLock(); else ReleaseScaleLock(); BuildPanel(); return; }
   if(s==PP+"SCREFRAME"){ ChartSetInteger(0,CHART_SCALEFIX,false); if(!g_scaleLock){ g_scaleLock=true; SaveState(); } ApplyScaleLock(); BuildPanel(); return; }
   if(s==PP+"ORDKIND"){ SwitchOrderKind(); return; }
   if(s==PP+"EXECKEY"){ g_awaitKey=!g_awaitKey; BuildPanel(); return; }
   if(s==PP+"RISKMODE"){ CycleRiskMode(); return; }
   if(s==PP+"EXEC"){ ToggleExecMode(); return; }
   if(s==PP+"TRADE"){ if(g_execMode) PlaceTrade(); else Comment("\n  >> Turn EXEC MODE on first."); return; }
   if(s==PP+"RISKOFF"){ RiskOffHalf(); return; }
   if(s==PP+"CXL"){ CancelPending(); return; }
   if(s==PP+"CLOSE"){ CloseAll(); return; }
   if(s==PP+"TPMODE"){ g_tpMode=(g_tpMode==TP_BY_RR)?TP_BY_PIPS:TP_BY_RR; if(g_execMode) RedrawTargets(); BuildPanel(); return; }
   if(s==PP+"BEUSE")
     {
      g_useBE=!g_useBE;
      // If toggled during a live trade, add or remove the BE line on the open position now.
      double pe; int pd;
      if(PositionsEntry(pe,pd))
        {
         if(g_useBE)
           {
            // read the position's TP so we can park BE near it (safe, away from price)
            double ptp=0;
            for(int i=PositionsTotal()-1;i>=0;i--)
              {
               ulong tk=PositionGetTicket(i);
               if(!PositionSelectByTicket(tk)) continue;
               if(PositionGetString(POSITION_SYMBOL)!=_Symbol) continue;
               if(PositionGetInteger(POSITION_MAGIC)!=InpMagic) continue;
               ptp=PositionGetDouble(POSITION_TP); break;
              }
            double bePrice;
            if(ptp>0) bePrice=ptp-pd*5*g_pip;                 // just inside the TP
            else
              {
               int cnt; double slp=PositionsSL(cnt);
               double slDist=(slp>0)?MathAbs(pe-slp):g_minSL*g_pip;
               bePrice=pe+pd*g_beRR*slDist;                   // no TP -> fall back to R distance
              }
            EnsureHLine(LN_BE,bePrice,COL_LINE_BE,STYLE_SOLID,true);
            SetLineText(TX_BE,bePrice,"BE",COL_LINE_BE);
            g_beTrigger=bePrice; g_beDir=pd; g_beArmed=true;
           }
         else { ObjectDelete(0,LN_BE); ObjectDelete(0,TX_BE); g_beArmed=false; }
        }
      if(g_execMode) RedrawTargets();
      BuildPanel(); return;
     }
   for(int i=0;i<6;i++)
      if(s==PP+"TPON"+IntegerToString(i)){ g_tpOn[i]=!g_tpOn[i]; if(g_execMode) RedrawTargets(); BuildPanel(); return; }
  }

void HandleEndEdit(string s)
  {
   if(s==PP+"RISKVAL"){ RiskValSet(ReadEdit(s)); SaveState(); return; }
   if(s==PP+"MINSL"){ g_minSL=ReadEdit(s); SaveState(); return; }
   if(s==PP+"MAXSL"){ g_maxSL=ReadEdit(s); SaveState(); return; }
   if(s==PP+"BERR"){ g_beRR=ReadEdit(s); SaveState(); return; }
   if(s==PP+"BEOFF"){ g_beOffset=ReadEdit(s); SaveState(); return; }
   if(s==PP+"BEOMODE"){ g_beOffMode=(g_beOffMode==BEOFF_BY_RR)?BEOFF_BY_PIPS:BEOFF_BY_RR; SaveState(); BuildPanel(); return; }
   if(s==PP+"SCPAD"){ g_scalePadPips=ReadEdit(s); if(g_scaleLock){ ChartSetInteger(0,CHART_SCALEFIX,false); ApplyScaleLock(); } SaveState(); return; }
   if(s==PP+"MAXTRD"){ RefreshDayCount(); if(g_tradesToday>=1){ Warn("Max trades is locked after your first trade today - unlocks next day."); BuildPanel(); return; } g_maxTradesDay=(int)ReadEdit(s); if(g_maxTradesDay<0) g_maxTradesDay=0; RefreshDayCount(); SaveState(); BuildPanel(); return; }
   for(int i=0;i<6;i++)
     {
      if(s==PP+"TPVAL"+IntegerToString(i)){ g_tpVal[i]=ReadEdit(s); SaveState(); return; }
      if(s==PP+"TPPCT"+IntegerToString(i)){ g_tpPct[i]=ReadEdit(s); SaveState(); return; }
     }
  }

//==================================================================
//  MOUSE HELPERS
//==================================================================
bool OverPanel(int x,int y){ return (x>=_s(PX) && x<=_s(PX)+_s(PWID) && y>=_s(PY) && y<=_s(PY)+_s(g_panelH)); }

// Is the cursor near a draggable line (entry / TP / BE)? Then a press = drag, not execute.
bool OverDraggableLine(int x,int y)
  {
   string names[8]; int n=0;
   if(ObjectFind(0,LN_ENTRY)>=0) names[n++]=LN_ENTRY;
   if(ObjectFind(0,LN_BE)>=0)    names[n++]=LN_BE;
   for(int i=0;i<6;i++){ string t=LN_TP+IntegerToString(i); if(ObjectFind(0,t)>=0) names[n++]=t; }
   for(int i=0;i<n;i++)
     {
      int ly=PriceToY(LinePrice(names[i]));
      if(ly>=0 && MathAbs(y-ly)<=6) return true;
     }
   return false;
  }

//==================================================================
//  STATE PERSISTENCE  (survives restarts / reboots)
//==================================================================
// All settings are stored in MT5 global variables, keyed per symbol+magic
// so multiple charts keep separate settings. GVs persist across restarts.
string StateKey(string field){ return "MM_"+(string)InpMagic+"_"+_Symbol+"_"+field; }

void SaveState()
  {
   GlobalVariableSet(StateKey("orderKind"), (double)g_orderKind);
   GlobalVariableSet(StateKey("riskMode"),  (double)g_riskMode);
   GlobalVariableSet(StateKey("riskPct"),   g_riskPercent);
   GlobalVariableSet(StateKey("riskAmt"),   g_riskAmount);
   GlobalVariableSet(StateKey("fixedLot"),  g_fixedLot);
   GlobalVariableSet(StateKey("minSL"),     g_minSL);
   GlobalVariableSet(StateKey("maxSL"),     g_maxSL);
   GlobalVariableSet(StateKey("tpMode"),    (double)g_tpMode);
   GlobalVariableSet(StateKey("beOffMode"), (double)g_beOffMode);
   GlobalVariableSet(StateKey("tpOn"),      g_tpOn[0]?1:0);
   GlobalVariableSet(StateKey("tpVal"),     g_tpVal[0]);
   GlobalVariableSet(StateKey("tpPct"),     g_tpPct[0]);
   GlobalVariableSet(StateKey("useBE"),     g_useBE?1:0);
   GlobalVariableSet(StateKey("beOffset"),  g_beOffset);
   GlobalVariableSet(StateKey("beRR"),      g_beRR);
   GlobalVariableSet(StateKey("scaleLock"), g_scaleLock?1:0);
   GlobalVariableSet(StateKey("scalePad"),  g_scalePadPips);
   GlobalVariableSet(StateKey("panelOpen"), g_panelOpen?1:0);
   GlobalVariableSet(StateKey("active"),    g_active?1:0);
   GlobalVariableSet(StateKey("pausedLimit"), g_pausedByLimit?1:0);
   GlobalVariableSet(StateKey("execKey"),   (double)g_execKey);
   GlobalVariableSet(StateKey("panelX"),    (double)PX);
   GlobalVariableSet(StateKey("panelY"),    (double)PY);
   GlobalVariableSet(StateKey("maxTrd"),     (double)g_maxTradesDay);
   GlobalVariableSet(StateKey("saved"),     1);   // marker that a saved state exists

   // Commit to disk NOW rather than trusting a clean terminal shutdown. MT5 only
   // writes global variables when it closes properly, so a crash, a force-quit or a
   // power cut would otherwise discard everything changed this session. Saves are
   // user-driven (a handful per session), so the write cost is irrelevant.
   GlobalVariablesFlush();
  }

// Returns true if a previously saved state was found and loaded.
bool LoadState()
  {
   if(!GlobalVariableCheck(StateKey("saved"))) return false;   // nothing saved yet
   g_orderKind  =(ENUM_ORDER_KIND)(int)GlobalVariableGet(StateKey("orderKind"));
   g_riskMode   =(ENUM_RISK_MODE)(int)GlobalVariableGet(StateKey("riskMode"));
   g_riskPercent=GlobalVariableGet(StateKey("riskPct"));
   g_riskAmount =GlobalVariableGet(StateKey("riskAmt"));
   g_fixedLot   =GlobalVariableGet(StateKey("fixedLot"));
   g_minSL      =GlobalVariableGet(StateKey("minSL"));
   g_maxSL      =GlobalVariableGet(StateKey("maxSL"));
   g_tpMode     =(ENUM_TP_MODE)(int)GlobalVariableGet(StateKey("tpMode"));
   g_beOffMode  =(ENUM_BEOFF_MODE)(int)GlobalVariableGet(StateKey("beOffMode"));
   g_tpOn[0]    =(GlobalVariableGet(StateKey("tpOn"))>0.5);
   g_tpVal[0]   =GlobalVariableGet(StateKey("tpVal"));
   g_tpPct[0]   =GlobalVariableGet(StateKey("tpPct"));
   g_useBE      =(GlobalVariableGet(StateKey("useBE"))>0.5);
   g_beOffset   =GlobalVariableGet(StateKey("beOffset"));
   g_beRR       =GlobalVariableGet(StateKey("beRR"));
   if(GlobalVariableCheck(StateKey("scaleLock"))) g_scaleLock=(GlobalVariableGet(StateKey("scaleLock"))>0.5);
   if(GlobalVariableCheck(StateKey("scalePad")))  g_scalePadPips=GlobalVariableGet(StateKey("scalePad"));
   g_panelOpen  =(GlobalVariableGet(StateKey("panelOpen"))>0.5);
   g_active     =(GlobalVariableGet(StateKey("active"))>0.5);
   if(GlobalVariableCheck(StateKey("pausedLimit"))) g_pausedByLimit=(GlobalVariableGet(StateKey("pausedLimit"))>0.5);
   g_execKey    =(int)GlobalVariableGet(StateKey("execKey"));
   PX           =(int)GlobalVariableGet(StateKey("panelX"));
   PY           =(int)GlobalVariableGet(StateKey("panelY"));
   if(GlobalVariableCheck(StateKey("maxTrd"))) g_maxTradesDay=(int)GlobalVariableGet(StateKey("maxTrd"));
   // rebuild the exec-key display character from the stored key code
   g_execKeyChar=CharToString((uchar)g_execKey); StringToUpper(g_execKeyChar);
   // safety: keep values sane after load
   if(g_minSL<=0) g_minSL=InpMinSLpips;
   if(g_maxSL<=0) g_maxSL=InpMaxSLpips;
   if(g_minSL>g_maxSL){ double t=g_minSL; g_minSL=g_maxSL; g_maxSL=t; }
   return true;
  }

//==================================================================
//  SESSION TOOL SYNC  (push closed trades to the journal app)
//==================================================================
// Persist the sync token to the terminal's Files folder so re-opening the EA from the
// Navigator (which reloads default inputs) doesn't lose it. Stored locally on this PC only.
string SyncTokenLoad()
  {
   if(!FileIsExist(SYNC_TOKEN_FILE)){ Print("SessionTool.app: no saved sync token file yet."); return ""; }
   int h=FileOpen(SYNC_TOKEN_FILE, FILE_READ|FILE_TXT|FILE_ANSI);
   if(h==INVALID_HANDLE){ PrintFormat("SessionTool.app: could not read saved sync token (file error %d).",GetLastError()); return ""; }
   string s = FileIsEnding(h) ? "" : FileReadString(h);
   FileClose(h);
   StringTrimLeft(s); StringTrimRight(s);
   return s;
  }
void SyncTokenSave(string tok)
  {
   int h=FileOpen(SYNC_TOKEN_FILE, FILE_WRITE|FILE_TXT|FILE_ANSI);
   if(h==INVALID_HANDLE){ PrintFormat("SessionTool.app: FAILED to save sync token (file error %d).",GetLastError()); return; }
   FileWriteString(h, tok);
   FileFlush(h);
   FileClose(h);
   PrintFormat("SessionTool.app: sync token saved to file (len=%d) - it will be remembered next time.",StringLen(tok));
  }
// Masked token for the panel (shows only the last 4 chars).
string SyncTokenMasked()
  {
   int n=StringLen(g_syncTokenEff);
   if(n==0) return "--";
   return "..."+StringSubstr(g_syncTokenEff, (n>4?n-4:0));
  }
// Wipe the saved token (turns sync off until a token is entered again).
void SyncTokenClear()
  {
   g_syncTokenEff="";
   g_syncCatchupPending=false;
   if(FileIsExist(SYNC_TOKEN_FILE)) FileDelete(SYNC_TOKEN_FILE);
   Print("SessionTool.app: sync token cleared - sync is now off until you enter a token again.");
  }
// ---- durable "already synced" record --------------------------------------
// MT5 auto-deletes GlobalVariables not touched for ~4 weeks (and some recompiles
// wipe them), which used to make the EA re-push old trades. We now persist the sent
// position ids to a file in the Common data folder, so the record survives restarts,
// recompiles and the 4-week purge. The startup catch-up reads it to sync anything that
// closed while MT5/the PC was off.
ulong  g_syncedIds[];
bool   g_syncedLoaded=false;

string SyncMarkKey(ulong posId){ return "MMS_"+(string)posId; }
string SyncSentFile(){ return "SessionTool_synced_"+(string)AccountInfoInteger(ACCOUNT_LOGIN)+".txt"; }

void SyncLoadSent()
  {
   if(g_syncedLoaded) return;
   g_syncedLoaded=true;
   ArrayResize(g_syncedIds,0);
   int h=FileOpen(SyncSentFile(),FILE_READ|FILE_TXT|FILE_ANSI|FILE_COMMON|FILE_SHARE_READ|FILE_SHARE_WRITE);
   if(h==INVALID_HANDLE) return;
   while(!FileIsEnding(h))
     {
      string line=FileReadString(h);
      ulong  id=(ulong)StringToInteger(line);
      if(id>0){ int n=ArraySize(g_syncedIds); ArrayResize(g_syncedIds,n+1); g_syncedIds[n]=id; }
     }
   FileClose(h);
  }

bool SyncInMemory(ulong posId)
  {
   for(int i=0;i<ArraySize(g_syncedIds);i++) if(g_syncedIds[i]==posId) return true;
   return false;
  }

void SyncMarkPushed(ulong posId)
  {
   if(posId==0) return;
   SyncLoadSent();
   if(SyncInMemory(posId)) return;
   int n=ArraySize(g_syncedIds); ArrayResize(g_syncedIds,n+1); g_syncedIds[n]=posId;
   int h=FileOpen(SyncSentFile(),FILE_READ|FILE_WRITE|FILE_TXT|FILE_ANSI|FILE_COMMON|FILE_SHARE_READ|FILE_SHARE_WRITE);
   if(h!=INVALID_HANDLE){ FileSeek(h,0,SEEK_END); FileWrite(h,(string)posId); FileClose(h); }
   GlobalVariableSet(SyncMarkKey(posId),1.0);   // harmless legacy marker, kept for back-compat
  }

bool SyncAlreadyPushed(ulong posId)
  {
   SyncLoadSent();
   if(SyncInMemory(posId)) return true;
   // one-time migration: a still-present legacy GlobalVariable marker means it was already sent
   if(GlobalVariableCheck(SyncMarkKey(posId))){ SyncMarkPushed(posId); return true; }
   return false;
  }

string SyncIso(datetime t)
  {
   // t is broker SERVER time. Convert to UTC so the Session Tool app can localise it
   // to the user's own timezone. Offset = how far the server is ahead of GMT right now.
   long off=(long)(TimeCurrent()-TimeGMT());
   datetime g=(datetime)((long)t-off);
   string s=TimeToString(g,TIME_DATE|TIME_SECONDS);   // "YYYY.MM.DD HH:MM:SS" (UTC)
   StringReplace(s,".","-");
   StringReplace(s," ","T");
   return s+"Z";
  }

bool SyncPost(string json)
  {
   char post[]; StringToCharArray(json,post,0,StringLen(json),CP_UTF8);
   char result[]; string rh;
   string headers="Content-Type: application/json\r\nAuthorization: Bearer "+SYNC_KEY+"\r\n";
   ResetLastError();
   int code=WebRequest("POST",InpSyncURL,headers,5000,post,result,rh);
   if(code==-1)
     {
      int err=GetLastError();
      if(err==4060)
         PrintFormat("SessionTool.app sync: '%s' not allowed. Add it under Tools > Options > Expert Advisors > Allow WebRequest.",InpSyncURL);
      else
         PrintFormat("SessionTool.app sync: WebRequest failed (error %d).",err);
      return false;
     }
   if(code==200) return true;
   PrintFormat("SessionTool.app sync: server returned HTTP %d (%s)",code,CharArrayToString(result));
   return false;
  }

bool SyncCollectAndPush(ulong posId)
  {
   if(SyncAlreadyPushed(posId)) return true;
   if(!HistorySelectByPosition(posId)) return false;
   int n=HistoryDealsTotal();
   double inVol=0,inPV=0,outVol=0,outPV=0,pnl=0,feeRaw=0;
   datetime openT=0,closeT=0;
   string sym=""; int dirIn=0; bool haveIn=false;
   for(int i=0;i<n;i++)
     {
      ulong dt=HistoryDealGetTicket(i);
      if(dt==0) continue;
      long   de   =HistoryDealGetInteger(dt,DEAL_ENTRY);
      long   dtype=HistoryDealGetInteger(dt,DEAL_TYPE);
      double price=HistoryDealGetDouble (dt,DEAL_PRICE);
      double vol  =HistoryDealGetDouble (dt,DEAL_VOLUME);
      double prof =HistoryDealGetDouble (dt,DEAL_PROFIT);
      double swp  =HistoryDealGetDouble (dt,DEAL_SWAP);
      double com  =HistoryDealGetDouble (dt,DEAL_COMMISSION);
      datetime tt =(datetime)HistoryDealGetInteger(dt,DEAL_TIME);
      if(sym=="") sym=HistoryDealGetString(dt,DEAL_SYMBOL);
      pnl+=prof+swp+com;
      feeRaw+=swp+com;
      if(de==DEAL_ENTRY_IN)
        {
         inVol+=vol; inPV+=price*vol;
         if(!haveIn){ openT=tt; dirIn=(dtype==DEAL_TYPE_BUY)?1:-1; haveIn=true; }
         else if(tt<openT) openT=tt;
        }
      else if(de==DEAL_ENTRY_OUT || de==DEAL_ENTRY_INOUT || de==DEAL_ENTRY_OUT_BY)
        {
         outVol+=vol; outPV+=price*vol;
         if(tt>closeT) closeT=tt;
        }
     }
   if(!haveIn || inVol<=0) return false;
   double entryPrice=inPV/inVol;
   double exitPrice =(outVol>0)?outPV/outVol:0.0;
   string dir=(dirIn>0)?"buy":"sell";
   int dg=(int)SymbolInfoInteger(sym,SYMBOL_DIGITS); if(dg<=0) dg=g_digits;

   // The broker ACCOUNT this trade belongs to. Without it the app receives an undifferentiated
   // stream: two prop accounts syncing under one token produce trades that are indistinguishable
   // except by symbol, time and lot size, so filing an import is guesswork - and a wrong guess
   // silently moves the wrong account's balance, floor and challenge progress, permanently.
   long login=AccountInfoInteger(ACCOUNT_LOGIN);

   string json=StringFormat(
      "{\"token\":\"%s\",\"ticket\":%I64u,\"login\":%I64d,\"symbol\":\"%s\",\"direction\":\"%s\",\"lots\":%s,\"entry_price\":%s,\"exit_price\":%s,\"open_time\":\"%s\",\"close_time\":\"%s\",\"pnl\":%s,\"costs\":%s",
      g_syncTokenEff,posId,login,sym,dir,
      DoubleToString(inVol,2),
      DoubleToString(entryPrice,dg),
      DoubleToString(exitPrice,dg),
      SyncIso(openT),SyncIso(closeT),
      DoubleToString(pnl,2),
      DoubleToString(-feeRaw,2));

   // Append the EA-only detail if this trade was stamped at entry.
   string sk="MMD_"+(string)posId+"_";
   bool haveDetail=GlobalVariableCheck(sk+"sl");
   if(haveDetail)
     {
      double slp=GlobalVariableGet(sk+"sl");
      double rsk=GlobalVariableCheck(sk+"risk")?GlobalVariableGet(sk+"risk"):0.0;
      double tpr=GlobalVariableCheck(sk+"tpr") ?GlobalVariableGet(sk+"tpr") :0.0;
      double tpp=GlobalVariableCheck(sk+"tpp") ?GlobalVariableGet(sk+"tpp") :0.0;
      double mfp=GlobalVariableCheck(sk+"mfe") ?GlobalVariableGet(sk+"mfe") :0.0;
      double mfr=(slp>0)? mfp/slp : 0.0;
      json+=StringFormat(",\"sl_pips\":%s,\"risk_gbp\":%s,\"tp_r\":%s,\"tp_pips\":%s,\"mfe_pips\":%s,\"mfe_r\":%s",
                         DoubleToString(slp,1),DoubleToString(rsk,2),
                         DoubleToString(tpr,2),DoubleToString(tpp,1),
                         DoubleToString(mfp,1),DoubleToString(mfr,2));
     }
   json+="}";

   if(SyncPost(json))
     {
      SyncMarkPushed(posId);
      CE_Queue(posId,sym,openT,closeT);   // Trade Replay: queue this trade's candle export

      // Hand this trade to the post-mortem BEFORE the stamp is cleared - the stop price,
      // the TP price and the risk distance all live in those globals, and the replay needs
      // every one of them. It resolves later (it usually needs bars that do not exist yet),
      // then posts an update against this same ticket.
      if(haveDetail)
        {
         double slPips=GlobalVariableGet(sk+"sl");
         double tpPx  =GlobalVariableCheck(sk+"tpx")?GlobalVariableGet(sk+"tpx"):0.0;
         double lastSL=GlobalVariableCheck(sk+"lsl")?GlobalVariableGet(sk+"lsl"):0.0;
         datetime beT =GlobalVariableCheck(sk+"bet")
                       ?(datetime)(long)GlobalVariableGet(sk+"bet") : (datetime)0;
         PM_Queue(posId,sym,dirIn,entryPrice,lastSL,tpPx,slPips,openT,closeT,pnl,beT);
        }

      if(haveDetail)
        {
         GlobalVariableDel(sk+"sl");  GlobalVariableDel(sk+"risk");
         GlobalVariableDel(sk+"tpr"); GlobalVariableDel(sk+"tpp");
         GlobalVariableDel(sk+"mfe");
         GlobalVariableDel(sk+"tpx"); GlobalVariableDel(sk+"lsl");
         GlobalVariableDel(sk+"bet");
        }
      return true;
     }
   return false;
  }

//==================================================================
//  LIVE SESSION STATUS  (private, ephemeral - open/close events)
//==================================================================
// Fire-and-forget POST to the live-trade edge function.
bool LivePost(string json)
  {
   char post[]; StringToCharArray(json,post,0,StringLen(json),CP_UTF8);
   char result[]; string rh;
   string headers="Content-Type: application/json\r\nAuthorization: Bearer "+SYNC_KEY+"\r\n";
   ResetLastError();
   int code=WebRequest("POST",InpLiveURL,headers,5000,post,result,rh);
   if(code==-1)
     {
      int err=GetLastError();
      if(err==4060)
         PrintFormat("Live status: '%s' not allowed. Add it under Tools > Options > Expert Advisors > Allow WebRequest.",InpLiveURL);
      else
         PrintFormat("Live status: WebRequest failed err=%d (will retry).",err);   // e.g. timeout on an edge-function cold start
      return false;
     }
   if(code!=200) PrintFormat("Live status: HTTP %d (will retry).",code);           // 403 unknown-token, 5xx, etc. - was silent before v4.2
   return (code==200);
  }
// Queue an event (built the moment it happens); OnTimer sends it - never blocks trading.
void LiveEnqueue(string json)
  {
   if(StringLen(g_syncTokenEff)==0 || StringLen(json)==0) return;
   int n=ArraySize(g_liveQueue); ArrayResize(g_liveQueue,n+1); g_liveQueue[n]=json;
   ArrayResize(g_liveTries,n+1); g_liveTries[n]=0;
  }
// Drop the head of both parallel arrays (event + its retry counter).
void LiveDequeue0()
  {
   int n=ArraySize(g_liveQueue);
   if(n<=0) return;
   for(int i=1;i<n;i++) g_liveQueue[i-1]=g_liveQueue[i];
   ArrayResize(g_liveQueue,n-1);
   int m=ArraySize(g_liveTries);
   if(m>0){ for(int i=1;i<m;i++) g_liveTries[i-1]=g_liveTries[i]; ArrayResize(g_liveTries,m-1); }
  }
// v4.2: retry the head event on failure instead of discarding it. Sync self-heals via
// SyncCatchUp() rescanning history; live events are ephemeral and have no such rescan, so
// without in-queue retry a single dropped POST (blip / edge-function cold start) lost the
// card forever - silently. Now we keep it at the front and try again next tick, up to 6
// attempts (~6s, covering a cold start), only giving up - with a log - after that.
void LiveFlush(int maxN)
  {
   int done=0;
   while(ArraySize(g_liveQueue)>0 && done<maxN)
     {
      if(LivePost(g_liveQueue[0]))
        {
         LiveDequeue0();
         done++;
         continue;
        }
      if(ArraySize(g_liveTries)>0) g_liveTries[0]++;
      if(ArraySize(g_liveTries)==0 || g_liveTries[0]>=6)
        {
         PrintFormat("Live status: giving up after retries: %s",g_liveQueue[0]);
         LiveDequeue0();
        }
      return;   // preserve order; retry the same event on the next timer tick
     }
  }
// v4.3: re-announce every currently-open position as an "open" event. The app's live feed is
// ephemeral - it's deleted when a session ends - and the EA otherwise only announces a trade at
// the instant of entry, so a position that was already open when the feed reset never reappears.
// Re-sending "open" is idempotent (server keys on ticket), so this simply repaints the active
// card. Throttled from OnTimer; only currently-open positions are sent, never closed ones.
void LiveReannounceOpen()
  {
   if(StringLen(g_syncTokenEff)==0) return;
   int total=PositionsTotal();
   for(int i=0;i<total;i++)
     {
      ulong pos=PositionGetTicket(i);
      if(pos==0 || !PositionSelectByTicket(pos)) continue;
      ulong  posid=(ulong)PositionGetInteger(POSITION_IDENTIFIER);   // matches DEAL_POSITION_ID used at entry
      long   ptype=PositionGetInteger(POSITION_TYPE);
      string dir  =(ptype==POSITION_TYPE_BUY)?"long":"short";
      string sym  =PositionGetString(POSITION_SYMBOL);
      LiveEnqueue(StringFormat("{\"event\":\"open\",\"token\":\"%s\",\"ticket\":%I64u,\"symbol\":\"%s\",\"direction\":\"%s\"}",
                               g_syncTokenEff,posid,sym,dir));
     }
  }
// Net money P&L of a closed position: profit + swap + commission across all its deals.
double LivePositionPnl(ulong posId)
  {
   if(!HistorySelectByPosition(posId)) return 0.0;
   int n=HistoryDealsTotal(); double pnl=0.0;
   for(int i=0;i<n;i++)
     {
      ulong dt=HistoryDealGetTicket(i);
      if(dt==0) continue;
      pnl += HistoryDealGetDouble(dt,DEAL_PROFIT)
           + HistoryDealGetDouble(dt,DEAL_SWAP)
           + HistoryDealGetDouble(dt,DEAL_COMMISSION);
     }
   return pnl;
  }

void SyncEnqueue(ulong posId)
  {
   if(posId==0 || SyncAlreadyPushed(posId)) return;
   for(int i=0;i<ArraySize(g_syncQueue);i++) if(g_syncQueue[i]==posId) return;
   int n=ArraySize(g_syncQueue); ArrayResize(g_syncQueue,n+1); g_syncQueue[n]=posId;
  }

void SyncCatchUp()
  {
   if(StringLen(g_syncTokenEff)==0) return;
   datetime from=TimeCurrent()-(datetime)InpSyncDays*86400;
   if(!HistorySelect(from,TimeCurrent())) return;
   int deals=HistoryDealsTotal();
   for(int i=0;i<deals;i++)
     {
      ulong dt=HistoryDealGetTicket(i);
      if(dt==0) continue;
      long de=HistoryDealGetInteger(dt,DEAL_ENTRY);
      if(de!=DEAL_ENTRY_OUT && de!=DEAL_ENTRY_INOUT && de!=DEAL_ENTRY_OUT_BY) continue;
      ulong posId=(ulong)HistoryDealGetInteger(dt,DEAL_POSITION_ID);
      if(PositionSelectByTicket(posId)) continue;   // still open
      SyncEnqueue(posId);
     }
  }

void SyncFlush(int maxN)
  {
   if(StringLen(g_syncTokenEff)==0) return;
   int done=0;
   while(ArraySize(g_syncQueue)>0 && done<maxN)
     {
      ulong posId=g_syncQueue[0];
      for(int i=1;i<ArraySize(g_syncQueue);i++) g_syncQueue[i-1]=g_syncQueue[i];
      ArrayResize(g_syncQueue,ArraySize(g_syncQueue)-1);
      SyncCollectAndPush(posId);
      done++;
     }
  }

// Pip size for an arbitrary symbol (handles 3/5-digit fractional pricing).
double SymbolPipFor(string sym)
  {
   int    dg=(int)SymbolInfoInteger(sym,SYMBOL_DIGITS);
   double pt=SymbolInfoDouble(sym,SYMBOL_POINT);
   if(pt<=0) return g_pip;
   return (dg==3 || dg==5) ? pt*10.0 : pt;
  }


//============================================================================
//  POST-MORTEM  (v3.2)
//----------------------------------------------------------------------------
//  What price did AFTER the trade - replayed from M1 bars.
//
//  Because it reads BARS and not live ticks, it does not need MT5 to have been
//  running at the time, survives a restart, and can be run over trades that
//  closed long ago. That removes the "leave the terminal open" limitation the
//  live MFE tracker has.
//
//  WINNER -> how much further did it run before retracing to the stop where you
//            had actually left it?          = POTENTIAL R (what was on the table)
//  LOSER  -> how deep did it go against you before reversing, and did it then
//            reach your TP?                 = the stop you would have NEEDED
//
//  Both replays start at ENTRY and stop at (stop touched | TP touched | end of
//  the trading day). The bound matters: given long enough, price reaches every
//  level, and "it would have come back" becomes true of everything.
//
//  HONEST LIMIT: an M1 bar tells us its high and its low, but not which came
//  first. When one bar contains BOTH the level that saves the trade and the
//  level that kills it, we assume the ADVERSE one came first. So Potential R is
//  understated and the required stop is overstated. The numbers will never
//  flatter you.
//============================================================================

// Pending post-mortems live in a file, not GlobalVariables: we need the symbol,
// and GlobalVariables hold doubles only.
string PM_FILE = "MMPostMortem.csv";

// End of the trading day the trade closed on, in SERVER time.
datetime PM_EndOfDay(datetime t)
  {
   MqlDateTime d; TimeToStruct(t,d);
   d.hour=23; d.min=59; d.sec=59;
   return StructToTime(d);
  }

// Queue a closed position for replay. Called at close, resolved later - the
// window usually needs bars that do not exist yet.
void PM_Queue(ulong posId,string sym,int dir,double entry,double slPrice,
              double tpPrice,double slPips,datetime openT,datetime closeT,double pnl,
              datetime beT)
  {
   if(StringLen(g_syncTokenEff)==0) return;
   if(slPips<=0) return;                        // no risk distance = no R to speak of
   int h=FileOpen(PM_FILE,FILE_READ|FILE_WRITE|FILE_CSV|FILE_ANSI|FILE_SHARE_READ,',');
   if(h==INVALID_HANDLE) return;
   FileSeek(h,0,SEEK_END);
   FileWrite(h,(string)posId,sym,(string)dir,
             DoubleToString(entry,8),DoubleToString(slPrice,8),DoubleToString(tpPrice,8),
             DoubleToString(slPips,2),(string)(long)openT,(string)(long)closeT,
             DoubleToString(pnl,2),(string)(long)beT);
   FileClose(h);
  }

// Replay one trade. Returns false if the window has not resolved yet (bars still
// to come) - the caller leaves it queued and tries again later.
//
// BOTH questions are answered for EVERY trade - win, loss and breakeven alike. They
// are not a win/loss split, they are two independent counterfactuals:
//
//   POTENTIAL  entry -> until the stop you actually left it on is touched.
//              The peak in your favour along the way = what was on the table.
//              A winner left some behind. A BREAKEVEN left ALL of it behind - which is
//              exactly the number you cannot see today. Even a loser may have run your
//              way first.
//
//   REQUIRED   entry -> until your TP is touched.
//              The deepest point against you along the way = the stop that would have
//              survived the trade. For a loser: would a wider stop have SAVED it. For a
//              breakeven: would leaving the stop alone have got you paid. For a winner:
//              how close you came to being stopped out anyway.
//
// Splitting on pnl>0 would have been wrong twice over: a breakeven would fall into the
// loser branch, and a breakeven closed with commission (pnl = -6.57) would be counted as
// an outright loss on the strength of its fees.
bool PM_Replay(string sym,int dir,double entry,double slPrice,double tpPrice,
               double slPips,datetime openT,datetime closeT,double pnl,datetime beT,
               double &potPips,double &potR,double &reqSlPips,int &wouldWin,
               double &beSlackPips,double &beClearPips,double &beClearR)
  {
   potPips=0; potR=0; reqSlPips=0; wouldWin=0; beSlackPips=0;
   // -9999 = "not applicable" (no TP, or the stop never moved to BE). The pusher omits the
   // fields entirely in that case, so the column stays NULL rather than claiming zero
   // clearance on a trade the question does not apply to.
   beClearPips=-9999; beClearR=-9999;

   double pip=SymbolPipFor(sym);
   if(pip<=0) return false;

   datetime eod=PM_EndOfDay(closeT);
   datetime upto=(TimeCurrent()<eod)?TimeCurrent():eod;

   MqlRates r[];
   int n=CopyRates(sym,PERIOD_M1,openT,upto,r);
   if(n<=0) return (TimeCurrent()>=eod);        // no bars at all: give up once the day is done

   double bestFav=0, worstAdv=0, beAdv=0;
   // beAdv above is clamped at 0, so it only ever records price CROSSING entry - which is
   // why it reads zero on every winner. beAdvSigned is the same measurement with the clamp
   // removed: it keeps the largest advP even when every one is negative, i.e. when price
   // stayed on the profit side throughout. Negated, that is the CLOSEST price came to entry
   // after the BE move - the room a wider BE offset would have eaten into.
   // Kept as a separate accumulator on purpose: be_slack_pips keeps its exact meaning.
   double beAdvSigned=-1e9;

   // THE POTENTIAL WINDOW CLOSES AT YOUR BREAKEVEN STOP - where it ACTUALLY sat, which is
   // not always the entry price. The EA offsets the BE stop (g_beOffset), so it can sit a
   // pip or two beyond entry. Closing the window at entry would keep counting the peak on a
   // trade you had already been stopped out of - crediting you with a run you never held.
   //
   //   BE   -> the stop that took you out. How far it ran before turning back and hitting it.
   //   WIN  -> TP filled, so the stop was never touched. The counterfactual: had you held,
   //           where would it have stopped you? At the same BE stop you had set.
   //
   // Falls back to entry when no stop was ever moved up (nothing better to assume).
   double bePrice=entry;
   if(slPrice>0)
     {
      bool atOrBeyondBE=(dir>0) ? (slPrice>=entry) : (slPrice<=entry);
      if(atOrBeyondBE) bePrice=slPrice;          // the real BE stop, offset included
     }
   bool favOpen=true;
   bool   advOpen=(tpPrice>0);                  // no TP set        -> nothing to test against
   bool   beOpen =(tpPrice>0 && beT>0);         // stop never went to BE -> question does not arise

   for(int i=0;i<n;i++)
     {
      // This bar's extremes, in pips from entry.
      double favP,advP;
      if(dir>0)                                  // long
        { favP=(r[i].high-entry)/pip;  advP=(entry-r[i].low )/pip; }
      else                                       // short
        { favP=(entry-r[i].low )/pip;  advP=(r[i].high-entry)/pip; }

      // --- what was on the table -------------------------------------------
      if(favOpen)
        {
         // ADVERSE FIRST. A bar holds a high and a low but not their order, so when one
         // minute contains both the return to entry and a new peak, we count the return.
         // A peak we might not have lived to see is not credited to you.
         //
         // The first bar is exempt: price is AT entry when the trade opens, so testing it
         // would close the window instantly on every single trade.
         // The first bar is exempt: price sits AT entry when the trade opens, so testing it
         // would slam the window shut on every trade before it had moved anywhere.
         //
         // ...and only from the moment the stop ACTUALLY moved to breakeven. Before beT
         // that stop did not exist yet - the original stop was protecting the trade, and
         // it survived, or there would have been no BE move to record. Testing the BE
         // price from bar one closed the window on any early wobble back through entry
         // and recorded a potential of zero on trades that went on to run for several R.
         // Mirrors the beT gate used by the BE-slack measurement below.
         bool beLive = (beT<=0) || (r[i].time>=beT);
         bool beHit = (i>0) && beLive && ((dir>0) ? (r[i].low<=bePrice) : (r[i].high>=bePrice));
         if(beHit) favOpen=false;
         else if(favP>bestFav) bestFav=favP;
        }

      // --- the stop that would have survived (the ORIGINAL stop) ------------
      if(advOpen)
        {
         // Same rule, same direction of caution: the trough counts before the TP does.
         if(advP>worstAdv) worstAdv=advP;
         bool tpHit=(dir>0) ? (r[i].high>=tpPrice) : (r[i].low<=tpPrice);
         if(tpHit){ wouldWin=1; advOpen=false; }
        }

      // --- the room the BE STOP needed (a different question) ---------------
      // Counted only from the moment the stop actually moved to breakeven. Anything before
      // that belongs to the original stop, which survived it - blaming the BE stop for it
      // would be measuring a stop that was not yet there.
      if(beOpen && r[i].time>=beT)
        {
         if(advP>beAdv) beAdv=advP;
         if(advP>beAdvSigned) beAdvSigned=advP;   // unclamped: survives an all-negative run
         bool tpHit=(dir>0) ? (r[i].high>=tpPrice) : (r[i].low<=tpPrice);
         if(tpHit) beOpen=false;
        }

      if(!favOpen && !advOpen && !beOpen) break;  // every question answered
     }

   // Still open and the day is not over: more bars are coming. Come back later.
   if((favOpen || advOpen || beOpen) && TimeCurrent()<eod) return false;

   if(slPrice>0)
     {
      potPips=bestFav;
      potR   =(slPips>0)? bestFav/slPips : 0.0;
     }
   if(tpPrice>0)
     {
      reqSlPips=worstAdv;                        // the ORIGINAL stop that would have survived it
      if(beT>0) beSlackPips=beAdv;               // the room the BE stop needed, from the move onwards
      // How much CLEARANCE the BE stop had: the closest price came to entry after the move,
      // measured on the profit side. Positive = never reached entry, and this many pips is
      // the largest BE offset that would still have survived. Negative = price crossed entry
      // (only possible when the stop itself sat beyond it). A trade whose window held no bars
      // leaves beAdvSigned at its sentinel and stays "not applicable".
      if(beT>0 && beAdvSigned>-1e8)
        {
         beClearPips=-beAdvSigned;
         beClearR   =(slPips>0)? beClearPips/slPips : 0.0;
        }
     }

   return true;
  }


//----------------------------------------------------------------------------
//  BE-TIMING SIMULATION
//
//  "Should I move to breakeven at 2R instead of 1R?" cannot be answered from a summary
//  number. The answer depends on the PATH: whether price reached the trigger at all, what
//  it did afterwards, and which stop was in force when it turned.
//
//  So we replay the trade once per candidate rule and record what it would have been WORTH.
//  Each rule is: leave the original stop in place until price reaches T x R in your favour,
//  then move the stop to breakeven (with your own offset). The ladder:
//
//     index 0 = never move to BE at all   (a real strategy, and a real candidate)
//     index 1..6 = move at 0.5R, 1R, 1.5R, 2R, 2.5R, 3R
//
//  The result for each is an R multiple:
//     -1     stopped at the original stop
//      0     scratched at the breakeven stop
//     +tpR   reached your take-profit
//     mark   still open at the end of the day: valued at the closing price
//
//  This runs over EVERY trade, not just the breakevens. A loser that ran +0.6R before it
//  turned would have SCRATCHED under a 0.5R rule. A winner that dipped after 1R would have
//  been stopped FLAT under a 1R rule. Changing the rule changes every trade, so every trade
//  has to be replayed - which is exactly why a summary statistic could never answer this.
//----------------------------------------------------------------------------
#define PM_BE_LEVELS 7
double PM_BE_LADDER[PM_BE_LEVELS] = {-1.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0};   // -1 = never

// Replay one trade under one BE rule. Returns the R it would have been worth.
double PM_SimOneBE(MqlRates &r[],int n,int dir,double entry,double slPrice,double tpPrice,
                   double slDist,double beOffsetPx,double trigR)
  {
   if(slDist<=0) return 0.0;

   double stop   = slPrice;      // the original stop, until the rule moves it
   bool   moved  = (trigR<0);    // "never" = the rule never fires
   if(trigR<0) moved=true;       // treat as already-decided: the stop simply never moves
   bool   atBE   = false;

   for(int i=0;i<n;i++)
     {
      double favP,advP;
      if(dir>0){ favP=r[i].high-entry;  advP=entry-r[i].low;  }
      else     { favP=entry-r[i].low;   advP=r[i].high-entry; }

      // ADVERSE FIRST, as everywhere else: within one bar we cannot know the order, so we
      // resolve the stop before we grant the trigger or the target. The simulation will
      // never flatter a rule.
      bool stopHit=(dir>0) ? (r[i].low<=stop) : (r[i].high>=stop);
      if(stopHit) return atBE ? 0.0 : -1.0;

      bool tpHit=(tpPrice>0) && ((dir>0) ? (r[i].high>=tpPrice) : (r[i].low<=tpPrice));
      if(tpHit) return (tpPrice>0) ? MathAbs(tpPrice-entry)/slDist : 0.0;

      // Did this bar reach the trigger? If so the stop moves to BE from the NEXT bar - we
      // do not let it protect the very bar in which it was armed.
      if(!atBE && trigR>0 && (favP/slDist)>=trigR)
        {
         stop = entry + dir*beOffsetPx;
         atBE = true;
        }
     }

   // Still open at the end of the day: value it at the last close. You were in it; this is
   // what it was worth.
   double last=r[n-1].close;
   return (dir>0) ? (last-entry)/slDist : (entry-last)/slDist;
  }

// Every rule, for one trade. Returns a JSON array for the app.
string PM_SimBE(string sym,int dir,double entry,double slPrice,double tpPrice,double slPips,
                datetime openT,datetime closeT)
  {
   double pip=SymbolPipFor(sym);
   if(pip<=0 || slPips<=0) return "";

   datetime eod=PM_EndOfDay(closeT);
   datetime upto=(TimeCurrent()<eod)?TimeCurrent():eod;

   MqlRates r[];
   int n=CopyRates(sym,PERIOD_M1,openT,upto,r);
   if(n<=0) return "";

   double slDist   = slPips*pip;
   // Your own BE offset, not an assumed zero - and read in the SAME unit the live stop
   // uses, or the simulation would grade a rule you do not trade.
   double beOffPx  = (g_beOffMode==BEOFF_BY_RR) ? g_beOffset*slDist : g_beOffset*pip;

   string out="[";
   for(int k=0;k<PM_BE_LEVELS;k++)
     {
      double rr=PM_SimOneBE(r,n,dir,entry,slPrice,tpPrice,slDist,beOffPx,PM_BE_LADDER[k]);
      out+=DoubleToString(rr,2);
      if(k<PM_BE_LEVELS-1) out+=",";
     }
   out+="]";
   return out;
  }

//----------------------------------------------------------------------------
//  BE-OFFSET SIMULATION
//
//  A different question from the ladder above. That one varies WHEN the stop moves and
//  always moves it to breakeven. This one keeps the move exactly where it really happened
//  - your own discretionary beT, when price took the previous high or low - and varies
//  WHERE the stop goes: entry, or some distance the far side of it.
//
//  Moving to entry means a retest scratches you and you still pay the costs. Moving to
//  +0.5R banks a small win instead. The cost of that is the trades it takes you out of
//  that would have gone on to pay. This measures exactly that cost.
//
//  Two rules make the answer honest, both from the trader:
//
//  1. SPREAD. A stop is filled by the broker, not by the mid. A long exits on the BID, so
//     the bar low is already the right number. A SHORT exits on the ASK, which sits a
//     spread above the plotted bid - so a short's stop can be taken by a bar whose high
//     never reached it. MqlRates carries the real spread for that minute, so we use it
//     rather than assuming. Miss the stop by 0.2 with 0.3 of spread and you were filled.
//
//  2. THE TP MUST BE REACHABLE. Being stopped at +0.5R only COSTS you if the trade would
//     really have paid. If price would have run past your ORIGINAL stop before reaching
//     the target, you were never going to hold it that far - you would have been stopped
//     for a full loss instead. Those cases are not counted. Within a bar the original stop
//     is tested before the target, so an ambiguous minute counts against the finding.
//
//  Per offset the replay returns the R it would have been worth, and a flag: 1 = this
//  offset stopped the trade and the target was then validly reached. Summed over winners,
//  that flag count IS the answer to "how many would this have cost me".
//----------------------------------------------------------------------------
#define PM_OFF_LEVELS 6
double PM_OFF_LADDER[PM_OFF_LEVELS]={0.0,0.25,0.5,0.75,1.0,1.5};   // R past entry

// Replay one trade under one BE-offset. Returns R; sets missed=1 when this offset
// stopped the trade and the TP was then validly reached.
double PM_SimOneOffset(MqlRates &r[],int n,int dir,double entry,double origSl,double tpPrice,
                       double slDist,double pt,datetime beT,double offPx,int &missed)
  {
   missed=0;
   if(slDist<=0) return 0.0;
   double stop=origSl;
   bool   moved=false;

   for(int i=0;i<n;i++)
     {
      double sp=r[i].spread*pt;                       // this minute's real spread, in price
      // Fill side: a long is closed on the bid (bars are bid), a short on the ask.
      double advPx=(dir>0) ? r[i].low : (r[i].high+sp);
      double favPx=(dir>0) ? r[i].high : (r[i].low+sp);

      // The stop moves at the moment it really moved, and only protects from the NEXT bar.
      if(!moved && beT>0 && r[i].time>=beT){ stop=entry+dir*offPx; moved=true; continue; }

      bool stopHit=(dir>0) ? (advPx<=stop) : (advPx>=stop);
      if(stopHit)
        {
         if(!moved) return -1.0;                      // original stop: a full loss
         // Stopped at the offset. Would it have paid? Scan on: the ORIGINAL stop is tested
         // before the target, so a bar holding both counts against the finding.
         for(int j=i;j<n;j++)
           {
            double sp2=r[j].spread*pt;
            double adv2=(dir>0) ? r[j].low : (r[j].high+sp2);
            double fav2=(dir>0) ? r[j].high : (r[j].low+sp2);
            bool origHit=(dir>0) ? (adv2<=origSl) : (adv2>=origSl);
            if(origHit) break;                        // never going to hold it that far
            bool tpLater=(tpPrice>0) && ((dir>0) ? (fav2>=tpPrice) : (fav2<=tpPrice));
            if(tpLater){ missed=1; break; }
           }
         return (dir>0) ? (stop-entry)/slDist : (entry-stop)/slDist;
        }

      bool tpHit=(tpPrice>0) && ((dir>0) ? (favPx>=tpPrice) : (favPx<=tpPrice));
      if(tpHit) return MathAbs(tpPrice-entry)/slDist;
     }

   double last=r[n-1].close;
   return (dir>0) ? (last-entry)/slDist : (entry-last)/slDist;
  }

// Every offset, for one trade. Two JSON arrays: the R values, and the missed-TP flags.
void PM_SimOffsets(string sym,int dir,double entry,double origSl,double tpPrice,double slPips,
                   datetime openT,datetime closeT,datetime beT,string &outR,string &outMissed)
  {
   outR=""; outMissed="";
   double pip=SymbolPipFor(sym);
   double pt =SymbolInfoDouble(sym,SYMBOL_POINT);
   if(pip<=0 || pt<=0 || slPips<=0 || beT<=0 || tpPrice<=0) return;   // question does not arise

   datetime eod=PM_EndOfDay(closeT);
   datetime upto=(TimeCurrent()<eod)?TimeCurrent():eod;
   MqlRates r[];
   int n=CopyRates(sym,PERIOD_M1,openT,upto,r);
   if(n<=0) return;

   double slDist=slPips*pip;
   string a="[", b="[";
   for(int k=0;k<PM_OFF_LEVELS;k++)
     {
      int miss=0;
      double rr=PM_SimOneOffset(r,n,dir,entry,origSl,tpPrice,slDist,pt,beT,
                                PM_OFF_LADDER[k]*slDist,miss);
      a+=DoubleToString(rr,2); b+=IntegerToString(miss);
      if(k<PM_OFF_LEVELS-1){ a+=","; b+=","; }
     }
   outR=a+"]"; outMissed=b+"]";
  }

// Push the replay result for a trade already sent at close. The endpoint upserts
// on ticket, so this UPDATES that row rather than adding a second one.
bool PM_Push(ulong posId,double potPips,double potR,double reqSlPips,int wouldWin,
             double beSlackPips,double beClearPips,double beClearR,string beSim,
             string beOffR,string beOffMissed)
  {
   // Every trade carries both answers. The APP decides which to show, from its own
   // Win/Lose/BE result - a decision the EA cannot make honestly, because a breakeven
   // closed with commission looks like a loss from the P&L alone.
   string json=StringFormat(
      "{\"token\":\"%s\",\"ticket\":%I64u,\"pot_pips\":%s,\"pot_r\":%s,"
      "\"req_sl_pips\":%s,\"be_slack_pips\":%s,\"would_have_won\":%s",
      g_syncTokenEff,posId,
      DoubleToString(potPips,1),DoubleToString(potR,2),
      DoubleToString(reqSlPips,1),DoubleToString(beSlackPips,1),
      (wouldWin?"true":"false"));
   // Omitted entirely when the question does not apply (no TP, or the stop never moved to
   // BE), so the columns stay NULL instead of reading as "zero clearance".
   if(beClearPips>-9000)
      json+=StringFormat(",\"be_clear_pips\":%s,\"be_clear_r\":%s",
                         DoubleToString(beClearPips,1),DoubleToString(beClearR,2));
   if(StringLen(beSim)>0) json+=",\"be_sim\":"+beSim;   // what each BE rule would have been worth
   // What each BE OFFSET would have been worth, and which of them cost a real target.
   if(StringLen(beOffR)>0)      json+=",\"be_off_r\":"+beOffR;
   if(StringLen(beOffMissed)>0) json+=",\"be_off_missed\":"+beOffMissed;
   json+="}";
   return SyncPost(json);
  }

// Work the queue. Anything still unresolved stays in the file for next time.
void PM_Sweep()
  {
   if(StringLen(g_syncTokenEff)==0) return;
   if(!FileIsExist(PM_FILE)) return;

   int h=FileOpen(PM_FILE,FILE_READ|FILE_CSV|FILE_ANSI|FILE_SHARE_READ|FILE_SHARE_WRITE,',');
   if(h==INVALID_HANDLE) return;

   string keep[];     // rows that have not resolved yet
   int kept=0;
   ArrayResize(keep,0);

   while(!FileIsEnding(h))
     {
      string sPos =FileReadString(h); if(StringLen(sPos)==0) break;
      string sSym =FileReadString(h);
      string sDir =FileReadString(h);
      string sEnt =FileReadString(h);
      string sSl  =FileReadString(h);
      string sTp  =FileReadString(h);
      string sSlp =FileReadString(h);
      string sOpen=FileReadString(h);
      string sClose=FileReadString(h);
      string sPnl =FileReadString(h);
      string sBet =FileReadString(h);

      ulong    posId=(ulong)StringToInteger(sPos);
      int      dir  =(int)StringToInteger(sDir);
      double   entry=StringToDouble(sEnt);
      double   slPr =StringToDouble(sSl);
      double   tpPr =StringToDouble(sTp);
      double   slPip=StringToDouble(sSlp);
      datetime openT =(datetime)StringToInteger(sOpen);
      datetime closeT=(datetime)StringToInteger(sClose);
      double   pnl  =StringToDouble(sPnl);
      datetime beT  =(datetime)StringToInteger(sBet);

      string rowCsv=sPos+","+sSym+","+sDir+","+sEnt+","+sSl+","+sTp+","+sSlp+","
                   +sOpen+","+sClose+","+sPnl+","+sBet;

      double potPips,potR,reqSl,beSlack,beClearP,beClearR2; int wWin;
      if(PM_Replay(sSym,dir,entry,slPr,tpPr,slPip,openT,closeT,pnl,beT,
                   potPips,potR,reqSl,wWin,beSlack,beClearP,beClearR2))
        {
         // The ORIGINAL stop, not the one we ended up on - the BE rule is the thing being
         // varied, so the simulation must start from the stop you actually set at entry.
         double origSl = entry - dir*slPip*SymbolPipFor(sSym);
         string beSim  = PM_SimBE(sSym,dir,entry,origSl,tpPr,slPip,openT,closeT);
         string beOffR="",beOffMiss="";
         PM_SimOffsets(sSym,dir,entry,origSl,tpPr,slPip,openT,closeT,beT,beOffR,beOffMiss);
         if(!PM_Push(posId,potPips,potR,reqSl,wWin,beSlack,beClearP,beClearR2,beSim,beOffR,beOffMiss))
           {
            // The push failed (offline?). Keep it and try again next sweep.
            ArrayResize(keep,kept+1); keep[kept]=rowCsv; kept++;
           }
        }
      else
        {
         ArrayResize(keep,kept+1); keep[kept]=rowCsv; kept++;
        }
     }
   FileClose(h);

   // Rewrite the file with only what is still outstanding.
   FileDelete(PM_FILE);
   if(kept>0)
     {
      int w=FileOpen(PM_FILE,FILE_WRITE|FILE_TXT|FILE_ANSI,',');
      if(w!=INVALID_HANDLE)
        {
         for(int i=0;i<kept;i++) FileWrite(w,keep[i]);
         FileClose(w);
        }
     }
  }


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
long            CE_BACK[6]   = {10*86400, 10*86400, 20*86400, 90*86400, 365*86400, 1460*86400}; // secs before entry
long            CE_FWD[6]    = { 6*3600,     86400,    86400,  3*86400,   7*86400,     14*86400}; // secs after exit
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
   long off=BrokerOff();   // server -> UTC, QUANTIZED (stable across runs, so a bar can't be stored at t and t+1)
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

// Backfill: queue candle export for every closed position in the last InpSyncDays,
// even ones already synced before this feature existed. CE_Queue de-dupes, so it is
// safe to call; CE_Sweep then works through them one per M1 bar.
void CE_Catchup()
  {
   if(StringLen(g_syncTokenEff)==0) return;
   datetime from=(datetime)((long)TimeGMT()+BrokerOff()-(long)InpSyncDays*86400);
   datetime to  =(datetime)((long)TimeGMT()+BrokerOff()+3600);
   if(!HistorySelect(from,to)) return;

   // Collect unique closed position ids first — HistorySelectByPosition below would
   // otherwise thrash the history selection mid-loop.
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

// Stamp the just-placed trade's detail onto its position id (read back at close).
void SyncStampEntry(ulong posId)
  {
   string sk="MMD_"+(string)posId+"_";
   // Re-measure the stop from the REAL fill to the REAL stop at the moment this entry
   // deal fills. PlaceTrade already does this for MARKET orders (instant fill); doing it
   // here as well covers PENDING (limit/stop) orders, which fill later — by now the
   // position is live with its true open price and stop, so the spread is always included.
   // Falls back to the nominal g_pendSL if the position/stop can't be read.
   double slStamp=g_pendSL;
   for(int _i=PositionsTotal()-1;_i>=0;_i--)
     {
      ulong _tk=PositionGetTicket(_i);
      if(!PositionSelectByTicket(_tk)) continue;
      if((ulong)PositionGetInteger(POSITION_IDENTIFIER)!=posId) continue;
      double _open=PositionGetDouble(POSITION_PRICE_OPEN);
      double _sl  =PositionGetDouble(POSITION_SL);
      double _pip =SymbolPipFor(PositionGetString(POSITION_SYMBOL));
      if(_sl>0 && _pip>0)
        {
         double _real=MathAbs(_open-_sl)/_pip;
         if(_real>0) slStamp=_real;
        }
      break;
     }
   GlobalVariableSet(sk+"sl",   slStamp);
   GlobalVariableSet(sk+"risk", g_pendRisk);
   GlobalVariableSet(sk+"tpr",  g_pendTPr);
   GlobalVariableSet(sk+"tpp",  g_pendTPp);
   GlobalVariableSet(sk+"mfe",  0.0);   // peak grows on each tick while open

   // For the post-mortem replay: the TP PRICE, and the stop price as it stands now.
   // MT5 keeps no history of stop modifications - once the position closes, where you
   // had moved your stop to is gone forever. So we record it live, and keep it current
   // in SyncTrackMFE() below. Without this, "retrace to the stop I'd moved it to" is
   // unanswerable.
   for(int _j=PositionsTotal()-1;_j>=0;_j--)
     {
      ulong _tk=PositionGetTicket(_j);
      if(!PositionSelectByTicket(_tk)) continue;
      if((ulong)PositionGetInteger(POSITION_IDENTIFIER)!=posId) continue;
      GlobalVariableSet(sk+"tpx", PositionGetDouble(POSITION_TP));
      GlobalVariableSet(sk+"lsl", PositionGetDouble(POSITION_SL));   // last known stop
      break;
     }
  }

// Track the furthest price moved in our favour, for every open EA position.
// Only runs while MT5 is running (ticks) - the honest limit we flagged.
void SyncTrackMFE()
  {
   if(StringLen(g_syncTokenEff)==0) return;
   for(int i=PositionsTotal()-1;i>=0;i--)
     {
      ulong tk=PositionGetTicket(i);
      if(!PositionSelectByTicket(tk)) continue;
      if(PositionGetInteger(POSITION_MAGIC)!=InpMagic) continue;
      ulong  posId=(ulong)PositionGetInteger(POSITION_IDENTIFIER);
      string sk="MMD_"+(string)posId+"_mfe";
      if(!GlobalVariableCheck(sk)) continue;        // only trades we stamped at entry
      string sym  =PositionGetString(POSITION_SYMBOL);
      double entry=PositionGetDouble(POSITION_PRICE_OPEN);
      long   type =PositionGetInteger(POSITION_TYPE);
      double pip  =SymbolPipFor(sym);
      double fav  =(type==POSITION_TYPE_BUY) ? SymbolInfoDouble(sym,SYMBOL_BID)-entry
                                             : entry-SymbolInfoDouble(sym,SYMBOL_ASK);
      double favPips=(pip>0)? fav/pip : 0.0;
      if(favPips<0) favPips=0.0;
      double cur=GlobalVariableGet(sk);
      if(favPips>cur) GlobalVariableSet(sk,favPips);

      // ...and keep the stop level current. This is the one thing the post-mortem
      // cannot reconstruct afterwards: MT5 discards it when the position closes.
      string lk="MMD_"+(string)posId+"_lsl";
      double liveSL=PositionGetDouble(POSITION_SL);
      if(liveSL>0) GlobalVariableSet(lk,liveSL);

      // The moment the stop first reaches breakeven or better. Two questions hide inside a
      // stopped-out trade and they are NOT the same one:
      //
      //   "was my stop too tight?"        -> measured from ENTRY. About the original stop.
      //   "did I move to BE too early?"   -> measured from HERE. About the BE stop.
      //
      // Measuring the second from entry would blame the BE stop for a dip it was never
      // exposed to - the original stop had already survived that. So we mark the moment the
      // stop moved up, and the replay only counts what happened afterwards.
      string bk="MMD_"+(string)posId+"_bet";
      if(!GlobalVariableCheck(bk) && liveSL>0)
        {
         bool atBE=(type==POSITION_TYPE_BUY) ? (liveSL>=entry) : (liveSL<=entry);
         if(atBE) GlobalVariableSet(bk,(double)(long)TimeCurrent());
        }
     }
  }

//==================================================================
//  STANDARD EVENT HANDLERS
//==================================================================
int OnInit()
  {
   // Build stamp - printed the instant the EA loads, so the Experts log proves which
   // build is actually running on the chart (a recompile does not re-attach the EA).
   Print("=== MinimalistManager v5.1 loaded (post-mortem now records BE-stop CLEARANCE in pips and R, and replays a ladder of BE OFFSETS spread-aware, so \"what if I moved to +0.5R instead of entry\" is answerable from data) ===");
   // ---- Validate inputs ----
   if(InpMinSLpips<=0 || InpMaxSLpips<=0)
     { Print("Minimalist Manager: Min/Max SL must be greater than 0."); return INIT_PARAMETERS_INCORRECT; }
   if(InpRiskMode==RISK_PERCENT && InpRiskPercent<=0)
     { Print("Minimalist Manager: Risk percentage must be greater than 0."); return INIT_PARAMETERS_INCORRECT; }
   if(InpRiskMode==RISK_AMOUNT && InpRiskAmount<=0)
     { Print("Minimalist Manager: Risk amount must be greater than 0."); return INIT_PARAMETERS_INCORRECT; }
   if(InpRiskMode==RISK_FIXED_LOT && InpFixedLot<=0)
     { Print("Minimalist Manager: Fixed lot must be greater than 0."); return INIT_PARAMETERS_INCORRECT; }
   if(InpTP_On && InpTP_Val<=0)
     { Print("Minimalist Manager: Take-profit target must be greater than 0."); return INIT_PARAMETERS_INCORRECT; }

   g_orderKind=InpOrderKind;
   g_riskMode =InpRiskMode;
   g_riskPercent=InpRiskPercent; g_riskAmount=InpRiskAmount; g_fixedLot=InpFixedLot;
   g_minSL=InpMinSLpips; g_maxSL=InpMaxSLpips; g_beOffset=InpBE_Offset; g_beRR=InpBE_RR; g_useBE=InpUseBE;
   if(g_minSL>g_maxSL){ double t=g_minSL; g_minSL=g_maxSL; g_maxSL=t;   // auto-correct if reversed
                        Print("Minimalist Manager: Min SL exceeded Max SL - values swapped."); }
   g_tpMode=InpTPMode; g_beOffMode=InpBE_OffMode;
   g_tpOn[0]=InpTP_On; g_tpVal[0]=InpTP_Val; g_tpPct[0]=InpTP_Pct;
   for(int i=1;i<6;i++){ g_tpOn[i]=false; g_tpVal[i]=0; g_tpPct[i]=0; }

   g_scaleLock=InpScaleLock; g_scalePadPips=InpScalePadPips; g_maxTradesDay=InpMaxTradesDay;

   // Scale the whole panel by the display DPI so it renders the same on every screen.
   int _dpi=(int)TerminalInfoInteger(TERMINAL_SCREEN_DPI);
   g_ui=(_dpi>0)?(double)_dpi/96.0:1.0;
   g_ui=1.0+(g_ui-1.0)*0.6;   // soften DPI scaling so the panel doesn't balloon on high-DPI screens
   g_ui*=0.8;                 // compact default panel size on every display
   if(g_ui<0.55) g_ui=0.55;
   if(g_ui>2.2) g_ui=2.2;
   g_panelOpen=InpStartOpen; PX=InpPanelX; PY=InpPanelY;

   // resolve the execution-mode key from the typed character
   string ek=InpExecKeyChar; StringToUpper(ek);
   g_execKeyChar = (StringLen(ek)>0) ? ek : "O";
   g_execKey = (StringLen(ek)>0) ? (int)StringGetCharacter(ek,0) : 79;

   // Restore previously saved settings (overrides the defaults above if found).
   LoadState();

   g_point=SymbolInfoDouble(_Symbol,SYMBOL_POINT);
   g_digits=(int)SymbolInfoInteger(_Symbol,SYMBOL_DIGITS);
   if(g_point<=0)
     { Print("Minimalist Manager: invalid symbol point size."); return INIT_FAILED; }
   g_pip=PipSize();
   if(g_pip<=0) g_pip=g_point;       // final safety net so divisions never hit zero
   g_volStep=SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_STEP);
   g_volMin =SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_MIN);
   g_volMax =SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_MAX);
   g_volDigits=VolumeDigits(g_volStep);

   trade.SetExpertMagicNumber(InpMagic);
   trade.SetDeviationInPoints(InpSlippage);
   trade.SetTypeFillingBySymbol(_Symbol);

   ChartSetInteger(0,CHART_EVENT_MOUSE_MOVE,true);   // needed for hover + click execute
   EventSetTimer(1);                                 // 1s tick for the candle countdown

   // If the terminal was closed over the day boundary, the pause would otherwise sit there
   // until the first tick arrived. Settle it now.
   RefreshDayCount();
   if(g_maxTradesDay>0 && g_pausedByLimit && !g_active && g_tradesToday<g_maxTradesDay)
     { g_active=true; g_pausedByLimit=false; SaveState(); }

   if(MQLInfoInteger(MQL_TESTER))
      Print("Minimalist Manager is a discretionary manual tool and does not trade on its own in the Strategy Tester.");
   if(!TerminalInfoInteger(TERMINAL_TRADE_ALLOWED))
      Print("Minimalist Manager: Algo Trading is disabled - enable it to place trades.");

   // Remember the sync token across re-attaches: if you typed one, save it; if the input is
   // empty (e.g. re-opened from the Navigator, or after a recompile), restore the last saved one.
   g_syncTokenEff = InpSyncToken;
   StringTrimLeft(g_syncTokenEff); StringTrimRight(g_syncTokenEff);
   if(StringLen(g_syncTokenEff)>0) SyncTokenSave(g_syncTokenEff);
   else { g_syncTokenEff=SyncTokenLoad(); if(StringLen(g_syncTokenEff)>0) Print("SessionTool.app: restored saved sync token."); }
   if(StringLen(g_syncTokenEff)>0) PrintFormat("SessionTool.app: active sync token %s (sync is always on while a token is set).",SyncTokenMasked());
   else Print("SessionTool.app: no sync token set - type it in the inputs once and it will be remembered.");

   g_syncCatchupPending = (StringLen(g_syncTokenEff)>0);

   BuildPanel();
   if(g_scaleLock) ApplyScaleLock();   // frame the chart on load if locking is on
   // Work any post-mortems left over from a previous run. This is why the replay reads
   // BARS and not ticks: a trade that closed while the terminal was off still resolves
   // the next time the EA starts, using history that was there all along.
   PM_Sweep();
   CE_CatchupOnce();   // Trade Replay: one-time backfill of recent already-synced trades
   CE_Sweep();         // Trade Replay: resume/queue candle exports

   return INIT_SUCCEEDED;
  }

void OnDeinit(const int reason)
  {
   SaveState();                      // remember all settings for next launch
   EventKillTimer();
   ChartSetInteger(0,CHART_EVENT_MOUSE_MOVE,false);
   DeleteByPrefix(PFX);
   Comment("");
   ChartRedraw();
  }

// Bottom-right readout: time to next candle close + current spread.
void DrawInfoReadout()
  {
   string nCD=PFX+"CD", nSP=PFX+"SP";

   // ---- candle countdown ----
   int    secs=PeriodSeconds((ENUM_TIMEFRAMES)_Period);
   long   left=(long)(iTime(_Symbol,(ENUM_TIMEFRAMES)_Period,0)+secs-TimeCurrent());
   if(left<0) left=0;
   string cd;
   if(secs>=3600) cd=StringFormat("%02d:%02d:%02d",(int)(left/3600),(int)((left%3600)/60),(int)(left%60));
   else           cd=StringFormat("%02d:%02d",(int)(left/60),(int)(left%60));

   // ---- spread (in pips) ----
   double ask=SymbolInfoDouble(_Symbol,SYMBOL_ASK);
   double bid=SymbolInfoDouble(_Symbol,SYMBOL_BID);
   double spr=(g_pip>0)?(ask-bid)/g_pip:0;

   ObjectDelete(0,nSP);   // single-line layout: second label no longer used
   mkLabelBR(nCD,12,12,StringFormat("Candle %s | Spread %.1f",cd,spr),clrBlack,9);
  }

// Runs every few seconds from OnTimer, and once from OnInit.
//
// THE OLD BUG: this was throttled on TimeCurrent(), which is the time of the last tick. When
// the market is closed TimeCurrent() stands still, so the difference never reached 5 and the
// check simply did not run - and even when it did, the day boundary it compared against had
// been computed from that same frozen clock, so Friday's trades were still counted as "today".
// The cap therefore stayed "reached" all weekend and the EA never woke up.
//
// Now: TimeGMT() drives the throttle (it advances with or without ticks), the day boundary is
// computed from a trusted broker offset, and a CHANGE OF DAY on its own is enough to lift the
// pause - it no longer has to also satisfy a trade count derived from a stale clock.
void DailyLimitTick()
  {
   if(g_maxTradesDay<=0) return;

   static datetime _dlChk = 0;
   if((long)TimeGMT() - (long)_dlChk < 5) return;
   _dlChk = TimeGMT();

   static int _dayIdx = -1;
   int  today  = UserDayIndex();
   bool newDay = (_dayIdx != -1 && today != _dayIdx);
   _dayIdx = today;

   RefreshDayCount();          // recounts against the new day: normally back to zero

   // A new day has begun -> the cap resets, whatever happened yesterday.
   if(newDay && g_pausedByLimit)
     {
      g_pausedByLimit = false;
      if(g_tradesToday < g_maxTradesDay) g_active = true;
      UpdateManageLine(); BuildPanel(); SaveState();
      return;
     }

   // Cap reached today -> shut down for the rest of the day.
   if(g_tradesToday >= g_maxTradesDay && g_active)
     {
      g_active = false; g_execMode = false; g_pausedByLimit = true;
      ClearEntryLines(); UpdateManageLine(); BuildPanel(); SaveState();
      return;
     }

   // Paused, but the count says we are under the cap (e.g. a deal was removed) -> resume.
   if(g_pausedByLimit && !g_active && g_tradesToday < g_maxTradesDay)
     {
      g_active = true; g_pausedByLimit = false;
      UpdateManageLine(); BuildPanel(); SaveState();
     }
  }

void OnTimer()
  {
   DrawInfoReadout();
   DailyLimitTick();   // auto-off at the cap, and auto-on again on the new day
   bool _connNow=(bool)TerminalInfoInteger(TERMINAL_CONNECTED);
   if(g_syncCatchupPending){ g_syncCatchupPending=false; SyncCatchUp(); g_syncCatchAt=TimeCurrent(); }
   else if(_connNow && !g_wasConnected){ SyncCatchUp(); g_syncCatchAt=TimeCurrent(); }        // v4.5: broker reconnect / wake-from-sleep -> scan immediately
   else if(TimeCurrent()-g_syncCatchAt>=180){ g_syncCatchAt=TimeCurrent(); SyncCatchUp(); }    // v4.5: ...and every 3 min as a backstop
   g_wasConnected=_connNow;
   SyncFlush(3);
   if(TimeCurrent()-g_liveReAt>=20){ g_liveReAt=TimeCurrent(); LiveReannounceOpen(); }   // v4.3: keep open trades on the live feed
   LiveFlush(3);
   ChartRedraw();
  }

// Snap a freshly-filled position's SL/TP to the EXACT requested pip distances, measured
// from the broker's real open price. The order goes out with SL/TP worked out from the
// click-time quote; a market order fills a moment later on the opposite side of the spread,
// so from the fill the stop is one spread too wide and the target one spread too near
// (the 4.2 / 19.8 seen on a 4 / 20 request). This corrects both to the exact distance.
void AnchorFillSLTP(ulong posId)
  {
   if(g_reqSLpips<=0 || g_pip<=0) return;
   if(!PositionSelectByTicket(posId)) return;
   double realOpen=PositionGetDouble(POSITION_PRICE_OPEN);
   double curSL   =PositionGetDouble(POSITION_SL);
   double curTP   =PositionGetDouble(POSITION_TP);
   if(realOpen<=0) return;
   double wantSL=NormalizeDouble(realOpen-g_reqDir*g_reqSLpips*g_pip,g_digits);
   double wantTP=(g_reqTPpips>0)?NormalizeDouble(realOpen+g_reqDir*g_reqTPpips*g_pip,g_digits):curTP;
   double tol=g_pip*0.05;
   bool needSL=(MathAbs(wantSL-curSL)>tol);
   bool needTP=(g_reqTPpips>0 && MathAbs(wantTP-curTP)>tol);
   if(!needSL && !needTP)
     {
      Print("MTM re-anchor (on fill): open=",DoubleToString(realOpen,g_digits),
            " already exact - SL=",DoubleToString(curSL,g_digits)," TP=",DoubleToString(curTP,g_digits),", no change.");
      return;
     }
   double stopLvl=(double)SymbolInfoInteger(_Symbol,SYMBOL_TRADE_STOPS_LEVEL)*g_point;
   double cmp=(g_reqDir>0)?SymbolInfoDouble(_Symbol,SYMBOL_BID):SymbolInfoDouble(_Symbol,SYMBOL_ASK);
   bool okSL=(stopLvl<=0)||(MathAbs(cmp-wantSL)>=stopLvl);
   bool okTP=(g_reqTPpips<=0)||(stopLvl<=0)||(MathAbs(cmp-wantTP)>=stopLvl);
   if(okSL && okTP)
     {
      bool okMod=trade.PositionModify(posId,wantSL,wantTP);
      Print("MTM re-anchor (on fill): open=",DoubleToString(realOpen,g_digits),
            "  SL ",DoubleToString(curSL,g_digits),"->",DoubleToString(wantSL,g_digits),
            " (",DoubleToString(g_reqSLpips,1)," pips)  TP ",DoubleToString(curTP,g_digits),"->",DoubleToString(wantTP,g_digits),
            " (",DoubleToString(g_reqTPpips,1)," pips)  modify=",(okMod?"OK":"FAILED")," ret=",(int)trade.ResultRetcode());
      // v4.4: snap the EA's on-chart SL/TP lines onto the re-anchored broker prices. The manage
      // SL line is only positioned when first created (so a drag isn't fought every tick), so the
      // fill/anchor race could leave the visual line a hair off the real stop. This one-time snap
      // lands the EA's SL/TP line exactly on the broker's line the moment the trade fills.
      if(okMod)
        {
         if(ObjectFind(0,LN_MSL)>=0){ ObjectSetDouble(0,LN_MSL,OBJPROP_PRICE,wantSL); SetLineText(TX_SL,wantSL,"SL",COL_LINE_SL); }
         if(g_reqTPpips>0){ string _tp0=LN_TP+"0"; if(ObjectFind(0,_tp0)>=0){ ObjectSetDouble(0,_tp0,OBJPROP_PRICE,wantTP); SetLineText(TX_TP,wantTP,"TP",COL_LINE_TP); } }
         ChartRedraw();
        }
     }
   else
      Print("MTM re-anchor (on fill) BLOCKED by broker min stop distance (",DoubleToString(stopLvl/g_pip,1),
            " pips): wanted SL=",DoubleToString(wantSL,g_digits)," TP=",DoubleToString(wantTP,g_digits),
            " - the broker will not allow a stop this tight.");
  }

void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest &request,
                        const MqlTradeResult &result)
  {
   if(g_maxTradesDay>0 && trans.type==TRADE_TRANSACTION_DEAL_ADD){ ulong _dk=trans.deal; if(_dk!=0 && HistoryDealSelect(_dk) && (long)HistoryDealGetInteger(_dk,DEAL_ENTRY)==DEAL_ENTRY_IN){ RefreshDayCount(); if(g_tradesToday>=g_maxTradesDay && g_active){ g_active=false; g_execMode=false; g_pausedByLimit=true; ClearEntryLines(); UpdateManageLine(); BuildPanel(); SaveState(); } } }
   // On-fill SL/TP re-anchor: snap the just-filled position's stop/target to the exact
   // requested pip distances from the REAL open price. Must run BEFORE the sync-token
   // early-return below, so it works whether or not Session Tool sync is configured.
   if(trans.type==TRADE_TRANSACTION_DEAL_ADD && g_anchorPending)
     {
      ulong _adk=trans.deal;
      if(_adk!=0 && HistoryDealSelect(_adk)
         && HistoryDealGetInteger(_adk,DEAL_ENTRY)==DEAL_ENTRY_IN
         && HistoryDealGetInteger(_adk,DEAL_MAGIC)==InpMagic)
        {
         AnchorFillSLTP((ulong)HistoryDealGetInteger(_adk,DEAL_POSITION_ID));
         g_anchorPending=false;
        }
     }
   if(StringLen(g_syncTokenEff)==0) return;
   if(trans.type!=TRADE_TRANSACTION_DEAL_ADD) return;
   ulong dealTicket=trans.deal;
   if(dealTicket==0 || !HistoryDealSelect(dealTicket)) return;
   long  de   =HistoryDealGetInteger(dealTicket,DEAL_ENTRY);
   long  mg   =HistoryDealGetInteger(dealTicket,DEAL_MAGIC);
   ulong posId=(ulong)HistoryDealGetInteger(dealTicket,DEAL_POSITION_ID);

   // Live status: any entry -> "open" event (long/short). Fires for every trade so the
   // live session counter reflects everything you open, EA or manual.
   if(de==DEAL_ENTRY_IN)
     {
      long   dtype=HistoryDealGetInteger(dealTicket,DEAL_TYPE);
      string dir  =(dtype==DEAL_TYPE_BUY)?"long":"short";
      string sym  =HistoryDealGetString(dealTicket,DEAL_SYMBOL);
      LiveEnqueue(StringFormat("{\"event\":\"open\",\"token\":\"%s\",\"ticket\":%I64u,\"symbol\":\"%s\",\"direction\":\"%s\"}",
                               g_syncTokenEff,posId,sym,dir));
     }

   // ENTRY of one of our trades: stamp the detail PlaceTrade just computed.
   if(de==DEAL_ENTRY_IN && mg==InpMagic && g_pendValid)
     {
      SyncStampEntry(posId);   // (SL/TP re-anchor already handled above, token-independent)
      g_pendValid=false;
      return;
     }

   // CLOSE (full exit, any source): queue the position for push.
   if(de==DEAL_ENTRY_OUT || de==DEAL_ENTRY_INOUT || de==DEAL_ENTRY_OUT_BY)
     {
      if(PositionSelectByTicket(posId)) return;   // not fully closed yet
      SyncEnqueue(posId);
      double _lpnl=LivePositionPnl(posId);
      LiveEnqueue(StringFormat("{\"event\":\"close\",\"token\":\"%s\",\"ticket\":%I64u,\"pnl\":%s}",
                               g_syncTokenEff,posId,DoubleToString(_lpnl,2)));
     }
  }

void OnTick()
  {
   DrawInfoReadout();                // updates spread + countdown labels (no redraw inside)
   SyncTrackMFE();                   // grow favourable-peak for POT BE R-P (runs even when visuals off)

   // Post-mortem sweep, once per M1 bar. The replay reads BARS, so nothing that happens
   // mid-bar can resolve a trade that was unresolved a moment ago - running it per tick
   // would just re-read the same candles.
   static datetime s_pmBar=0;
   datetime curBar=iTime(_Symbol,PERIOD_M1,0);
   if(curBar!=s_pmBar){ s_pmBar=curBar; PM_Sweep(); CE_Sweep(); }
   UpdateBrokerOffset();   // a tick just arrived, so TimeCurrent() is live right now: learn the offset
   if(!g_active){ if(g_pausedByLimit){ MonitorBE(); UpdateManageLine(); } ChartRedraw(); return; }
   MonitorBE();
   if(g_execMode) RedrawTargets();   // keep market entry / targets fresh
   UpdateManageLine();               // draggable SL / entry / BE for any live position

   // Repaint only when something visibly changed - avoids the per-tick full repaint that
   // makes the SL line/label shimmer while it tracks price at a limit.
   static int    lastSLy = -99999;
   static string lastCD  = "";
   int slY = (ObjectFind(0,LN_SL)>=0) ? PriceToY(LinePrice(LN_SL)) : -88888;
   string cdNow = ObjectGetString(0,PFX+"CD",OBJPROP_TEXT);
   if(slY!=lastSLy || cdNow!=lastCD)
     {
      lastSLy = slY;
      lastCD  = cdNow;
      ChartRedraw();
     }
  }

void OnChartEvent(const int id,const long &lparam,const double &dparam,const string &sparam)
  {
   // ---- Chart panned / zoomed / scrolled: re-pin the line labels ----
   if(id==CHARTEVENT_CHART_CHANGE)
     {
      RefreshLabels();
      // If locking is on and the scale got reset (MT5 event, or you double-clicked the
      // axis to re-centre), re-frame. Skipped while Scale Fix is still on, so manual
      // dragging/zooming is never fought and there is no redraw loop.
      if(g_scaleLock && !(bool)ChartGetInteger(0,CHART_SCALEFIX)) ApplyScaleLock();
      ChartRedraw();
      return;
     }

   // ---- Mouse move: hover SL + left-click execute ----
   if(id==CHARTEVENT_MOUSE_MOVE)
     {
      if(!g_execMode){ g_prevLeftDown=false; return; }
      int x=(int)lparam, y=(int)dparam;

      // Safety: if the cursor leaves the chart area, disarm execution mode
      // (MT5 reports out-of-bounds coordinates when the mouse exits).
      long cw=ChartGetInteger(0,CHART_WIDTH_IN_PIXELS);
      long ch=ChartGetInteger(0,CHART_HEIGHT_IN_PIXELS);
      if(x<0 || y<0 || x>cw || y>ch)
        {
         g_prevLeftDown=false;
         ToggleExecMode();   // turns it off and clears the lines
         return;
        }

      int state=(int)StringToInteger(sparam);
      bool leftDown=((state & 1)!=0);

      if(OverPanel(x,y)){ g_prevLeftDown=leftDown; return; }

      // hover (no button) -> SL follows the cursor, clamped to [min,max] pips
      if(!leftDown)
        {
         double pr=YToPrice(x,y);
         if(pr>0)
           {
            // reference price the SL distance is measured from
            double ask=SymbolInfoDouble(_Symbol,SYMBOL_ASK);
            double bid=SymbolInfoDouble(_Symbol,SYMBOL_BID);
            double mid=(ask+bid)/2.0;
            // Decide which side of price the stop sits. Near price (within the min band) the
            // cursor can jitter across the mid line, which would flip the side and make the
            // SL/label glitch - so only change side when the cursor is clearly past the
            // minimum distance from price; otherwise keep the side we already had.
            int side=g_slSetSide;
            double rawPips=MathAbs(pr-mid)/g_pip;
            if(rawPips>=g_minSL) side=(pr<mid)?-1:+1;
            // measure from the price the order will actually fill at on that side
            double ref=(g_orderKind==OK_MARKET) ? (side>0?bid:ask)
                                                : (LinePrice(LN_ENTRY)>0?LinePrice(LN_ENTRY):mid);
            double distPips=MathAbs(pr-ref)/g_pip;
            if(distPips<g_minSL) distPips=g_minSL;        // never closer than min
            if(distPips>g_maxSL) distPips=g_maxSL;        // never wider than max
            g_slSetPips=distPips; g_slSetSide=side;       // remember choice
            RedrawTargets();                              // single source: positions line + label
            ChartRedraw();
           }
        }

      // rising edge of left button -> execute, unless starting a line drag
      if(leftDown && !g_prevLeftDown)
        {
         if(!OverDraggableLine(x,y)) PlaceTrade();
        }
      g_prevLeftDown=leftDown;
      return;
     }

   // ---- Hotkeys ----
   if(id==CHARTEVENT_KEYDOWN)
     {
      int key=(int)lparam;

      // Capturing a new execution-mode key from the panel?
      if(g_awaitKey)
        {
         if(key==16 || key==17 || key==18) return;   // ignore Shift/Ctrl/Alt alone
         g_execKey=key;
         string kc=CharToString((uchar)key); StringToUpper(kc);
         g_execKeyChar=kc;
         g_awaitKey=false;
         BuildPanel();
         return;
        }

      if(key==g_execKey)          ToggleExecMode();
      else if(key==InpKeyExecute){ if(g_execMode) PlaceTrade(); }
      else if(key==InpKeyCancel)  CancelPending();
      else if(key==InpKeyClose)   CloseAll();
      else if(key==InpKeyRiskOff) RiskOffHalf();
      // Order-type switch HOTKEY DISABLED (was Backspace=8). It collided with erasing digits in the
      // panel number fields, so a stray Backspace silently flipped MARKET->LIMIT. Switch order type
      // with the panel "Order type" button only. (Left commented, not deleted, so it's easy to restore.)
      // else if(key==InpKeySwitch)  SwitchOrderKind();
      return;
     }

   // ---- Panel buttons ----
   if(id==CHARTEVENT_OBJECT_CLICK)
     {
      if(StringFind(sparam,PP)==0)
        {
         HandleClick(sparam);
         if(ObjectFind(0,sparam)>=0) ObjectSetInteger(0,sparam,OBJPROP_STATE,false);
         SaveState();              // persist the change immediately
         ChartRedraw();
        }
      return;
     }

   // ---- Edit fields ----
   if(id==CHARTEVENT_OBJECT_ENDEDIT)
     {
      if(StringFind(sparam,PP)==0){ HandleEndEdit(sparam); if(g_execMode) RedrawTargets(); }
      return;
     }

   // ---- Dragging lines ----
   if(id==CHARTEVENT_OBJECT_DRAG)
     {
      if(sparam==LN_MSL)            // live position SL -> modify the open trade
        {
         ModifyPositionsSL(LinePrice(LN_MSL));
         return;
        }
      if(sparam==LN_BE)             // BE line dragged
        {
         double bp=LinePrice(LN_BE);
         SetLineText(TX_BE,bp,"BE",COL_LINE_BE);
         if(g_beArmed) g_beTrigger=bp;              // live trade: move the trigger
         else if(g_execMode) { RecalcFromDrag(LN_BE); RedrawTargets(); }  // preview: set R
         ChartRedraw();
         return;
        }
      if(sparam==LN_TP+"0")         // TP line dragged
        {
         double tp=LinePrice(LN_TP+"0");
         if(ModifyPositionsTP(tp)) { SetLineText(TX_TP,tp,"TP",COL_LINE_TP); ChartRedraw(); return; } // live trade
         if(g_execMode) { RecalcFromDrag(LN_TP+"0"); RedrawTargets(); ChartRedraw(); }                 // preview
         return;
        }
      if(StringFind(sparam,"MTM_LINE")==0 && g_execMode)   // exec-mode entry
        {
         RecalcFromDrag(sparam);
         RedrawTargets();
         ChartRedraw();
        }
      return;
     }
  }
//+------------------------------------------------------------------+
