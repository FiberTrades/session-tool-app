# The rule study for any window he picks (7 Nov 2026, Nestor: "can i be able to change the sessions and times as i please in here?").
# hawk.py on uk1 runs it in its own process when the Hawk tab asks (hawk_study_req, through st-hawk); a year takes a few seconds.
# The same rules as the London and New York studies (his three phases on 4H / 1H / 15M, the 4H picks the side), entries in his window,
# the 24 h box to an hour before it, the hawk's red-news rule (no setup from 10 min before a red release to 5 after; an open trade out
# 10 min before the next one), else out by XM = 20:00 London (or an hour after a window ending past 19:00). Markets scaled by their
# London 08:00-10:00 move against EUR/USD's, as the London study. A year of 1-minute candles per market in ST_STUDY_DIR
# (<market>_m1.csv: utc,o,h,l,c) and the year's red releases in ST_STUDY_DIR/high_impact.json.
#   python3 study_run.py '{"sym": "EURUSD", "from": 540, "to": 660, "out": "/tmp/study.json"}'
import os, sys, json, bisect, statistics as stx, datetime as dt
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import engine as E
import hawk as HK
DIR = os.environ.get('ST_STUDY_DIR', '/opt/st/hawk/study')
NEWS_FILE = os.environ.get('ST_STUDY_NEWS', os.path.join(DIR, 'high_impact.json'))
MK = {'EURUSD': ('eurusd_m1.csv', 0.00006), 'GBPUSD': ('gbpusd_m1.csv', 0.00008), 'XAUUSD': ('xauusd_m1.csv', 0.30), 'US100.cash': ('us100_cash_m1.csv', 1.5)}
NAT = {'XAUUSD': ('$', 1.0, 2), 'US100.cash': (' points', 1.0, 2), 'GBPUSD': (' pips', 0.0001, 5), 'EURUSD': (' pips', 0.0001, 5)}
ALL = ('reaction', 'continuation', 'initiation')
RUN = {'EURUSD': 'strict_20', 'GBPUSD': 'strict_20:GBPUSD', 'XAUUSD': 'strict_20:XAUUSD', 'US100.cash': 'strict_20:US100.cash'}
def xm_of(to): return min(23 * 60 + 30, max(20 * 60, to + 60))   # hawk.js sXmOf - the same
def hhmm(m): return '%02d%02d' % (m // 60, m % 60)
def run_name(sym, f, t): return RUN[sym] + '@' + hhmm(f) + '-' + hhmm(t)
def ok_window(f, t): return isinstance(f, int) and isinstance(t, int) and 60 <= f < t <= 22 * 60 and 30 <= t - f <= 6 * 60 and f % 15 == 0 and t % 15 == 0
for k, v in dict(PHASES=True, LOC_24H=True, TF_RULE=False, INIT_1H=True, STOP_MAX=4.0, TP_LIQ=False, STOP_PAST=0.5, BOX_MAX=4.0, FIT_STOP=False, EXIT_NEWS=False, HTF_4H=True).items():
    setattr(E, k, v)

def load(fn):
    t, o, h, l, c = [], [], [], [], []
    for line in open(os.path.join(DIR, fn)):
        p = line.strip().split(',')
        if len(p) == 5: t.append(int(p[0])); o.append(float(p[1])); h.append(float(p[2])); l.append(float(p[3])); c.append(float(p[4]))
    E.load(t, o, h, l, c)
def win_range():
    by = {}
    for i in range(E.N):
        if E.WIN[0] <= E.LMIN[i] < E.WIN[1]:
            d = E.LDAY[i]; hh, ll = by.get(d, (E.H[i], E.L[i])); by[d] = (max(hh, E.H[i]), min(ll, E.L[i]))
    return stx.median([a - b for a, b in by.values()])
DIRW = {1: 'up', -1: 'down'}
def tf_line(tfs): return 'Timeframes: ' + ' · '.join('%s %s, %s' % (k.upper(), tfs[k]['said'], tfs[k]['loc']) for k in ('4h', '1h', '15m')) + '.'   # hawk.py's
def dis_said(x): return '4H and 15M disagree: the 4H points %s, the 15M %s.' % (DIRW[x[0]], DIRW[x[1]])

def study(SYM, F, T):
    assert SYM in MK and ok_window(F, T), (SYM, F, T)
    fn, COSTPX = MK[SYM]; XM = xm_of(T); W = [F, T]
    E.WIN = (8 * 60, 10 * 60)
    if SYM == 'EURUSD': eu = None
    else: E.PIP = 0.0001; load(MK['EURUSD'][0]); eu = win_range()   # EUR/USD's London move: the scale
    E.PIP = 0.0001; load(fn); rg = win_range(); eu = eu or rg
    E.WIN = (F, T)
    # the hawk's red-news rule for this market
    HK.CANON = 'US100' if SYM.startswith('US100') else SYM
    EV = json.load(open(NEWS_FILE, encoding='utf-8'))
    NEWS = sorted((int(dt.datetime.fromisoformat(e['at'].replace('Z', '+00:00')).timestamp()), e['currency'], e['title'], HK.talk(e['title']))
                  for e in EV if e.get('timed') and HK.counts(e['currency'], e['title']))
    def blocked(t): return next((x for x in NEWS if x[0] - HK.NEWS_BEFORE * 60 <= t <= x[0] + (x[3] + HK.NEWS_AFTER) * 60), None)
    def next_news(t): return next((x for x in NEWS if x[0] - HK.NEWS_BEFORE * 60 > t), None)
    scan0 = E.scan_day.__wrapped__ if hasattr(E.scan_day, '__wrapped__') else E.scan_day
    def scan_day(idx, opts):   # the hawk never alerts a setup inside a red release's window: it isn't taken and doesn't use a serve
        out, ph = scan0(idx, opts)
        return [q for q in out if not blocked(int(E.T[q['i']]) + 60)], ph
    scan_day.__wrapped__ = scan0; E.scan_day = scan_day
    CUT = {}
    def cut_of(j0):   # be out by: 10 min before the next red release after the entry, else XM London
        nx = next_news(int(E.T[j0])); d = E.LDAY[j0]
        c = nx[0] - HK.NEWS_BEFORE * 60 if nx else None
        if c is not None:
            k = bisect.bisect_left(E.T, c)
            if k >= E.N or E.LDAY[k] != d or E.LMIN[k] >= XM: c = None
        return c, nx
    def manage(j0, side, entry, stop, tgt, be_lvl):
        risk = abs(entry - stop); sl = stop; at_be = False; d = E.LDAY[j0]; c, nx = cut_of(j0); CUT[j0] = (c, nx)
        for j in range(j0, E.N):
            if E.LDAY[j] != d or E.LMIN[j] >= XM or (c is not None and E.T[j] >= c):
                px = E.O[j] if E.LDAY[j] == d else E.C[j - 1]
                return ((px - entry) * side / risk, 'be' if at_be and (px - entry) * side <= 0.2 * E.PIP else 'time', j)
            if side > 0:
                if E.L[j] <= sl: return ((sl - entry) / risk, 'be' if at_be else 'loss', j)
                if E.H[j] >= tgt: return ((tgt - entry) / risk, 'win', j)
                if not at_be and be_lvl is not None and E.H[j] > be_lvl: sl = entry; at_be = True
            else:
                if E.H[j] >= sl: return ((entry - sl) / risk, 'be' if at_be else 'loss', j)
                if E.L[j] <= tgt: return ((entry - tgt) / risk, 'win', j)
                if not at_be and be_lvl is not None and E.L[j] < be_lvl: sl = entry; at_be = True
        return (0, 'time', E.N - 1)
    E.manage = manage
    K = rg / eu; E.PIP = 0.0001 * K; COST = COSTPX / E.PIP
    nu, nunit, DP = NAT[SYM]
    nat = lambda d: ('$%.2f' % (abs(d) / nunit)) if nu == '$' else ('%.1f%s' % (abs(d) / nunit, nu))
    fp = lambda x: ('%.' + str(DP) + 'f') % x
    P = lambda x: None if x is None else round(float(x), DP + 1)
    bar = lambda ts: max(0, min(len(E.T) - 1, bisect.bisect_left(E.T, ts)))
    def lt(ts): i = bar(ts); return dt.datetime.fromtimestamp(ts + (E.LT[i] - E.T[i]), dt.timezone.utc).strftime('%H:%M')
    def liq_taken(tt):
        if not tt.get('ts') or tt['model'] == 'initiation pocket': return {}
        i = bar(int(tt['ts'])); w = range(max(0, i - 60), i)
        k = max(w, key=lambda j: E.H[j]) if tt['side'] < 0 else min(w, key=lambda j: E.L[j])
        return dict(lq=P(E.H[k] if tt['side'] < 0 else E.L[k]), lqt=int(E.T[k]))
    tr, daylog = E.run(dict(models=ALL, cost=COST)); st = E.stats(tr)
    rows = []
    for n, tt in enumerate(tr):
        side = tt['side']; buy = side > 0; rp = tt['risk']
        ent_ts = int(E.T[tt['i']]); ex_ts = int(E.T[tt['exit']]); ex_px = tt['entry'] + side * tt['R'] * rp * E.PIP
        bh, bl = tt['bh'], tt['bl']; mid = (bh + bl) / 2; tfs = tt['tfs']
        model = tt['model'].split(' · ')[-1]; rule = tt['model'].split(' · ')[0]
        hp = tfs['1h']['said']; tp_d = abs(tt['tgt'] - tt['entry'])
        Lw = ['HTF read before the session: the hour chart says %s. The 24 h range to %s %s-%s (%s), 50%% at %s.' % (hp, lt(tt['r1']), fp(bl), fp(bh), nat(bh - bl), fp(mid)),
              tf_line(tfs), E.htf_said(int(E.T[tt['i'] - 1]) + 60, tt['entry'], fp)]
        if model == 'initiation pocket':
            Lw.append('A 15-minute candle closed strongly %s the range at %s London: an initiation %s.' % ('above' if buy else 'below', lt(int(tt['ti']) + 60), 'up' if buy else 'down'))
            Lw.append('Entry on the pull back into the small pocket at the break (%s), stop %s past it.' % (fp(tt['edge']), nat(E.STOP_PAST * E.PIP)))
        else:
            Lw.append('At %s London price took the last hour\'s %s, extreme %s at %s, in %s.' % (lt(tt['ts']), 'low' if buy else 'high', fp(tt['A']), lt(tt['ta']), tt['loc']))
            if rule == 'range': Lw.append('Range rule: %s only from %s.' % ('buy' if buy else 'sell', 'discount' if buy else 'premium'))
            elif rule == 'initiation': Lw.append('Initiation rule: the hour chart broke %s strongly, so %s only, at the 50%% of a new leg.' % ('up' if buy else 'down', 'buys' if buy else 'sells'))
            elif rule == 'trend 50%': Lw.append('Trend rule: with the trend, at the 50% of the previous A-to-B leg.')
            else: Lw.append('Countertrend rule: back towards the 50%%, with %s of room.' % nat(20 * E.PIP))
            if model == 'reaction':
                Lw.append('Reaction: the first small candle (%s or less) after the extreme, no new extreme. Entry at its close, stop %s past the extreme.' % (nat(2 * E.PIP), nat(E.STOP_PAST * E.PIP)))
            else:
                Lw.append('Continuation: an aggressive leg of %s from the extreme to %s; limit at the small range near its 50%%, stop past that range.' % (nat(tt['B'] - tt['A']), fp(tt['B'])))
        if tt.get('tfx'): Lw.append(dis_said(tt['tfx']))
        Lw.append('%s %s, stop %s (%s), target %s (%s, %.1fR).' % ('Buy' if buy else 'Sell', fp(tt['entry']), fp(tt['stop']), nat(rp * E.PIP), fp(tt['tgt']), nat(tp_d), tp_d / (rp * E.PIP)))
        if tt.get('be') is not None: Lw.append('Break-even once price passes %s (the last 1m swing %s before the entry).' % (fp(tt['be']), 'high' if buy else 'low'))
        c_, nx_ = CUT.get(tt['i'], (None, None))
        if tt['out'] == 'time' and c_ is not None and ex_ts >= c_: res = 'Closed at %s London, 10 min before the red news (%s %s)' % (lt(ex_ts), nx_[1], nx_[2])
        elif tt['out'] == 'time': res = 'Closed at %s London' % lt(ex_ts)
        else: res = {'win': 'Target hit', 'loss': 'Stopped out', 'be': 'Closed at break-even'}[tt['out']]
        xm_ = (E.LMIN[bisect.bisect_left(E.T, c_)] if c_ is not None else XM)
        Lw.append(('%s: %+.2fR, %+.2fR after %s costs.' % (res, tt['R'], tt['net'], nat(COSTPX))) if res.startswith('Closed at') else ('%s at %s London: %+.2fR, %+.2fR after %s costs.' % (res, lt(ex_ts), tt['R'], tt['net'], nat(COSTPX))))
        if c_ is not None and tt['out'] != 'time': Lw.append('Red news %s %s at %s London: be out by %s.' % (nx_[1], nx_[2], lt(nx_[0]), lt(c_)))
        rows.append(dict(n=n + 1, day=tt['when'][:10], at=tt['when'][11:], side=side, model=model, rule=rule, phase=hp, loc=tt['loc'],
                         entry=P(tt['entry']), stop=P(tt['stop']), tgt=P(tt['tgt']), be=P(tt.get('be')), risk=round(rp, 2),
                         out=tt['out'], r=round(tt['R'], 3), net=round(tt['net'], 3),
                         ts=ent_ts, xts=ex_ts, xpx=P(ex_px), bh=P(bh), bl=P(bl), a=P(tt.get('A') if model != 'initiation pocket' else tt.get('edge')),
                         ta=int(tt['ta']) if tt.get('ta') else (int(tt['ti']) if tt.get('ti') else None), sw=int(tt['ts']) if tt.get('ts') else None,
                         leg=P(tt.get('B')), r0=tt['r0'], r1=tt['r1'], **liq_taken(tt),
                         tfs={k: dict(v) for k, v in tfs.items()}, tfx=list(tt['tfx']) if tt.get('tfx') else None, rules='phases+4h', htf=tt.get('htf'), win=W, xm=xm_, xn=('%s %s' % (nx_[1], nx_[2])) if c_ is not None else None,
                         sym=SYM, pip=E.PIP, nu=nu.strip(), nunit=nunit, dp=DP, note='\n'.join(Lw)))
    # What if: every candidate per day + the day's 1m path, ints of the market's own price tick (as bt/export_market.py)
    U = 10 ** -(DP + 1); Q = E.PIP / U
    I = lambda x: None if x is None else int(round(x / U))
    days = []; models = []
    for d, idx in sorted(E.sessions().items()):
        setups, ph = E.scan_day(idx, dict(models=ALL))
        if not setups: continue
        setups = sorted(setups, key=lambda q: q['i'])
        i0 = setups[0]['i']; dd = E.LDAY[i0]; base = I(E.O[i0]); bars = []; j = i0
        while j < E.N:
            if E.LDAY[j] != dd: bars += [9999, I(E.C[j - 1]) - base, 0, 0, 0]; break
            bars += [E.LMIN[j], I(E.O[j]) - base, I(E.H[j]) - base, I(E.L[j]) - base, I(E.C[j]) - base]
            if E.LMIN[j] >= XM: break
            j += 1
        cs = []
        for q in setups:
            if q['model'] not in models: models.append(q['model'])
            cont = 1 if ('continuation' in q['model'] or 'initiation' in q['model']) else 0
            cq = cut_of(q['i'])[0]
            cs.append([q['i'] - i0, q['side'], I(q['entry']), I(q['stop']), I(q['tgt']), I(q['be']), 1 if q['stopbar'] else 0, models.index(q['model']), cont, E.LMIN[bisect.bisect_left(E.T, cq)] if cq is not None else None])
        days.append(dict(day=dt.datetime.fromtimestamp(E.LT[i0], dt.timezone.utc).strftime('%Y-%m-%d'), d=dict(b=base, m=bars, c=cs, u=U, q=Q, k=round(COST, 3), sym=SYM, x=XM, w=W)))
    return dict(run=run_name(SYM, F, T), sym=SYM, w=W, xm=XM, n=st['n'], net=round(st['net'], 2), dd=round(st['dd'], 2), scale=round(K, 3), rows=rows, days=days)

if __name__ == '__main__':
    a = json.loads(sys.argv[1]); out = a.get('out')
    try: res = study(str(a['sym']), int(a['from']), int(a['to']))
    except Exception as e:
        res = dict(error=repr(e)[:300])
    s = json.dumps(res, separators=(',', ':'))
    if out:
        open(out + '.tmp', 'w').write(s); os.replace(out + '.tmp', out)
    else: print(s)
    print('study', a.get('sym'), a.get('from'), a.get('to'), res.get('n'), res.get('net'), res.get('error', ''), file=sys.stderr)
