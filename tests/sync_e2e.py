# -*- coding: utf-8 -*-
"""Two open copies of the app must never save over each other's work.

    python tests/sync_e2e.py

Everything runs on this PC and touches nothing live: the app is served twice (two origins, so
two "devices" with their own browser storage), and the cloud is a fake held by this script -
the page's Supabase client is swapped for a stand-in that talks to it, and real Supabase is
blocked outright. Edge is headless with a throwaway profile and is always closed at the end.

What it proves (29 Sep 2026, a copied trade moved to its right account kept coming back):
- the three-way merge itself (__stMerge3), case by case;
- a stale DEVICE (its journal loaded before the fix) saving an unrelated change does not put
  the old trade, account mapping or BE threshold back - and picks the fix up itself;
- a stale TAB on the same browser takes the other tab's changes in within one save cycle;
- a reload afterwards shows the fixed journal;
- every inline script in app.html parses.
"""
import datetime
import functools
import http.server
import json
import os
import random
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import browser_test as bt   # noqa: E402

STATE = {'row': None, 'upserts': 0, 'last': None}
LOCK = threading.RLock()   # re-entrant: a write takes its stamp while holding it, as one step
UID = '00000000-0000-4000-8000-00000000e2e0'


def stamp():
    # Microsecond, strictly increasing, in the shape PostgREST returns.
    with LOCK:
        t = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
        if STATE['last'] and t <= STATE['last']:
            t = STATE['last'] + datetime.timedelta(microseconds=1)
        STATE['last'] = t
    return t.strftime('%Y-%m-%dT%H:%M:%S.%f') + '+00:00'


def set_row(data):
    row = {'user_id': UID, 'data': data, 'updated_at': stamp(), 'content_score': 5}
    with LOCK:
        STATE['row'] = row
    return row


class Fake(bt.Quiet):
    def _json(self, obj):
        body = json.dumps(obj).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.startswith('/__fake/row'):
            with LOCK:
                row = STATE['row']
                if os.environ.get('SYNC_DEBUG'):
                    print('  [get :%s] served %s' % (self.server.server_address[1], (row or {}).get('updated_at', '-')[11:26]), flush=True)
                return self._json(row)
        return super().do_GET()

    def do_POST(self):
        n = int(self.headers.get('Content-Length') or 0)
        body = json.loads(self.rfile.read(n) or b'null')
        if self.path.startswith('/__fake/update'):
            # A conditional update, as PostgREST does it: only when the row is still the expected version.
            p = body.get('payload') or {}
            with LOCK:   # the check and the write are one step, as in the database
                cur = STATE['row']
                if not cur or cur['updated_at'] != body.get('expect'):
                    return self._json(None)
                row = {'user_id': cur['user_id'], 'data': p.get('data'), 'updated_at': stamp(), 'content_score': p.get('content_score')}
                STATE['row'] = row
                STATE['upserts'] += 1
            if os.environ.get('SYNC_DEBUG'):
                sd = ((row.get('data') or {}).get('settings') or {})
                print('  [update :%s] %s (conditional) flags=%s' % (self.server.server_address[1], row['updated_at'][11:26],
                      ''.join(k[7:] + ',' for k in sorted(sd.keys()) if k.startswith('e2eFrom'))), flush=True)
            return self._json(row)
        if self.path.startswith('/__fake/upsert'):
            row = {'user_id': body.get('user_id'), 'data': body.get('data'), 'updated_at': stamp(),
                   'content_score': body.get('content_score')}
            with LOCK:
                STATE['row'] = row
                STATE['upserts'] += 1
                if os.environ.get('SYNC_DEBUG'):
                    d = row['data'] or {}
                    tr = {t.get('id'): t for t in ((d.get('review') or {}).get('trades') or [])}
                    print('  [upsert :%s] %s t2=%s t3=%s be10=%s clear=%s' % (self.server.server_address[1], row['updated_at'][11:26],
                          (tr.get('t2') or {}).get('accountId'), 't3' in tr,
                          [((a.get('riskRules') or {}).get('beThresholdAmount')) for a in d.get('accounts') or [] if a.get('id') == 'acc10'],
                          (d.get('_newDayCleared') or {}).get('at')) + ' flags=' + ''.join(k[7:] + ',' for k in sorted((d.get('settings') or {}).keys()) if k.startswith('e2eFrom')), flush=True)
            return self._json(row)
        self.send_response(404)
        self.end_headers()


