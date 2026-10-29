# Makes tests/fixtures/candles (29 Oct 2026): the small real sample the tests' candle stand-in (tests/candle_stub.py) serves, so no
# test reads the real candle store. Run once, by hand, alone (it reads the real store: about 150 small reads, one at a time):
#   python tests/fixtures/make_candle_fixtures.py
# For each sampled symbol and timeframe, whole weeks (Saturday 00:00 UTC to Saturday) of its stored candles: 1m the week of the tests'
# usual moment (Wed 14 Oct 2026 08:30 UTC, or the nearest week it has), 5m three weeks, 15m five, 1h 19, 4h two years, 1D ten years.
# The other symbols in the store are served from a sampled one of their kind, scaled to their price (meta.json: like, px).
import calendar, gzip, json, os, sys, time, urllib.request
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'candles')
URL, KEY = 'https://figozyxoyobixadhqewr.supabase.co/rest/v1/rpc/', 'sb_publishable_h-TrkkVzrGOkwX6LxMDsaQ_hE8540Nv'
WEEK = 7 * 86400
SAMPLED = ['EURUSD', 'XAUUSD', 'GBPUSD', 'USDJPY', 'US100.cash', 'BTCUSD']
LIKE = {'AUDUSD': 'EURUSD', 'NZDUSD': 'EURUSD', 'USDCAD': 'EURUSD', 'EURJPY': 'USDJPY', 'DXY.cash': 'EURUSD'}
END_LO = calendar.timegm((2026, 10, 17, 0, 0, 0))   # Saturday after the tests' Wed 14 Oct 2026
END_HI = calendar.timegm((2026, 10, 24, 0, 0, 0))
WANT = {1: (END_LO, 1), 5: (END_LO, 3), 15: (END_LO, 5), 60: (END_HI, 19), 240: (END_HI, 104), 1440: (END_HI, 522)}
def rpc(fn, args, rng=None):
    req = urllib.request.Request(URL + fn + (('?offset=%d&limit=%d' % rng) if rng else ''), method='POST', data=json.dumps(args).encode(),
                                 headers={'apikey': KEY, 'Content-Type': 'application/json'})
    for k in range(4):
        try: return json.loads(urllib.request.urlopen(req, timeout=60).read())
        except Exception as e:
            print('  retry', fn, e); time.sleep(3 * (k + 1))
    raise SystemExit('the store did not answer')
def sat(t): return t - ((t // 86400 + 5) % 7) * 86400 - t % 86400   # the Saturday 00:00 UTC on or before t (1 Jan 1970 was a Thursday)
os.makedirs(OUT, exist_ok=True)
syms = rpc('st_candle_symbols', {}); time.sleep(0.3)
cov = {}
for r in syms: cov.setdefault(r['symbol'], {})[int(r['tf'])] = (int(r['first_t']), int(r['last_t']))
px = {}
for s in sorted(cov):
    tf = 1440 if 1440 in cov[s] else max(cov[s])
    rows = rpc('st_candles', {'p_symbol': s, 'p_tf': tf, 'p_from': END_HI - (14 if tf >= 1440 else 2) * 86400, 'p_to': END_HI}); time.sleep(0.3)   # (st_candles_before is for members only)
    if rows: px[s] = rows[-1]['c']
for s in SAMPLED:
    if s not in cov: print('not in the store:', s); continue
    out = {}
    for tf, (end, weeks) in WANT.items():
        if tf not in cov[s]: continue
        f0, f1 = cov[s][tf]
        e = min(end, sat(f1)); b = max(e - weeks * WEEK, sat(f0) + (WEEK if sat(f0) < f0 else 0))
        if e - b < WEEK:   # the wanted weeks not stored: the week of its latest candle
            b = sat(f1); e = b + WEEK
            if e > time.time(): b -= WEEK; e -= WEEK
            if e <= f0: continue
        n = (e - b) // WEEK; rows, pg = [], 0
        while True:
            part = rpc('st_candles', {'p_symbol': s, 'p_tf': tf, 'p_from': b, 'p_to': e - 1}, (pg * 1000, 1000)); time.sleep(0.25)
            rows += part; pg += 1
            if len(part) < 1000: break
        out[str(tf)] = {'w0': b, 'weeks': n, 'rows': [[r['t'], r['o'], r['h'], r['l'], r['c']] + ([r['v']] if r.get('v') is not None else []) for r in rows]}
        print(s, tf, time.strftime('%Y-%m-%d', time.gmtime(b)), n, 'weeks', len(rows), 'candles'); sys.stdout.flush()
    with gzip.open(os.path.join(OUT, s.replace('/', '_') + '.json.gz'), 'wt', encoding='utf-8') as g: json.dump(out, g, separators=(',', ':'))
json.dump({'made': time.strftime('%Y-%m-%d %H:%M UTC', time.gmtime()), 'symbols': syms, 'px': px, 'fixtures': [s for s in SAMPLED if s in cov],
           'like': {s: LIKE.get(s) or ('US100.cash' if '.cash' in s or s[:2] in ('US', 'DE', 'UK', 'JP') else 'EURUSD') for s in cov if s not in SAMPLED}},
          open(os.path.join(OUT, 'meta.json'), 'w', encoding='utf-8'), indent=1)
print('done:', OUT)
