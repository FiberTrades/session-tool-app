# ST Method engine: every entry type from the trading plan, on 1-minute candles. Shared by the rule study (st.py)
# and the hawk (live alerts on uk1), so the alerts follow exactly the rules that were tested. Call load() first.
import os, json, sys, bisect, datetime as dt
from collections import defaultdict
HERE = os.path.dirname(os.path.abspath(__file__))
PIP = 0.0001
T, O, H, L, C = [], [], [], [], []
N = 0

# ---------- clocks
def nth_sunday(y, m, n):
    d = dt.date(y, m, 1); d += dt.timedelta(days=(6 - d.weekday()) % 7); return d + dt.timedelta(days=7 * (n - 1))
def last_sunday(y, m):
    d = dt.date(y, m + 1, 1) - dt.timedelta(days=1); return d - dt.timedelta(days=(d.weekday() + 1) % 7)
def ts(d, hour): return int(dt.datetime(d.year, d.month, d.day, hour, tzinfo=dt.timezone.utc).timestamp())
UK = {y: (ts(last_sunday(y, 3), 1), ts(last_sunday(y, 10), 1)) for y in (2025, 2026, 2027)}
def ldn(t):
    y = dt.datetime.fromtimestamp(t, dt.timezone.utc).year; a, b = UK[y]; return t + (3600 if a <= t < b else 0)
LT, LDAY, LMIN, SWH, SWL, HB = [], [], [], [], [], []