# The page's Supabase client, replaced before any app script runs. Journals go to this script's
# fake cloud; the profile says paid; everything else resolves to nothing.
FAKE_JS = r"""(function () {
  if (window.__stSB) return;
  var USER = { id: '%s', email: 'e2e@example.test', user_metadata: {}, app_metadata: {} };
  var SESSION = { user: USER, access_token: 'fake', refresh_token: 'fake', expires_at: 4102444800, token_type: 'bearer' };
  try { localStorage.setItem('sb-figozyxoyobixadhqewr-auth-token', JSON.stringify(SESSION)); } catch (e) {}
  function http(method, url, body) {
    return fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' })
      .then(function (r) { return r.json(); });
  }
  function pick(row, cols) {
    if (!row) return null;
    if (!cols || cols === '*') return row;
    var out = {};
    cols.split(',').forEach(function (c) { c = c.trim(); if (Object.prototype.hasOwnProperty.call(row, c)) out[c] = row[c]; });
    return out;
  }
  function chain(table) {
    var st = { op: 'select', cols: '*', ret: null, payload: null, single: false, eq: {} };
    function run() {
      if (table === 'journals') {
        if (st.op === 'select') return http('GET', '/__fake/row').then(function (row) { return { data: st.single ? pick(row, st.cols) : (row ? [pick(row, st.cols)] : []), error: null }; });
        if (st.op === 'upsert') return http('POST', '/__fake/upsert', st.payload).then(function (row) { return { data: pick(row, st.ret || 'updated_at'), error: null }; });
        if (st.op === 'update') return http('POST', '/__fake/update', { payload: st.payload, expect: st.eq.updated_at }).then(function (row) { return { data: pick(row, st.ret || 'updated_at'), error: null }; });
      }
      if (table === 'profiles' && st.op === 'select') return Promise.resolve({ data: st.single ? { id: USER.id, is_paid: true, plan: 'bundle', status: 'active' } : [], error: null });
      return Promise.resolve({ data: st.single ? null : [], error: null });
    }
    var p = new Proxy({}, { get: function (t, k) {
      if (k === 'then') return function (a, b) { return run().then(a, b); };
      if (k === 'catch') return function (f) { return run().catch(f); };
      if (k === 'finally') return function (f) { return run().finally(f); };
      if (k === 'select') return function (c) { if (st.op === 'select') st.cols = c || '*'; else st.ret = c || '*'; return p; };
      if (k === 'upsert' || k === 'insert' || k === 'update') return function (v) { st.op = k; st.payload = v; return p; };
      if (k === 'delete') return function () { st.op = 'delete'; return p; };
      if (k === 'maybeSingle' || k === 'single') return function () { st.single = true; return p; };
      if (k === 'eq') return function (col, val) { st.eq[col] = val; return p; };
      if (typeof k === 'symbol') return undefined;
      return function () { return p; };
    } });
    return p;
  }
  function anything() {
    var p = new Proxy(function () {}, {
      get: function (t, k) {
        if (k === 'then') return function (a, b) { return Promise.resolve({ data: null, error: null }).then(a, b); };
        if (typeof k === 'symbol') return undefined;
        return function () { return p; };
      },
      apply: function () { return p; }
    });
    return p;
  }
  var auth = {
    getSession: function () { return Promise.resolve({ data: { session: SESSION }, error: null }); },
    getUser: function () { return Promise.resolve({ data: { user: USER }, error: null }); },
    refreshSession: function () { return Promise.resolve({ data: { session: SESSION }, error: null }); },
    onAuthStateChange: function (cb) { setTimeout(function () { try { cb('INITIAL_SESSION', SESSION); } catch (e) {} }, 30); return { data: { subscription: { unsubscribe: function () {} } } }; }
  };
  var authP = new Proxy(auth, { get: function (t, k) { if (k in t) return t[k]; if (typeof k === 'symbol') return undefined; return function () { return Promise.resolve({ data: {}, error: null }); }; } });
  var base = {
    auth: authP, from: chain, rpc: function () { return chain('__rpc'); },
    channel: function () { return anything(); }, removeChannel: function () { return Promise.resolve('ok'); },
    removeAllChannels: function () { return Promise.resolve([]); }, getChannels: function () { return []; },
    functions: { invoke: function () { return Promise.resolve({ data: null, error: null }); } },
    storage: anything()
  };
  window.__stSB = new Proxy(base, { get: function (t, k) { if (k in t) return t[k]; if (typeof k === 'symbol') return undefined; return anything(); } });
})();""" % UID


