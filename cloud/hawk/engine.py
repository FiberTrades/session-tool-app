# ST Method engine: every entry type from the trading plan, on 1-minute candles. Shared by the rule study (st.py)
# and the hawk (live alerts on uk1), so the alerts follow exactly the rules that were tested. Call load() first.
import os, json, sys, datetime as dt
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

def load(t, o, h, l, c, h1=None):
    """Set the 1-minute candles (UTC seconds). h1 = [(hour_start_utc, o, h, l, c)], else hour candles are built from the minutes."""
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

# ---------- trade management from the plan
COST = 0.6
STOP_MAX = 4.0     # his rule: stop 2-4 pips on every model (6 Nov: was 4.5 on the continuation / initiation pockets)
TP_LIQ = True      # target 20 pips, cut short at the next HTF liquidity; False = always 20 pips
EXIT_NEWS = True     # out by 13:20 London if the target hasn't hit (the 13:30 red-news rule, applied every day)
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
            entry = C[k]; stop = A - side * 0.5 * PIP
            r = abs(entry - stop)
            if 2 * PIP <= r <= STOP_MAX * PIP + 1e-9: return (k + 1, entry, stop)
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
            if hi - lo <= 4 * PIP and lo <= mid <= hi:
                dd = abs((hi + lo) / 2 - mid)
                if best is None or dd < best[0]: best = (dd, hi, lo)
    if not best: return None
    _, hi, lo = best
    entry = hi if side > 0 else lo; stop = lo - 0.5 * PIP if side > 0 else hi + 0.5 * PIP
    if not (2 * PIP <= abs(entry - stop) <= STOP_MAX * PIP + 1e-9): return None
    if on_pocket: on_pocket(entry, stop, Bv, b, mid)   # the hawk: the pullback level is known before price comes back
    for k in range(b + 1, N):
        if LDAY[k] != LDAY[a] or LMIN[k] >= win_end: return None
        if (H[k] > Bv) if side > 0 else (L[k] < Bv): return None
        if (L[k] <= entry - 0.1 * PIP) if side > 0 else (H[k] >= entry + 0.1 * PIP):
            if (L[k] <= stop) if side > 0 else (H[k] >= stop): return ('stopbar', k, entry, stop, Bv)
            return (k + 1, entry, stop, Bv)
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
    i0 = idx[0]
    st = htf_state(i0)
    if not st: return out, None
    ph, a2b = st
    # 24 h box before the session for premium/discount/50%
    j = i0
    while j > 0 and T[i0] - T[j] < 86400: j -= 1
    bh, bl = max(H[j:i0 + 60]), min(L[j:i0 + 60])
    q = (bh - bl) / 4
    init_dir = 0; init_at = None
    for i in idx:
        if i < 60: continue
        m = LMIN[i]
        # initiation: a 5-minute candle that closes strongly outside the box (body >= 60%, close >= 2 pips past the edge)
        if m % 5 == 4 and i >= 4 and init_dir == 0:
            o5, c5 = O[i - 4], C[i]; h5, l5 = max(H[i - 4:i + 1]), min(L[i - 4:i + 1])
            if h5 - l5 >= 4 * PIP and abs(c5 - o5) >= 0.6 * (h5 - l5):
                if c5 > bh + 2 * PIP and c5 > o5: init_dir, init_at = 1, i
                if c5 < bl - 2 * PIP and c5 < o5: init_dir, init_at = -1, i
                if init_dir and WIN[0] <= m < WIN[1] and 'initiation' in opts['models']:
                    side = init_dir; edge = bh if side > 0 else bl
                    # the small mitigation pocket at the break: the last tight 1m range (<=4 pips) touching the edge
                    pk = None
                    for s in range(i - 1, i - 25, -1):
                        hi, lo = max(H[s:s + 3]), min(L[s:s + 3])
                        if hi - lo <= 4 * PIP and lo - 1 * PIP <= edge <= hi + 1 * PIP: pk = (hi, lo); break
                    if ev is not None:
                        e_ = dict(kind='initiation', i=i, side=side, edge=edge, bh=bh, bl=bl)
                        if pk:
                            e_['entry'] = pk[0] if side > 0 else pk[1]; e_['stop'] = pk[1] - 0.5 * PIP if side > 0 else pk[0] + 0.5 * PIP
                            e_['tgt'] = target(side, e_['entry'], abs(e_['entry'] - e_['stop']))
                        ev.append(e_)
                    if pk:
                        hi, lo = pk
                        entry = hi if side > 0 else lo; stop = lo - 0.5 * PIP if side > 0 else hi + 0.5 * PIP
                        if 2 * PIP <= abs(entry - stop) <= STOP_MAX * PIP + 1e-9:
                            tg = target(side, entry, abs(entry - stop))
                            if tg:
                                for k in range(i + 1, N):
                                    if LDAY[k] != LDAY[i] or LMIN[k] >= WIN[1]: break
                                    if (L[k] <= entry - 0.1 * PIP) if side > 0 else (H[k] >= entry + 0.1 * PIP):
                                        ext = max(H[i - 4:k]) if side > 0 else min(L[i - 4:k])
                                        sb = (L[k] <= stop) if side > 0 else (H[k] >= stop)
                                        out.append(dict(model='initiation pocket', phase='initiation', side=side,
                                                        i=k if sb else k + 1, entry=entry, stop=stop, tgt=tg, be=ext,
                                                        stopbar=sb, loc='break'))
                                        break
        if not (WIN[0] - 30 <= m < WIN[1]): continue
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
            if ph == 'range':
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
            if 'reaction' in opts['models']:
                r = reaction(side, a, A)
                if r and WIN[0] <= LMIN[r[0] - 1] < WIN[1]:
                    tg = target(side, r[1], abs(r[1] - r[2]), liq)
                    if tg: out.append(dict(model=rule + ' · reaction', phase=ph, side=side, i=r[0], entry=r[1],
                                           stop=r[2], tgt=tg, be=prev_extreme(side, a), stopbar=False, loc=loc))
            if 'continuation' in opts['models']:
                pocket = None
                if ev is not None:
                    def pocket(e, s_, Bv, b, mid, side=side, a=a, A=A, rule=rule, liq=liq, loc=loc):
                        ev.append(dict(kind='pocket', i=b, a=a, A=A, side=side, rule=rule, loc=loc, entry=e, stop=s_, B=Bv, b=b,
                                       mid=mid, tgt=target(side, e, abs(e - s_), liq)))
                r = continuation(side, a, A, WIN[1], on_pocket=pocket)
                if r:
                    sb = r[0] == 'stopbar'
                    k, e, s_, Bv = (r[1], r[2], r[3], r[4]) if sb else r
                    if WIN[0] <= LMIN[k - (0 if sb else 1)] < WIN[1]:
                        tg = target(side, e, abs(e - s_), liq)
                        if tg: out.append(dict(model=rule + ' · continuation', phase=ph, side=side, i=k, entry=e,
                                               stop=s_, tgt=tg, be=Bv, stopbar=sb, loc=loc))
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