def load(t, o, h, l, c, h1=None, m15=None):
    """Set the 1-minute candles (UTC seconds). h1 = [(hour_start_utc, o, h, l, c)], else hour candles are built from the minutes.
    m15 = older 15-minute candles (start_utc, o, h, l, c) for the 15M reading (live: about 7 days from the EA), the minutes after them."""
    global T, O, H, L, C, N, LT, LDAY, LMIN, SWH, SWL, HB
    T, O, H, L, C = list(t), list(o), list(h), list(l), list(c); N = len(T)
    LT = [ldn(x) for x in T]; LDAY = [x // 86400 for x in LT]; LMIN = [(x % 86400) // 60 for x in LT]
    hb = []   # (hour_start_utc, o, h, l, c)
    if h1 is None:
        cur = None
        for i in range(N):
            k = T[i] // 3600 * 3600
            if cur is None or cur[0] != k:
                if cur: hb.append(tuple(cur))
                cur = [k, O[i], H[i], L[i], C[i]]
            else:
                cur[2] = max(cur[2], H[i]); cur[3] = min(cur[3], L[i]); cur[4] = C[i]
        if cur: hb.append(tuple(cur))
    else:
        hb = sorted(h1)
    HB = hb   # the hour candles, for the hawk's chart (hour_start_utc, o, h, l, c)
    # swing points (2 hour candles each side), known once the second candle after them has closed
    SWH, SWL = [], []   # (confirmed_at_utc, price, hour_index)
    for k in range(2, len(hb) - 2):
        conf = hb[k + 2][0] + 3600
        if hb[k][2] > max(hb[k - 1][2], hb[k - 2][2], hb[k + 1][2], hb[k + 2][2]): SWH.append((conf, hb[k][2], k))
        if hb[k][3] < min(hb[k - 1][3], hb[k - 2][3], hb[k + 1][3], hb[k + 2][3]): SWL.append((conf, hb[k][3], k))
    # his reading on 15M (from the minutes), 1H and 4H (the hour candles, 4-hour blocks from New York's 17:00 close, as brokers draw them)
    TFS.clear()
    m1 = [(T[i], O[i], H[i], L[i], C[i]) for i in range(N)]
    if m15 and N:   # the 15M: its own older candles up to the first whole quarter-hour of minutes, the minutes from there
        q0 = -(-T[0] // 900) * 900; m1 = [tuple(x) for x in sorted(m15) if x[0] < q0] + [x for x in m1 if x[0] >= q0]
    for tf, sec, src, key, st0 in (('15m', 900, m1, lambda t: t // 900, lambda k, t: k * 900),
                                   ('1h', 3600, hb, lambda t: t // 3600, lambda k, t: k * 3600),
                                   ('4h', 14400, hb, lambda t: (t + ny_off(t) - 17 * 3600) // 14400, lambda k, t: k * 14400 + 17 * 3600 - ny_off(t))):
        b = agg(src, key, st0)
        TFS[tf] = dict(b=b, end=[x[0] + sec for x in b], st=read_bars(b))

def htf_state(i):
    """Phase at minute i from confirmed hour swings: trend needs HH+HL twice (3 rising highs and 3 rising lows)."""
    now = T[i] + 60   # the minute i has closed
    hs = [s for s in SWH if s[0] <= now][-3:]; ls = [s for s in SWL if s[0] <= now][-3:]
    if len(hs) < 3 or len(ls) < 3: return None
    up = hs[0][1] < hs[1][1] < hs[2][1] and ls[0][1] < ls[1][1] < ls[2][1]
    dn = hs[0][1] > hs[1][1] > hs[2][1] and ls[0][1] > ls[1][1] > ls[2][1]
    ph = 'trend up' if up else 'trend down' if dn else 'range'
    # the previous A2B: for an up trend the last swing low -> the swing high after it (down: mirror)
    a2b = None
    if up:
        lo = ls[-1]; his = [s for s in hs if s[2] > lo[2]]
        if his: a2b = (lo[1], max(s[1] for s in his))
    if dn:
        hi = hs[-1]; los = [s for s in ls if s[2] > hi[2]]
        if los: a2b = (hi[1], min(s[1] for s in los))
    return ph, a2b

# ---------- his three phases, read on 4H / 1H / 15M (7 Nov 2026)
# Nestor: "there are 3 phases in the market, trend, range and initiation ... you need to study my notes in the academy and community!"
# From his notes (lessons 3.1-3.2 and 5.1, #market-phases, #the-trading-plan) with the settings he agreed on 7 Nov ("yes build it"):
#   trend       higher highs and higher lows twice over (lower / lower down). It ends on a CLOSE below the last higher low ("not near
#               it, not testing it, below it"): a fast break with a firm close is an initiation, a slow one a range forming.
#   range       a balanced area between premium and discount; confirmed once one side is tested a second time.
#   initiation  a candle that closes strongly outside the range (body >= 60% of it, at least the size of the recent candles): a close,
#               not a wick. It lasts until a trend forms out of it; it was fake if price closes back inside the range.
# Location on that reading's range (range: the range; trend: its last leg; initiation: the range it broke), in his bias form's six
# places; direction from the phase (a range is unsure). If the 4H and the 15M point opposite ways there is no trade (his rule, 7 Nov).
PHASES = True          # False: the hour-chart reading the study first ran with (htf_state + the 24 h box)
SW_K = 2               # a swing high / low: 2 candles on each side, on every timeframe
# The year of EUR/USD London 08-10 (TP 20, stop 2-4), 7 Nov: the study's reading +35.7R (144 trades, drawdown 15.7R); his phases with
# the 24 h box +38.1R (103, drawdown 10.7R); premium / discount on the 1H range instead +9.1R; blocking when the 4H and 15M disagree
# +26.1R (the blocked trades made 12R). He chose: alert, and say they disagree. Never against the hour chart's initiation (INIT_1H):
# +42.0R (99 trades, drawdown 9.5R). The other markets, scaled: GBP/USD +32.4R, gold +5.8R, US100 +1.0R (before: +17.1, +23.8, -12.8).
TF_RULE = False        # True: no setup while the 4H and the 15M point opposite ways (his first idea, 7 Nov); False: the alert says it
INIT_1H = True         # never against an initiation on the hour chart: no 15M pocket the other way
LOC_24H = True         # premium / discount on the 24 h before the session (False: on the 1H reading's own range, -29R on the year)
# The bigger picture decides the side (Nestor, 7 Nov 2026: "the hawk cant just base its entries on the last 24h, it needs to be able to look
# further to really know what market structure price is in, location and direction"): the 4H reading, in a trend or an initiation its way
# only; in a range sells from its premium half, buys from its discount half, nothing in its middle (45-55%). The 24 h box still picks the
# edge. The year, London 08-10, scaled: EUR/USD +42.0R -> +51.0R (99 -> 55 trades, drawdown 9.5 -> 7.9, the first half -1.1 -> +10.5),
# gold +5.8 -> +27.3R (drawdown 13.8 -> 6.0), GBP/USD +32.4 -> +22.5R (drawdown 25.4 -> 15.8), US100 +1.0 -> -1.0R. The Daily instead:
# EUR/USD +42.2R, gold +4.3R; location on the 4H alone lost 31R on gold. Live reads 1000 hour candles (600 matched the year on 99% of days).
HTF_4H = True
STRONG_BODY, STRONG_SIZE = 0.6, 1.0   # an initiation candle: body >= 60% of its range, range >= the average of the 20 before it
TFS = {}               # '15m' / '1h' / '4h' -> dict(b=[(start, o, h, l, c)], end=[close time], st=[the reading after each candle])
US = {y: (ts(nth_sunday(y, 3, 2), 7), ts(nth_sunday(y, 11, 1), 6)) for y in (2025, 2026, 2027)}
def ny_off(t):
    y = dt.datetime.fromtimestamp(t, dt.timezone.utc).year; a, b = US[y]; return -4 * 3600 if a <= t < b else -5 * 3600
def agg(src, key, start):
    out = []
    for x in src:
        k = key(x[0])
        if out and out[-1][0] == k: y = out[-1]; y[3] = max(y[3], x[2]); y[4] = min(y[4], x[3]); y[5] = x[4]
        else: out.append([k, start(k, x[0]), x[1], x[2], x[3], x[4]])
    return [tuple(y[1:]) for y in out]

def read_bars(b):
    """His reading after each closed candle of one timeframe - dict(ph, d, hi, lo, ok, a2b, base, ext). Uses nothing after that candle."""
    out = []; sh, sl = [], []   # confirmed swings (price, candle index), known SW_K candles later
    ph, d, hi, lo, ok, t0 = 'range', 0, None, None, False, 0   # t0: where this range began (tests after it count)
    tests = [1, 1]; base = ext = brk = None; sz = []
    def rising(xs, up): return all((xs[n + 1][0] > xs[n][0]) if up else (xs[n + 1][0] < xs[n][0]) for n in range(len(xs) - 1))
    for j in range(len(b)):
        _, o, h, l, c = b[j]; m = j - SW_K; new_h = new_l = None
        if m >= SW_K:
            nb = [b[x] for x in range(m - SW_K, m + SW_K + 1) if x != m]
            if b[m][2] > max(x[2] for x in nb): new_h = (b[m][2], m); sh.append(new_h)
            if b[m][3] < min(x[3] for x in nb): new_l = (b[m][3], m); sl.append(new_l)
        rg = h - l; avg = sum(sz[-20:]) / len(sz[-20:]) if sz else rg; sz.append(rg)
        strong = rg > 0 and abs(c - o) >= STRONG_BODY * rg and rg >= STRONG_SIZE * avg
        if hi is None: hi, lo = h, l
        if ph == 'initiation':
            ext = max(ext, h) if d > 0 else min(ext, l)
            if (c < base[0]) if d > 0 else (c > base[1]):   # back inside the range it broke: it was fake, and that side was tested
                ph, hi, lo, ok, t0, tests = 'range', max(base[0], ext), min(base[1], ext), True, j, [1, 1]; d = 0
            else:
                a_h = [x for x in sh[-2:] if x[1] > brk]; a_l = [x for x in sl[-2:] if x[1] > brk]
                if len(a_h) >= 2 and len(a_l) >= 2 and rising(a_h[-2:], d > 0) and rising(a_l[-2:], d > 0): ph = 'trend'   # a trend grew out of it
        elif ph == 'trend':
            hl = (sl if d > 0 else sh)[-1][0]; hh = (sh if d > 0 else sl)[-1][0]   # the last higher low (lower high) and high (low)
            if (c < hl) if d > 0 else (c > hl):
                if strong: ph, base, ext, brk, d = 'initiation', (max(hh, hl), min(hh, hl)), (l if d > 0 else h), j, -d
                else: ph, hi, lo, ok, t0, tests, d = 'range', max(hh, hl, h), min(hh, hl, l), False, j, [1, 1], 0
        else:
            if c > hi or c < lo:
                dd = 1 if c > hi else -1
                if strong: ph, d, base, ext, brk = 'initiation', dd, (hi, lo), (h if dd > 0 else l), j
                else: hi, lo = max(hi, h), min(lo, l)   # a slow break: the range grows
            elif len(sh) >= 3 and len(sl) >= 3 and (rising(sh[-3:], True) and rising(sl[-3:], True) or rising(sh[-3:], False) and rising(sl[-3:], False)):
                d = 1 if rising(sh[-3:], True) else -1
                if (c > sl[-1][0]) if d > 0 else (c < sh[-1][0]): ph = 'trend'
                else: d = 0
            q = (hi - lo) / 4
            if ph == 'range':
                if new_h and new_h[1] > t0 and new_h[0] >= hi - q: tests[0] += 1
                if new_l and new_l[1] > t0 and new_l[0] <= lo + q: tests[1] += 1
                ok = ok or max(tests) >= 2
        a2b = None
        if ph == 'trend' and sh and sl:
            a_, xs = (sl[-1], sh) if d > 0 else (sh[-1], sl)   # the last leg: the last higher low -> the high after it (down: mirror)
            later = []
            for x in reversed(xs):
                if x[1] <= a_[1]: break
                later.append(x[0])
            if d > 0: a2b = (a_[0], max(later or [max(x[2] for x in b[a_[1]:j + 1])]))
            else: a2b = (a_[0], min(later or [min(x[3] for x in b[a_[1]:j + 1])]))
        out.append(dict(ph=ph, d=d, hi=hi, lo=lo, ok=ok, a2b=a2b, base=base if ph == 'initiation' else None, ext=ext if ph == 'initiation' else None))
    return out

def read(tf, t):
    """His reading of timeframe tf as it stood at UTC second t (its last candle closed by then); None without enough history."""
    x = TFS.get(tf)
    if not x: return None
    k = bisect.bisect_right(x['end'], t) - 1
    return x['st'][k] if k >= 12 else None

def where(r, p):
    """Where price p sits on reading r, in his bias form's six places."""
    if r['ph'] == 'trend' and r['a2b']: lo_, hi_ = sorted(r['a2b'])
    elif r['ph'] == 'initiation': lo_, hi_ = r['base'][1], r['base'][0]
    else: lo_, hi_ = r['lo'], r['hi']
    if hi_ - lo_ <= 0: return '50%'
    x = (p - lo_) / (hi_ - lo_)
    return ('breakout' if x > 1 or x < 0 else 'premium edge' if x >= .75 else 'premium middle' if x >= .55 else '50%' if x >= .45
            else 'discount middle' if x >= .25 else 'discount edge')

def tf_said(r):
    """'trend up' / 'range' / 'range forming' / 'initiation down' for a reading."""
    if r['ph'] == 'range': return 'range' if r['ok'] else 'range forming'
    return r['ph'] + (' up' if r['d'] > 0 else ' down')

def disagree(t):
    """The 4H and the 15M point opposite ways at UTC second t: (4H direction, 15M direction), else None."""
    a, b = read('4h', t), read('15m', t)
    return (a['d'], b['d']) if a and b and a['d'] and b['d'] and a['d'] != b['d'] else None

def tfx(t):
    """For an alert: (4H direction, 15M direction) when they point opposite ways at UTC second t, else None."""
    return disagree(t) if PHASES else None

def htf_pos(r, p):
    """Where p sits in a reading's own range: 0 its low, 1 its high (a trend: its last leg; an initiation: the range it broke and how far it went)."""
    if r['ph'] == 'trend' and r['a2b']: lo_, hi_ = sorted(r['a2b'])
    elif r['ph'] == 'initiation': lo_, hi_ = min(r['base'][1], r['ext']), max(r['base'][0], r['ext'])
    else: lo_, hi_ = r['lo'], r['hi']
    return 0.5 if hi_ <= lo_ else (p - lo_) / (hi_ - lo_)

def htf_bias(t, p):
    """The bigger picture's side at UTC second t for price p: 1 buys, -1 sells, 0 none (a 4H range's middle), None without enough history."""
    r = read('4h', t)
    if not r: return None
    if r['ph'] in ('trend', 'initiation'): return r['d']
    x = htf_pos(r, p); return -1 if x >= 0.55 else 1 if x <= 0.45 else 0

def htf_ok(side, t, p):
    return not (PHASES and HTF_4H) or htf_bias(t, p) == side

def htf_said(t, p, px=lambda v: '%.5f' % v):
    """The brief's line: 'Bigger picture: 4H trend down. Sells only.'"""
    r = read('4h', t)
    if not r: return 'Bigger picture: not enough 4H history. No trades.'
    b = htf_bias(t, p); only = {1: 'Buys only.', -1: 'Sells only.'}.get(b)
    if r['ph'] in ('trend', 'initiation'): return 'Bigger picture: 4H %s %s. %s' % (r['ph'], 'up' if r['d'] > 0 else 'down', only)
    rg = '%s–%s' % (px(r['lo']), px(r['hi']))
    if b == 0: return 'Bigger picture: 4H range %s, price at its middle. No trades until price leaves it.' % rg
    return 'Bigger picture: 4H range %s, price in its %s half. %s' % (rg, 'premium' if b < 0 else 'discount', only)

def frame(i0):
    """The window's reading at its start (minute i0): the rules' phase (the hour chart), its last leg, the premium / discount range, and
    the three timeframes. None before there is enough history."""
    j = i0
    while j > 0 and T[i0] - T[j] < 86400: j -= 1
    if not PHASES:
        st = htf_state(i0)
        return st and dict(ph=st[0], a2b=st[1], bh=max(H[j:i0]), bl=min(L[j:i0]), tf=None, j=j)
    now = T[i0] + 60; r = {tf: read(tf, now) for tf in ('4h', '1h', '15m')}
    if not all(r.values()): return None
    h = r['1h']; ph = tf_said(h)
    if LOC_24H: bh, bl = max(H[j:i0]), min(L[j:i0])
    elif h['ph'] == 'trend' and h['a2b']: bh, bl = max(h['a2b']), min(h['a2b'])
    elif h['ph'] == 'initiation': bh, bl = max(h['base'][0], h['ext']), min(h['base'][1], h['ext'])
    elif h['ph'] == 'range': bh, bl = h['hi'], h['lo']
    else: bh, bl = max(H[j:i0]), min(L[j:i0])
    return dict(ph=ph, a2b=h['a2b'], bh=bh, bl=bl, j=j, tf={k: dict(v, said=tf_said(v), loc=where(v, C[i0])) for k, v in r.items()},
                htf=htf_bias(now, C[i0]) if HTF_4H else None)

# ---------- trade management from the plan
COST = 0.6
STOP_MAX = 4.0     # his rule: stop 2-4 pips on every model (6 Nov: was 4.5 on the continuation / initiation pockets)
TP_LIQ = True      # target 20 pips, cut short at the next HTF liquidity; False = always 20 pips
EXIT_NEWS = True     # out by 13:20 London if the target hasn't hit (the 13:30 red-news rule, applied every day)
# Tested 7 Nov on the year and left off: his 0.2-0.3 pip stop (0.25, a stop under 2 widened to 2) +1.2R alone but -3.8R with the phases
# and twice the drawdown; a 5-pip box with the entry moved inside it -4.3R.
STOP_PAST = 0.5      # the stop this far past the extreme / the small range (pips)
BOX_MAX = 4.0        # the small range at the 50% / the pocket at a break: up to this many pips
FIT_STOP = False     # True: a stop under 2 pips widens to 2; one past 4 moves the entry inside the box
def fit(side, entry, stop):
    """His 2-4 pip stop: (entry, stop), or None when it can't fit."""
    if FIT_STOP:
        if abs(entry - stop) > STOP_MAX * PIP: entry = stop + side * STOP_MAX * PIP
        if abs(entry - stop) < 2 * PIP: stop = entry - side * 2 * PIP
    return (entry, stop) if 2 * PIP - 1e-9 <= abs(entry - stop) <= STOP_MAX * PIP + 1e-9 else None
def manage(j0, side, entry, stop, tgt, be_lvl):
    risk = abs(entry - stop); sl = stop; at_be = False; d = LDAY[j0]
    for j in range(j0, N):
        if LDAY[j] != d or (EXIT_NEWS and LMIN[j] >= 13 * 60 + 20) or LMIN[j] >= 20 * 60:
            px = O[j] if LDAY[j] == d else C[j - 1]
            return ((px - entry) * side / risk, 'be' if at_be and (px - entry) * side <= 0.2 * PIP else 'time', j)
        if side > 0:
            if L[j] <= sl: return ((sl - entry) / risk, 'be' if at_be else 'loss', j)
            if H[j] >= tgt: return ((tgt - entry) / risk, 'win', j)
            if not at_be and be_lvl is not None and H[j] > be_lvl: sl = entry; at_be = True
        else:
            if H[j] >= sl: return ((entry - sl) / risk, 'be' if at_be else 'loss', j)
            if L[j] <= tgt: return ((entry - tgt) / risk, 'win', j)
            if not at_be and be_lvl is not None and L[j] < be_lvl: sl = entry; at_be = True
    return (0, 'time', N - 1)

def target(side, entry, risk, liq=None):
    """TP at the next HTF liquidity, capped at 20 pips; must be at least 5R."""
    dist = 20 * PIP
    if liq is not None:
        dd = (liq - entry) * side
        if dd > 0 and TP_LIQ: dist = min(dist, dd)
    return entry + side * dist if dist / risk >= 5 - 1e-9 else None

def prev_extreme(side, j, look=90, gap=3):
    """The last 1m swing high (buy) / low (sell) before j - the break-even trigger (rule 1)."""
    for k in range(j - gap - 1, max(j - look, gap), -1):
        if side > 0 and H[k] >= max(H[k - gap:k + gap + 1]): return H[k]
        if side < 0 and L[k] <= min(L[k - gap:k + gap + 1]): return L[k]
    return None

# ---------- the two LTF triggers (used by every phase)
def reaction(side, a, A):
    """Price slows at the mitigation: the first small bar (<= 2 pips) right after the extreme, no new extreme."""
    for k in range(a + 1, min(a + 4, N)):
        if (L[k] < A) if side > 0 else (H[k] > A): return None
        if H[k] - L[k] <= 2 * PIP:
            entry = C[k]; stop = A - side * STOP_PAST * PIP   # it enters at the close; only the stop can widen
            if FIT_STOP and abs(entry - stop) < 2 * PIP: stop = entry - side * 2 * PIP
            if 2 * PIP - 1e-9 <= abs(entry - stop) <= STOP_MAX * PIP + 1e-9: return (k + 1, entry, stop)
            return None
    return None

def continuation(side, a, A, win_end, min_leg=12, on_pocket=None):
    """Aggressive leg from A, small range/doji at about its 50%, limit on the pullback, stop past the small range."""
    Bv, b = A, a
    for k in range(a + 1, min(a + 31, N)):
        if (L[k] < A) if side > 0 else (H[k] > A): break
        if (H[k] > Bv) if side > 0 else (L[k] < Bv): Bv, b = (H[k] if side > 0 else L[k]), k
    if abs(Bv - A) < min_leg * PIP or b - a > 30: return None
    mid = (A + Bv) / 2; best = None
    for s in range(a + 1, b - 1):
        for e in range(s + 2, min(s + 8, b)):
            hi, lo = max(H[s:e + 1]), min(L[s:e + 1])
            if hi - lo <= BOX_MAX * PIP and lo <= mid <= hi:
                dd = abs((hi + lo) / 2 - mid)
                if best is None or dd < best[0]: best = (dd, hi, lo, s, e)
    if not best: return None
    _, hi, lo, s0, e0 = best
    bx = (hi, lo, s0, e0)   # the small range itself, for the hawk's box (7 Nov 2026)
    f = fit(side, hi if side > 0 else lo, lo - STOP_PAST * PIP if side > 0 else hi + STOP_PAST * PIP)   # first touch of the box, or inside it
    if not f: return None
    entry, stop = f
    if on_pocket: on_pocket(entry, stop, Bv, b, mid, bx)   # the hawk: the pullback level is known before price comes back
    for k in range(b + 1, N):
        if LDAY[k] != LDAY[a] or LMIN[k] >= win_end: return None
        if (H[k] > Bv) if side > 0 else (L[k] < Bv): return None
        if (L[k] <= entry - 0.1 * PIP) if side > 0 else (H[k] >= entry + 0.1 * PIP):
            if (L[k] <= stop) if side > 0 else (H[k] >= stop): return ('stopbar', k, entry, stop, Bv, bx)
            return (k + 1, entry, stop, Bv, bx)
    return None

# ---------- scanning one session
WIN = (8 * 60, 10 * 60)
def sessions():
    s = defaultdict(list)
    for i in range(N):
        if WIN[0] - 60 <= LMIN[i] < WIN[1] and dt.datetime.fromtimestamp(T[i], dt.timezone.utc).weekday() < 5: s[LDAY[i]].append(i)
    return s

def scan_day(idx, opts):
    out = []
    ev = opts.get('events')   # the hawk collects what is forming: sweeps, pockets, initiations
    n_ev = len(ev) if ev is not None else 0
    i0 = idx[0]
    fr = frame(i0)   # 7 Nov: his phase on the hour chart and its range; before, the hour swings and the 24 h before 08:00
    if not fr: return out, None
    ph, a2b, bh, bl = fr['ph'], fr['a2b'], fr['bh'], fr['bl']
    q = (bh - bl) / 4
    init_dir = 0; init_at = None
    for i in idx:
        if i < 60: continue
        m = LMIN[i]
        dis = (PHASES if TF_RULE is None else TF_RULE) and not opts.get('any_tf') and disagree(T[i] + 60)   # 4H and 15M opposite: no trade
        brk = None
        if PHASES:
            # initiation (7 Nov): a 15-minute candle closes strongly out of the 15M range - his definition, read on the 15M
            if (T[i] + 60) % 900 == 0 and init_dir == 0:
                r1, r0 = read('15m', T[i] + 60), read('15m', T[i] + 60 - 900)
                if r1 and r1['ph'] == 'initiation' and not (r0 and r0['ph'] == 'initiation' and r0['d'] == r1['d']):
                    brk = (r1['d'], r1['base'][0] if r1['d'] > 0 else r1['base'][1])
        elif m % 5 == 4 and i >= 4 and init_dir == 0:
            # before 7 Nov: a 5-minute candle that closes strongly outside the 24 h box (body >= 60%, close >= 2 pips past the edge)
            o5, c5 = O[i - 4], C[i]; h5, l5 = max(H[i - 4:i + 1]), min(L[i - 4:i + 1])
            if h5 - l5 >= 4 * PIP and abs(c5 - o5) >= 0.6 * (h5 - l5):
                if c5 > bh + 2 * PIP and c5 > o5: brk = (1, bh)
                if c5 < bl - 2 * PIP and c5 < o5: brk = (-1, bl)
        if brk:
                init_dir, init_at = brk[0], i
                against = INIT_1H and ph.startswith('initiation') and init_dir != (1 if ph.endswith('up') else -1)
                if not dis and not against and WIN[0] <= m < WIN[1] and 'initiation' in opts['models']:
                    side = init_dir; edge = brk[1]
                    # the small mitigation pocket at the break: the last tight 1m range (<=4 pips) touching the edge
                    pk = None
                    for s in range(i - 1, i - (40 if PHASES else 25), -1):
                        hi, lo = max(H[s:s + 3]), min(L[s:s + 3])
                        if hi - lo <= BOX_MAX * PIP and lo - 1 * PIP <= edge <= hi + 1 * PIP: pk = (hi, lo); break
                    if ev is not None:
                        e_ = dict(kind='initiation', i=i, side=side, edge=edge, bh=bh, bl=bl)
                        f = pk and fit(side, pk[0] if side > 0 else pk[1], pk[1] - STOP_PAST * PIP if side > 0 else pk[0] + STOP_PAST * PIP)
                        if f:
                            e_['entry'], e_['stop'] = f
                            e_['tgt'] = target(side, e_['entry'], abs(e_['entry'] - e_['stop']))
                        ev.append(e_)
                    f = pk and fit(side, pk[0] if side > 0 else pk[1], pk[1] - STOP_PAST * PIP if side > 0 else pk[0] + STOP_PAST * PIP)
                    if f:
                        entry, stop = f
                        if True:
                            tg = target(side, entry, abs(entry - stop))
                            if tg:
                                for k in range(i + 1, N):
                                    if LDAY[k] != LDAY[i] or LMIN[k] >= WIN[1]: break
                                    if (L[k] <= entry - 0.1 * PIP) if side > 0 else (H[k] >= entry + 0.1 * PIP):
                                        ext = max(H[i - 4:k]) if side > 0 else min(L[i - 4:k])
                                        sb = (L[k] <= stop) if side > 0 else (H[k] >= stop)
                                        out.append(dict(model='initiation pocket', phase='initiation', side=side,
                                                        i=k if sb else k + 1, entry=entry, stop=stop, tgt=tg, be=ext,
                                                        stopbar=sb, loc='break', tfx=tfx(T[i] + 60), edge=edge, ti=T[i]))
                                        break
        if not (WIN[0] - 30 <= m < WIN[1]) or dis: continue
        for side in (1, -1):
            # liquidity taken: a low (high) beyond the last hour's
            if side > 0 and not L[i] < min(L[i - 60:i]): continue
            if side < 0 and not H[i] > max(H[i - 60:i]): continue
            a, A = i, (L[i] if side > 0 else H[i])
            for k in range(i + 1, min(i + 10, N)):
                if (L[k] < A) if side > 0 else (H[k] > A): A = L[k] if side > 0 else H[k]; a = k
            loc = 'discount' if A <= bl + q else 'premium' if A >= bh - q else '50% zone' if abs(A - (bh + bl) / 2) <= q / 2 else 'between'
            edge_ok = (side > 0 and loc == 'discount') or (side < 0 and loc == 'premium')
            # which phase rule this setup belongs to
            if init_dir and init_at < a:
                if side != init_dir and opts.get('respect_init', True): continue   # never against an initiation
            react = True
            if ph == 'range forming' and not opts.get('any_loc'): continue   # 7 Nov: a range trades once one side was tested again
            if ph.startswith('initiation'):
                # 7 Nov: an initiation on the hour chart - only its way, and only the 50% of a new leg (the pocket at the break is the
                # initiation model above); never its edge or 50% against it
                if side != (1 if ph.endswith('up') else -1): continue
                rule = 'initiation'; liq = None; react = False
            elif ph.startswith('range'):
                if not edge_ok and not opts.get('any_loc'): continue
                rule = 'range'; liq = bh if side > 0 else bl
            else:
                tside = 1 if ph == 'trend up' else -1
                if side == tside:
                    # with-trend: mitigation at the 50% of the previous A2B (40-60% band)
                    if not a2b: continue
                    lo_, hi_ = sorted(a2b); mid = (lo_ + hi_) / 2; band = (hi_ - lo_) * 0.1
                    if not (mid - band <= A <= mid + band) and not opts.get('any_loc'): continue
                    rule = 'trend 50%'; liq = a2b[1]
                else:
                    # countertrend back to the 50%: only if 20 pips fit before it
                    if not a2b: continue
                    mid = sum(a2b) / 2
                    if (A - mid) * side > -20 * PIP and not opts.get('any_loc'): continue
                    rule = 'countertrend'; liq = mid
            if ev is not None: ev.append(dict(kind='sweep', i=i, a=a, A=A, side=side, rule=rule, loc=loc, liq=liq, ph=ph))
            if react and 'reaction' in opts['models']:
                r = reaction(side, a, A)
                if r and WIN[0] <= LMIN[r[0] - 1] < WIN[1]:
                    tg = target(side, r[1], abs(r[1] - r[2]), liq)
                    if tg: out.append(dict(model=rule + ' · reaction', phase=ph, side=side, i=r[0], entry=r[1],
                                           stop=r[2], tgt=tg, be=prev_extreme(side, a), stopbar=False, loc=loc, tfx=tfx(T[r[0] - 1] + 60),
                                           A=A, ta=T[a], ts=T[i], liq=liq))
            if 'continuation' in opts['models']:
                pocket = None
                if ev is not None:
                    def pocket(e, s_, Bv, b, mid, bx=None, side=side, a=a, A=A, rule=rule, liq=liq, loc=loc):
                        ev.append(dict(kind='pocket', i=b, a=a, A=A, side=side, rule=rule, loc=loc, entry=e, stop=s_, B=Bv, b=b,
                                       mid=mid, tgt=target(side, e, abs(e - s_), liq), box=bx))
                r = continuation(side, a, A, WIN[1], on_pocket=pocket)
                if r:
                    sb = r[0] == 'stopbar'
                    k, e, s_, Bv, bx = (r[1], r[2], r[3], r[4], r[5]) if sb else r
                    if WIN[0] <= LMIN[k - (0 if sb else 1)] < WIN[1]:
                        tg = target(side, e, abs(e - s_), liq)
                        if tg: out.append(dict(model=rule + ' · continuation', phase=ph, side=side, i=k, entry=e,
                                               stop=s_, tgt=tg, be=Bv, stopbar=sb, loc=loc, box=bx, tfx=tfx(T[k - 1] + 60),
                                               A=A, ta=T[a], ts=T[i], liq=liq, B=Bv))
    if PHASES and HTF_4H:   # the bigger picture: the 4H's side only, at the moment of each one (7 Nov 2026)
        out = [o_ for o_ in out if htf_ok(o_['side'], T[o_['i'] - 1] + 60, o_['entry'])]
        if ev is not None:
            keep = []
            for e_ in ev[n_ev:]:
                ok_ = htf_ok(e_['side'], T[e_['i']] + 60, e_.get('entry', e_.get('A', C[e_['i']])))
                if e_['kind'] == 'initiation':   # still said (don't trade against it); its pocket only on the 4H's side
                    keep.append(e_ if ok_ else {k: v for k, v in e_.items() if k not in ('entry', 'stop', 'tgt')})
                elif ok_: keep.append(e_)
            ev[n_ev:] = keep
    # what the Study tab draws for each one (7 Nov 2026): the 24 h box, the hour chart's last leg, the three timeframes at the start
    tfs = {k: dict(said=v['said'], loc=v['loc'], d=v['d']) for k, v in fr['tf'].items()} if fr.get('tf') else None
    for o_ in out: o_.update(bh=bh, bl=bl, a2b=a2b, r0=int(T[fr['j']]), r1=int(T[i0]), tfs=tfs, htf=fr.get('htf'))
    return out, ph

def run(opts):
    trades = []; daylog = {}
    for d, idx in sorted(sessions().items()):
        setups, ph = scan_day(idx, opts)
        daylog[d] = ph
        seen = set(); taken = []; busy = -1
        for s in sorted(setups, key=lambda s: s['i']):
            key = (s['model'], s['side'], round(s['entry'], 5))
            if key in seen or s['i'] <= busy: continue
            seen.add(key)
            if opts.get('serve', True):
                if len(taken) >= 2 or (taken and taken[-1]['out'] == 'win'): break
                if taken and taken[-1]['out'] == 'loss' and 'continuation' not in s['model'] and 'initiation' not in s['model']: continue
            if s['stopbar']: R, outc, j = -1.0, 'loss', s['i']
            else: R, outc, j = manage(s['i'], s['side'], s['entry'], s['stop'], s['tgt'], s['be'])
            rp = abs(s['entry'] - s['stop']) / PIP
            t = dict(s, R=R, net=R - opts.get('cost', COST) / rp, out=outc, exit=j, risk=rp,
                     when=dt.datetime.utcfromtimestamp(LT[s['i']]).strftime('%Y-%m-%d %H:%M'))
            taken.append(t); trades.append(t); busy = j
    return trades, daylog

def stats(tr):
    n = len(tr)
    if not n: return dict(n=0)
    c = lambda o: sum(1 for t in tr if t['out'] == o)
    net = sum(t['net'] for t in tr); eq = pk = dd = 0; st = mx = 0
    for t in tr:
        eq += t['net']; pk = max(pk, eq); dd = max(dd, pk - eq); st = st + 1 if t['net'] < 0 else 0; mx = max(mx, st)
    return dict(n=n, win=c('win'), loss=c('loss'), be=c('be'), time=c('time'), winrate=round(100 * c('win') / n, 1),
                gross=round(sum(t['R'] for t in tr), 1), net=round(net, 1), avg=round(net / n, 2), dd=round(dd, 1),
                streak=mx, risk=round(sum(t['risk'] for t in tr) / n, 2))