def trade(tid, acc, result, **kw):
    t = {'id': tid, 'accountId': acc, 'result': result, 'symbol': 'EUR/USD', 'side': 'Long', 'r': '5', 'risk': '500',
         'entryTime': '08:00', 'exitTime': '08:12', 'sl': '4', 'costs': '', 'execution': None, 'focus': None, 'close': None,
         'rice': [], 'concepts': [], 'mindset': [], 'tvLinks': [], 'reflection': ''}
    t.update(kw)
    return t


SEED = {
    'userName': 'E2E', '_tourDoneV1': True, '_sessionPrompted': True, '_riskRulesPrompted': True,
    'accounts': [
        {'id': 'acc70', 'name': 'FTMO 70K - Challenge', 'status': 'active', 'kind': 'challenge', 'accountType': 'personal',
         'startingBalance': 70000, 'balanceAtSetup': 70000, 'createdAt': '2026-08-25T07:36:21.174Z',
         'riskRules': {'maxTrades': 1, 'beThresholdMode': 'amount', 'beThresholdAmount': 200}},
        {'id': 'acc10', 'name': 'FTMO 10K - Challenge', 'status': 'active', 'kind': 'challenge', 'accountType': 'personal',
         'startingBalance': 10000, 'balanceAtSetup': 10000, 'createdAt': '2026-09-28T23:14:11.215Z',
         'riskRules': {'maxTrades': 1, 'beThresholdMode': 'amount', 'beThresholdAmount': 150}},
    ],
    'activeAccountId': 'acc70', 'viewScope': 'lifetime',
    'mt5LoginMap': {'541419576': 'acc70', '1514778904': 'acc70'},
    'mt5ImportedTickets': ['171267984', '552520521'],
    'review': {'trades': [
        trade('t1', 'acc70', 'Lose', mt5Ticket='171267984', ideaId='171267984'),
        trade('t2', 'acc70', 'BE', mt5Ticket='552520521', ideaId='171267984'),
        trade('t3', 'acc70', 'Win'),
    ]},
    'currentSeries': [], 'history': [],
}

