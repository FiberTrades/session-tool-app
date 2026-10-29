# The candle store's stand-in for every test run (29 Oct 2026: the 07:45-08:30 UTC Supabase outage - st_candles 9-50 s, edge
# functions timing out - most likely came from parallel test runs reading the REAL candle RPCs). By default nothing a test starts
# reads the real candles any more:
# - in the page: every DevTools client (browser_test.CDP) puts SHIM_JS in a page before its first script; it answers st_candles,
#   st_candles_before and st_candle_symbols from this machine's test server (bt.Quiet: /__stcandles/...), never from Supabase;
# - in Python: urllib calls to those RPCs (a runner's stored_close) are answered here too (install(), from browser_test and lowprio).
# The answers come from tests/fixtures/candles: a small real sample, made once by tests/fixtures/make_candle_fixtures.py - for each
# symbol and timeframe some whole weeks of real candles. A time outside them is served from the same moment of the week inside
# them (time of week kept, so sessions and weekends stay where they are); a symbol without a sample is another one's, scaled to its
# price. ST_REAL_CANDLES=1 opts a run out (the real store - one run at a time, never in parallel).
import gzip, io, json, os, threading, urllib.parse, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
FIX = os.path.join(HERE, 'fixtures', 'candles')
WEEK = 7 * 86400
RPCS = ('st_candles_before', 'st_candles', 'st_candle_symbols')

def enabled():
    return os.environ.get('ST_REAL_CANDLES', '') != '1'

_lock = threading.Lock(); _cache = {}
def _meta():
    with _lock:
        if 'meta' not in _cache:
            try: _cache['meta'] = json.load(open(os.path.join(FIX, 'meta.json'), encoding='utf-8'))
            except Exception: _cache['meta'] = {'symbols': [], 'px': {}, 'fixtures': [], 'like': {}}
        return _cache['meta']
def _fix(sym):
    with _lock:
        if sym not in _cache:
            try: _cache[sym] = json.loads(gzip.open(os.path.join(FIX, sym.replace('/', '_') + '.json.gz'), 'rt', encoding='utf-8').read())
            except Exception: _cache[sym] = {}
        return _cache[sym]

def _source(sym):
    """(the sample's symbol, the price scale, its digits) for a symbol; None when the store has no such symbol"""
    m = _meta()
    if sym in m.get('fixtures', []): return sym, 1.0, None
    like = (m.get('like') or {}).get(sym)
    if not like: return None
    px, bpx = (m.get('px') or {}).get(sym), (m.get('px') or {}).get(like)
    k = (px / bpx) if (px and bpx) else 1.0
    dg = 2 if (px or 0) >= 1000 else (3 if (px or 0) >= 20 else 5)
    return like, k, dg