UNIT_JS = r"""(() => {
  const M = window.__stMerge3, out = [];
  const ck = (name, ok, got) => out.push({ name, ok: !!ok, got });
  if (typeof M !== 'function') { ck('merge: __stMerge3 exists', false, typeof M); return JSON.stringify(out); }
  let r = M({ a: 1, b: 1 }, { a: 1, b: 1 }, { a: 2, b: 1 });
  ck('merge: a change made only on the other side is taken', r.a === 2 && r.b === 1, r);
  r = M({ a: 1, b: 1 }, { a: 3, b: 1 }, { a: 1, b: 2 });
  ck('merge: changes to different values on each side are both kept', r.a === 3 && r.b === 2, r);
  const T = (id, x) => Object.assign({ id }, x);
  const base = { trades: [T('t1', { acc: '70', res: 'Lose' }), T('t2', { acc: '70', res: 'BE' }), T('t3', { acc: '70' })] };
  const other = { trades: [T('t1', { acc: '70', res: 'Lose' }), T('t4', { acc: '10', res: 'Lose' })] };
  const local = { trades: [T('t1', { acc: '70', res: 'Lose', note: 'x' }), T('t2', { acc: '70', res: 'BE' }), T('t3', { acc: '70', edited: true })] };
  r = M(base, local, other);
  const ids = r.trades.map(t => t.id).join(',');
  ck('merge: a trade deleted on the other side stays deleted', ids.indexOf('t2') < 0, ids);
  ck('merge: a trade we edited survives the other side deleting it', ids.indexOf('t3') >= 0, ids);
  ck('merge: their new trade is kept, next to the trade it follows', ids === 't1,t4,t3', ids);
  ck('merge: our edit to a shared trade is kept', r.trades[0].note === 'x', r.trades[0]);
  r = M({ t: [T('a', { x: 1, y: 1 })] }, { t: [T('a', { x: 2, y: 1 })] }, { t: [T('a', { x: 1, y: 2 })] });
  ck('merge: the same trade edited in different fields keeps both', r.t[0].x === 2 && r.t[0].y === 2, r.t[0]);
  r = M({ k: [1, 2, 3] }, { k: [1, 2, 3, 4] }, { k: [2, 3, 5] });
  ck('merge: lists of plain values merge as sets', JSON.stringify(r.k) === '[2,3,4,5]', r.k);
  const conf = [];
  r = M({ v: 1 }, { v: 2 }, { v: 3 }, [], conf);
  ck('merge: a real clash keeps ours and reports where', r.v === 2 && conf.length === 1 && conf[0].path === 'v', conf);
  r = M({ a: 1, b: 1 }, { a: 1, b: 1, c: 1 }, { a: 1 });
  ck('merge: a key removed there and untouched here is removed', !('b' in r) && r.c === 1, r);
  r = M({ m: { '1514': '70' } }, { m: { '1514': '70' }, z: 1 }, { m: { '1514': '10' } });
  ck('merge: an account mapping changed there is taken', r.m['1514'] === '10' && r.z === 1, r);
  // Review slots carry no id: they are matched by session and pair, so a trade edit inside one slot
  // and a change to another slot on the other side both survive.
  const S = (sess, sym, trades, x) => Object.assign({ slotSession: sess, slotSymbol: sym, trades }, x || {});
  const sb0 = [S('London', 'EUR/USD', [T('t1', { acc: '70' })]), S('New York', 'EUR/USD', [])];
  const sl0 = [S('London', 'EUR/USD', [T('t1', { acc: '70' })]), S('New York', 'EUR/USD', [], { traded: 'No' })];
  const so0 = [S('London', 'EUR/USD', [T('t1', { acc: '10' })]), S('New York', 'EUR/USD', [])];
  r = M({ reviewSlots: sb0 }, { reviewSlots: sl0 }, { reviewSlots: so0 });
  ck('merge: review slots match by session and pair', r.reviewSlots.length === 2 && r.reviewSlots[0].trades[0].acc === '10' && r.reviewSlots[1].traded === 'No', r.reviewSlots);
  return JSON.stringify(out);
})()"""

PARSE_JS = r"""(async () => {
  const txt = await (await fetch('/app.html', { cache: 'no-store' })).text();
  const doc = new DOMParser().parseFromString(txt, 'text/html');
  const bad = []; let n = 0;
  doc.querySelectorAll('script').forEach((s, i) => {
    if (s.src) return;
    const ty = (s.type || '').toLowerCase();
    if (ty && ty !== 'text/javascript' && ty !== 'application/javascript') return;
    n++;
    try { new Function(s.textContent); } catch (e) { bad.push(i + ': ' + e.message); }
  });
  return JSON.stringify({ n, bad });
})()"""

READY_JS = r"""(() => { try {
  return !!(window.__stJournalPulled && typeof data !== 'undefined' && (data.accounts || []).some(a => a.id === 'acc10')
            && window.STCloud && STCloud.lastSeenUat && STCloud.lastSeenUat());
} catch (e) { return false; } })()"""

# Where things stand in a page's own memory.
PEEK_JS = r"""(() => { try {
  const all = [].concat((data.review && data.review.trades) || []);
  (data.reviewSlots || []).forEach(s => (s.trades || []).forEach(t => { if (!all.some(x => x.id === t.id)) all.push(t); }));
  const t = id => all.find(x => x.id === id) || null;
  const acc = id => (data.accounts || []).find(a => a.id === id) || {};
  return JSON.stringify({
    t2acc: t('t2') && t('t2').accountId, t2res: t('t2') && t('t2').result, hasT3: !!t('t3'), t1note: t('t1') && t('t1').reflection,
    be10: (acc('acc10').riskRules || {}).beThresholdAmount, map: (data.mt5LoginMap || {})['1514778904'],
    flagB: data.settings && data.settings.e2eFromB, flagA2: data.settings && data.settings.e2eFromA2, flagPhone: data.settings && data.settings.e2eFromPhone
  });
} catch (e) { return JSON.stringify({ err: String(e) }); } })()"""

FIX_JS = r"""(() => {
  const all = [].concat(data.review.trades);
  const t2 = all.find(x => x.id === 't2');
  t2.accountId = 'acc10'; t2.result = 'Lose';
  data.review.trades = data.review.trades.filter(x => x.id !== 't3');
  (data.reviewSlots || []).forEach(s => { if (s !== data.review) { s.trades = (s.trades || []).filter(x => x.id !== 't3'); } });
  data.accounts.find(a => a.id === 'acc10').riskRules.beThresholdAmount = 25;
  data.mt5LoginMap['1514778904'] = 'acc10';
  STCloud.save();
  return true;
})()"""


def row_peek():
    with LOCK:
        row = STATE['row']
        d = json.loads(json.dumps(row['data'])) if row else {}
    trades = list((d.get('review') or {}).get('trades') or [])
    for s in d.get('reviewSlots') or []:
        for t in s.get('trades') or []:
            if not any(x.get('id') == t.get('id') for x in trades):
                trades.append(t)
    t = {x.get('id'): x for x in trades}
    acc = {a.get('id'): a for a in d.get('accounts') or []}
    st = d.get('settings') or {}
    return {'t2acc': (t.get('t2') or {}).get('accountId'), 't2res': (t.get('t2') or {}).get('result'), 'hasT3': 't3' in t,
            't1note': (t.get('t1') or {}).get('reflection'),
            'be10': ((acc.get('acc10') or {}).get('riskRules') or {}).get('beThresholdAmount'),
            'map': (d.get('mt5LoginMap') or {}).get('1514778904'),
            'flagB': st.get('e2eFromB'), 'flagA2': st.get('e2eFromA2'), 'flagPhone': st.get('e2eFromPhone')}


FIXED = {'t2acc': 'acc10', 't2res': 'Lose', 'hasT3': False, 'be10': 25, 'map': 'acc10'}


def fixed(p):
    return all(p.get(k) == v for k, v in FIXED.items())