def _series(sym, tf, frm, to):
    """the sample's candles between frm and to (unix s, both included), each moment outside its weeks taken from the same moment of
    the week inside them"""
    src = _source(sym)
    if not src: return []
    base, k, dg = src
    e = _fix(base).get(str(int(tf)))
    if not e or not e.get('rows'): return []
    w0, L, rows = int(e['w0']), int(e['weeks']) * WEEK, e['rows']
    ts = [r[0] for r in rows]
    out = []
    a = int(frm)
    import bisect
    while a <= to:
        seg0 = w0 + ((a - w0) // L) * L            # the copy of the sample this moment falls in
        b = min(int(to), seg0 + L - 1); sh = seg0 - w0
        i = bisect.bisect_left(ts, a - sh); j = bisect.bisect_right(ts, b - sh)
        for r in rows[i:j]:
            t, o, h, l, c = r[0] + sh, r[1], r[2], r[3], r[4]
            if k != 1.0: o, h, l, c = (round(v * k, dg) for v in (o, h, l, c))
            out.append({'t': t, 'o': o, 'h': h, 'l': l, 'c': c, 'v': r[5] if len(r) > 5 else None})
        a = b + 1
    return out

def candles(sym, tf, frm, to, offset=0, limit=1000):
    return _series(sym, tf, frm, to)[int(offset):int(offset) + min(int(limit), 1000)]

def candles_before(sym, tf, before, n):
    n = max(1, min(int(n or 1), 1000)); span = max(int(tf), 1) * 60 * n * 3
    for _ in range(6):
        rows = _series(sym, tf, int(before) - span, int(before) - 1)
        if len(rows) >= n: break
        span *= 3
    return rows[-n:]

def symbols():
    return _meta().get('symbols', [])

def answer(fn, args, offset=0, limit=1000):
    """what the store would answer this RPC (the rows, as PostgREST sends them)"""
    if fn == 'st_candle_symbols': return symbols()
    if fn == 'st_candles': return candles(args.get('p_symbol', ''), args.get('p_tf', 1), args.get('p_from', 0), args.get('p_to', 0), offset, limit)
    if fn == 'st_candles_before': return candles_before(args.get('p_symbol', ''), args.get('p_tf', 1), args.get('p_before', 0), args.get('p_n', 1))
    return []

def handle(handler):
    """bt.Quiet: GET /__stcandles/<rpc>?offset=&limit=&a=<its args as JSON> -> the rows as JSON; True when it was one"""
    u = urllib.parse.urlsplit(handler.path)
    if not u.path.startswith('/__stcandles/'): return False
    q = dict(urllib.parse.parse_qsl(u.query)); fn = u.path.rsplit('/', 1)[-1]
    try: args = json.loads(q.get('a') or '{}')
    except Exception: args = {}
    body = json.dumps(answer(fn, args, int(q.get('offset') or 0), int(q.get('limit') or 1000))).encode()
    handler.send_response(200); handler.send_header('Content-Type', 'application/json'); handler.send_header('Content-Length', str(len(body)))
    handler.end_headers(); handler.wfile.write(body)
    return True

# in the page, before its first script: the three candle RPCs go to this machine's test server, never to Supabase
SHIM_JS = r"""(function () {
  if (window.__stCandleStub) return;
  var RX = /\/rest\/v1\/rpc\/(st_candles_before|st_candles|st_candle_symbols)(?:\?|$)/, real = window.fetch, S = window.__stCandleStub = { n: 0 };
  var json = function (t) { return new Response(t, { status: 200, headers: { 'Content-Type': 'application/json' } }); };
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : ((input && input.url) || String(input || '')), m = RX.exec(url);
    if (!m) return real.apply(this, arguments);
    S.n++;
    var args = {}; try { if (init && typeof init.body === 'string') args = JSON.parse(init.body); } catch (e) {}
    var qs = ''; try { var u = new URL(url, location.href); ['offset', 'limit'].forEach(function (k) { if (u.searchParams.has(k)) qs += '&' + k + '=' + encodeURIComponent(u.searchParams.get(k)); }); } catch (e) {}
    if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(location.origin)) return Promise.resolve(json('[]'));   // not the test server: nothing, never the real store
    return real.call(window, location.origin + '/__stcandles/' + m[1] + '?a=' + encodeURIComponent(JSON.stringify(args)) + qs)
      .then(function (r) { return r.ok ? r.text().then(json) : json('[]'); }, function () { return json('[]'); });
  };
})();"""

class _Resp(io.BytesIO):
    status = 200
    def getcode(self): return 200
    def __enter__(self): return self
    def __exit__(self, *a): self.close()
    def info(self): return {}

_real_urlopen = urllib.request.urlopen
def _urlopen(req, *a, **kw):
    url = req.full_url if isinstance(req, urllib.request.Request) else str(req)
    for fn in RPCS:
        if '/rest/v1/rpc/' + fn in url:
            try: args = json.loads((req.data or b'{}').decode()) if isinstance(req, urllib.request.Request) else {}
            except Exception: args = {}
            return _Resp(json.dumps(answer(fn, args)).encode())
    return _real_urlopen(req, *a, **kw)

def install():
    """a runner's own urllib calls to the candle RPCs answered from the sample (unless ST_REAL_CANDLES=1)"""
    if enabled() and urllib.request.urlopen is not _urlopen:
        urllib.request.urlopen = _urlopen