def main():
    edge = next((p for p in bt.EDGE_PATHS if os.path.exists(p)), None)
    if not edge:
        print('Microsoft Edge not found')
        return 2
    set_row(json.loads(json.dumps(SEED)))
    servers = []
    ports = []
    for _ in range(2):
        port = bt.free_port()
        httpd = http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(Fake, directory=bt.ROOT))
        threading.Thread(target=httpd.serve_forever, daemon=True).start()
        servers.append(httpd)
        ports.append(port)
    dbg = bt.free_port()
    prof = tempfile.mkdtemp(prefix='edgeprof_sync_')
    proc = subprocess.Popen([edge, '--headless=new', '--remote-debugging-port=%d' % dbg, '--user-data-dir=' + prof,
                             '--no-first-run', '--no-default-browser-check', '--window-size=1280,1000', 'about:blank'],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    results = []

    def check(name, ok, got=None):
        results.append({'name': name, 'ok': bool(ok), 'got': got})

    try:
        first = None
        for _ in range(80):
            try:
                tabs = json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dbg, timeout=2).read())
                pages = [t for t in tabs if t.get('type') == 'page']
                if pages:
                    first = pages[0]
                    break
            except Exception:
                pass
            time.sleep(0.25)
        if not first:
            print('Edge did not start')
            return 2

        def new_target():
            req = urllib.request.Request('http://127.0.0.1:%d/json/new?about:blank' % dbg, method='PUT')
            return json.loads(urllib.request.urlopen(req, timeout=5).read())

        def open_page(target, url):
            c = bt.CDP(target['webSocketDebuggerUrl'])
            c.call('Page.enable')
            c.call('Runtime.enable')
            c.call('Network.enable')
            # No service worker: it answers same-site downloads from its cache, and the fake cloud is same-site.
            c.call('Network.setBlockedURLs', urls=['*supabase.co*', '*/sw.js*'])
            c.call('Page.addScriptToEvaluateOnNewDocument', source=FAKE_JS)
            c.call('Page.navigate', url=url)
            return c

        def ev(c, js, tries=40):
            last = None
            for _ in range(tries):
                try:
                    return c.eval(js)
                except Exception as e:   # the page may be reloading (it adopts the cloud copy once)
                    last = e
                    time.sleep(0.25)
            raise last

        def act(c, js):
            # Whoever makes a change is the tab in front, as for a real person; the others go to the background.
            c.call('Page.bringToFront')
            if os.environ.get('SYNC_DEBUG'):
                print('  [step %s] %s' % (datetime.datetime.now().strftime('%H:%M:%S.%f')[:12], js[:70]), flush=True)
            return ev(c, js)

        def wait(c, js, secs=20):
            end = time.time() + secs
            while time.time() < end:
                try:
                    if c.eval(js):
                        return True
                except Exception:
                    pass
                time.sleep(0.25)
            return False

        def peek(c):
            return json.loads(ev(c, PEEK_JS))

        def wait_row(pred, secs=15):
            end = time.time() + secs
            while time.time() < end:
                p = row_peek()
                if pred(p):
                    return p
                time.sleep(0.25)
            return row_peek()

        app = os.environ.get('SYNC_APP', 'app.html')   # another file name runs the same checks against an older copy
        url1 = 'http://127.0.0.1:%d/%s?sync=%d' % (ports[0], app, random.randint(1, 10 ** 9))
        url2 = 'http://localhost:%d/%s?sync=%d' % (ports[1], app, random.randint(1, 10 ** 9))
        A = open_page(first, url1)                   # this PC, tab 1
        A2 = open_page(new_target(), url1)           # this PC, tab 2 (same browser storage as tab 1)
        B = open_page(new_target(), url2)            # "the phone": its own storage
        for name, c in (('tab 1', A), ('tab 2', A2), ('other device', B)):
            ok = wait(c, READY_JS, 40)
            check('setup: %s signed in and pulled the journal' % name, ok, None if ok else ev(c, 'document.title'))
            ev(c, bt.PRELUDE)
            if os.environ.get('SYNC_DEBUG'):
                ev(c, 'window.__stSyncVerbose = true')
        if not all(r['ok'] for r in results):
            raise SystemExit

        parse = json.loads(ev(A, PARSE_JS))
        check('every inline script in app.html parses', parse['n'] > 10 and not parse['bad'], parse)
        results.extend(json.loads(ev(A, UNIT_JS)))

        # 1. Tab 1 fixes the copied trade: moved to the 10K, a loss, BE threshold 25, login mapped, junk row deleted.
        act(A, FIX_JS)
        p = wait_row(fixed)
        check('tab 1: the fix reaches the cloud', fixed(p), p)

        # 2. The other device still holds the journal from before the fix and saves an unrelated change.
        pb = peek(B)
        check('other device: still holds the old journal before it saves', pb['t2acc'] == 'acc70', pb)
        act(B, "(() => { data.settings.e2eFromB = 'b'; STCloud.save(); return true; })()")
        p = wait_row(lambda p: p.get('flagB') == 'b')
        check('other device: its own change reaches the cloud', p.get('flagB') == 'b', p)
        check('other device: its save does not put the old trade, mapping or BE threshold back', fixed(p), p)
        ok = wait(B, "(() => { const t = [].concat(data.review.trades).find(x => x.id === 't2'); return !!t && t.accountId === 'acc10'; })()", 10)
        pb = peek(B)
        check('other device: picked the fix up itself', ok and fixed(pb), pb)

        # 3. Tab 2, same browser, never touched: within one save cycle it has the fix in memory.
        # (a hidden tab's timer can run as rarely as once a minute, so its save is called here rather than waited for)
        ok = wait(A2, "(() => { STCloud.save(); const t = [].concat(data.review.trades).find(x => x.id === 't2'); return !!t && t.accountId === 'acc10'; })()", 15)
        pa2 = peek(A2)
        check('tab 2: takes tab 1\'s fix in on its own next save', ok and fixed(pa2), pa2)

        # 4. Tab 2 writes a review note and a setting; tab 1 is not told. Both survive everywhere.
        act(A2, "(() => { const t = [].concat(data.review.trades).find(x => x.id === 't1'); t.reflection = 'from tab 2'; data.settings.e2eFromA2 = 'a2'; STCloud.save(); return true; })()")
        p = wait_row(lambda p: p.get('flagA2') == 'a2' and p.get('t1note') == 'from tab 2')
        check('tab 2: its note reaches the cloud and the fix stays', p.get('t1note') == 'from tab 2' and fixed(p), p)
        ok = wait(A, "(() => { STCloud.save(); return data.settings.e2eFromA2 === 'a2'; })()", 15)
        pa = peek(A)
        check('tab 1: has tab 2\'s note and setting, keeps its own fix', ok and pa.get('t1note') == 'from tab 2' and fixed(pa), pa)

        # 5. Another device writes straight to the cloud; tab 1 then saves something of its own.
        with LOCK:
            d = json.loads(json.dumps(STATE['row']['data']))
        d.setdefault('settings', {})['e2eFromPhone'] = 'p'
        set_row(d)
        if os.environ.get('SYNC_DEBUG'):
            print('  [step %s] another device wrote the cloud row' % datetime.datetime.now().strftime('%H:%M:%S.%f')[:12], flush=True)
        act(A, "(() => { data.settings.e2eFromA = 'a'; STCloud.save(); return true; })()")
        p = wait_row(lambda p: p.get('flagPhone') == 'p' and (STATE['row']['data'].get('settings') or {}).get('e2eFromA') == 'a')
        with LOCK:
            fa = (STATE['row']['data'].get('settings') or {}).get('e2eFromA')
        check('tab 1 after a write elsewhere: both changes are in the cloud', p.get('flagPhone') == 'p' and fa == 'a' and fixed(p), dict(p, fromA=fa))
        ok = wait(A, "(() => data.settings.e2eFromPhone === 'p')()", 10)
        check('tab 1: took the other write into its own memory', ok, peek(A))

        if os.environ.get('SYNC_DEBUG'):
            print('--- sync log, tab 1 before its reload:')
            for line in json.loads(A.eval('JSON.stringify(window.__stSyncLog || [])')):
                print('   ' + line)
        # 6. Reload tab 1: the fixed journal is what comes back.
        A.call('Page.reload', ignoreCache=True)
        time.sleep(1)
        ok = wait(A, READY_JS, 30)
        pa = peek(A) if ok else {}
        check('tab 1 after a reload: the fixed trade stays fixed', ok and fixed(pa) and pa.get('t1note') == 'from tab 2', pa)
        p = row_peek()
        check('cloud at the end: fixed, and every side\'s change kept', fixed(p) and p.get('flagB') == 'b' and p.get('flagA2') == 'a2' and p.get('flagPhone') == 'p', p)
    except SystemExit:
        pass
    finally:
        if os.environ.get('SYNC_DEBUG'):
            for name, c in (('tab 1', locals().get('A')), ('tab 2', locals().get('A2')), ('other device', locals().get('B'))):
                try:
                    print('--- sync log, %s:' % name)
                    for line in json.loads(c.eval('JSON.stringify(window.__stSyncLog || [])')):
                        print('   ' + line)
                except Exception as e:
                    print('   (no log: %s)' % e)
        try:
            subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            proc.kill()
        for s in servers:
            s.shutdown()
        time.sleep(0.5)
        shutil.rmtree(prof, ignore_errors=True)

    width = max([len(r['name']) for r in results] + [10])
    for r in results:
        got = '' if r['ok'] else '   got: ' + json.dumps(r.get('got'), ensure_ascii=False)[:500]
        print('%s  %s%s' % ('PASS' if r['ok'] else 'FAIL', r['name'].ljust(width), got))
    bad = [r for r in results if not r['ok']]
    print('\n%d checks, %d failed' % (len(results), len(bad)))
    return 1 if (bad or not results) else 0


if __name__ == '__main__':
    sys.exit(main())
