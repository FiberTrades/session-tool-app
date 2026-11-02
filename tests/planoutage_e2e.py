# -*- coding: utf-8 -*-
"""The plan and the sign-in kept through a Supabase outage (29 Oct 2026).

    python tests/planoutage_e2e.py

During the outage (Disk IO budget exhausted: profiles and auth answering 522) Nestor's app hid the Charts and Community
tabs and the FULL ACCESS badge, as if he had lost his plan: the session could not be refreshed, so the app took him for
signed out, and the plan read failed. Now the last known plan is kept per member on the device, a session the server could
not refresh keeps him signed in, both are asked for again in the background, and only a real answer saying "no plan"
changes the plan.

Everything runs on this PC and touches nothing live: real Supabase is blocked outright and the page's client is a stand-in
whose answers this script switches - healthy, down (522s: no session to hand out, the profile read failing), a profile read
that never answers, and a healthy "no plan". Edge is headless with a throwaway profile and is always closed at the end.
"""
import functools
import http.server
import json
import os
import shutil
import select
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import browser_test as bt   # noqa: E402
import faulthandler   # noqa: E402
faulthandler.cancel_dump_traceback_later()   # the harness's 4-minute watchdog: this test waits out real retry timers (about 3 minutes)

UID = '00000000-0000-4000-8000-00000000e2e7'
SEED = {'userName': 'E2E', '_tourDoneV1': True, '_sessionPrompted': True, '_riskRulesPrompted': True,
        'accounts': [{'id': 'acc1', 'name': 'FTMO 70K - Challenge', 'status': 'active', 'kind': 'challenge', 'accountType': 'personal',
                      'startingBalance': 70000, 'balanceAtSetup': 70000, 'createdAt': '2026-08-25T07:36:21.174Z'}],
        'activeAccountId': 'acc1', 'viewScope': 'lifetime', 'review': {'trades': []}, 'currentSeries': [], 'history': []}

# The page's Supabase client, in place before any app script runs. localStorage '__e2eMode' says how the "server" answers:
#   ok      - signed in, the profile a paid Journal Pro plan
#   down    - 522s: the session cannot be refreshed (supabase-js keeps it, hands none out), every read fails
#   hang    - signed in, the profile read never answers
#   noplan  - signed in, the profile answers: not paid, no plan, signed up long ago (the trial over)
FAKE_JS = r"""(function () {
  if (window.__stSB) return;
  var USER = { id: '%s', email: 'e2e@example.test', user_metadata: {}, app_metadata: {} };
  var SESSION = { user: USER, access_token: 'fake', refresh_token: 'fake', expires_at: 4102444800, token_type: 'bearer' };
  var SEED = %s;
  var ROW = { data: SEED, updated_at: '2026-10-29T08:00:00.000000+00:00' };
  try { if (!localStorage.getItem('__e2eNoSeed') && !localStorage.getItem('sb-figozyxoyobixadhqewr-auth-token')) localStorage.setItem('sb-figozyxoyobixadhqewr-auth-token', JSON.stringify(SESSION)); } catch (e) {}   // signed in on this device (unless the test says not)
  var mode = function () { try { return localStorage.getItem('__e2eMode') || 'ok'; } catch (e) { return 'ok'; } };
  window.__e2eProf = 0; window.__e2eSess = 0;
  var ERR = { message: 'HTTP 522', code: '', details: '', hint: '' };
  function chain(table) {
    var st = { op: 'select', single: false };
    function run() {
      var m = mode();
      if (table === 'profiles' && st.op === 'select') { window.__e2eProf++;
        if (m === 'down') return Promise.resolve({ data: null, error: ERR, status: 522 });
        if (m === 'hang') return new Promise(function () {});
        if (m === 'noplan') return Promise.resolve({ data: { id: USER.id, is_paid: false, plan: null, status: null, created_at: '2026-01-01T00:00:00Z' }, error: null });
        return Promise.resolve({ data: { id: USER.id, is_paid: true, plan: 'bundle', status: 'active', created_at: '2026-01-01T00:00:00Z', current_period_end: '2026-12-01T00:00:00Z' }, error: null }); }
      if (m === 'down') return Promise.resolve({ data: null, error: ERR, status: 522 });
      if (table === 'journals' && st.op === 'select') return Promise.resolve({ data: st.single ? { user_id: USER.id, data: ROW.data, updated_at: ROW.updated_at, content_score: 5 } : [], error: null });
      // a write is taken, as the real table takes it. (This used to answer "no row" to everything, instantly: the journal's guarded write reads that as
      // "refused, the cloud moved on", merges and writes again - with an answer that never waits, for ever, in promises alone, so the page never got to
      // anything else. That was the hang of the "back" and "no plan" checks: the stand-in's, not the app's.)
      if (table === 'journals' && (st.op === 'update' || st.op === 'upsert')) { if (st.val && st.val.updated_at) { ROW.updated_at = st.val.updated_at; if (st.val.data) ROW.data = st.val.data; } return Promise.resolve({ data: st.single ? { updated_at: ROW.updated_at } : [], error: null }); }
      return Promise.resolve({ data: st.single ? null : [], error: null });
    }
    var p = new Proxy({}, { get: function (t, k) {
      if (k === 'then') return function (a, b) { return run().then(a, b); };
      if (k === 'catch') return function (f) { return run().catch(f); };
      if (k === 'finally') return function (f) { return run().finally(f); };
      if (k === 'upsert' || k === 'insert' || k === 'update' || k === 'delete') return function (v) { st.op = k; st.val = v; return p; };
      if (k === 'maybeSingle' || k === 'single') return function () { st.single = true; return p; };
      if (typeof k === 'symbol') return undefined;
      return function () { return p; };
    } });
    return p;
  }
  function anything() {
    var p = new Proxy(function () {}, { get: function (t, k) {
        if (k === 'then') return function (a, b) { return Promise.resolve({ data: null, error: null }).then(a, b); };
        if (typeof k === 'symbol') return undefined;
        return function () { return p; }; }, apply: function () { return p; } });
    return p;
  }
  var RETRY = { name: 'AuthRetryableFetchError', status: 522, message: 'HTTP 522' };
  var auth = {
    getSession: function () { window.__e2eSess++; return Promise.resolve(mode() === 'down' ? { data: { session: null }, error: RETRY } : { data: { session: SESSION }, error: null }); },
    getUser: function () { return Promise.resolve(mode() === 'down' ? { data: { user: null }, error: RETRY } : { data: { user: USER }, error: null }); },
    refreshSession: function () { return Promise.resolve({ data: { session: mode() === 'down' ? null : SESSION }, error: mode() === 'down' ? RETRY : null }); },
    onAuthStateChange: function (cb) { setTimeout(function () { try { cb('INITIAL_SESSION', mode() === 'down' ? null : SESSION); } catch (e) {} }, 30); return { data: { subscription: { unsubscribe: function () {} } } }; }
  };
  var authP = new Proxy(auth, { get: function (t, k) { if (k in t) return t[k]; if (typeof k === 'symbol') return undefined; return function () { return Promise.resolve({ data: {}, error: null }); }; } });
  var base = { auth: authP, from: chain, rpc: function () { return chain('__rpc'); },
    channel: function () { return anything(); }, removeChannel: function () { return Promise.resolve('ok'); }, removeAllChannels: function () { return Promise.resolve([]); }, getChannels: function () { return []; },
    functions: { invoke: function () { return Promise.resolve({ data: null, error: null }); } }, storage: anything() };
  window.__stSB = new Proxy(base, { get: function (t, k) { if (k in t) return t[k]; if (typeof k === 'symbol') return undefined; return anything(); } });
})();""" % (UID, json.dumps(SEED))

STATE_JS = r"""(() => { const b = document.getElementById('plan-badge'), ct = document.querySelector('.tab-community'), lc = document.querySelector('.tab[data-page="livecharts"]');
  let cache = null; try { cache = JSON.parse(localStorage.getItem('st_plan_%s') || 'null'); } catch (e) {}
  return JSON.stringify({ badge: b && b.style.display !== 'none' ? b.textContent.trim() : null, paid: document.documentElement.classList.contains('st-paid'),
    charts: !!lc && getComputedStyle(lc).display !== 'none', community: !!ct && getComputedStyle(ct).display !== 'none',
    gates: document.querySelectorAll('.stc-gate.open').length, away: !!window.__stAuthAway, user: !!(window.currentUser && window.currentUser.id),
    plan: window.__stPlan ? window.__stPlan() : null, prof: window.__e2eProf, sess: window.__e2eSess, cache: cache && { paid: cache.is_paid, plan: cache.plan } }); })()""" % UID


def main():
    edge = next((p for p in bt.EDGE_PATHS if os.path.exists(p)), None)
    if not edge:
        print('Microsoft Edge not found')
        return 2
    port = bt.free_port()
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(bt.Quiet, directory=bt.ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    prof = tempfile.mkdtemp(prefix='edgeprof_planoutage_')
    url = 'http://127.0.0.1:%d/app.html?planoutage=1' % port
    results = []
    cur = {'c': None, 'proc': None, 'dbg': None}

    def check(name, ok, got=None):
        results.append({'name': name, 'ok': bool(ok), 'got': got})
        if os.environ.get('PO_DEBUG'):
            print(('PASS  ' if ok else 'FAIL  ') + name, json.dumps(got)[:300], flush=True)

    # Each page load in a browser of its own on the same profile - a reload, as after the app is opened again: a second
    # navigation of the app's tab, or a second tab, can stall headless Edge (on main too). The browser is closed properly
    # between loads, so this device's storage (the kept plan, the session) is there for the next one.
    def stop():
        if not cur['proc']:
            return
        try:
            ver = json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/version' % cur['dbg'], timeout=3).read())
            b = bt.CDP(ver['webSocketDebuggerUrl'])
            b._send({'id': 1, 'method': 'Browser.close'})
        except Exception:
            pass
        try:
            cur['proc'].wait(timeout=15)
        except Exception:
            subprocess.run(['taskkill', '/PID', str(cur['proc'].pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        cur['proc'] = None; cur['c'] = None

    def load(pre=''):
        stop()
        cur['dbg'] = bt.free_port()
        cur['proc'] = bt.edge_popen([edge, '--headless=new', '--remote-debugging-port=%d' % cur['dbg'], '--user-data-dir=' + prof, '--no-first-run',
                                     '--no-default-browser-check', '--window-size=1280,1000', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        first = None
        for _ in range(80):
            try:
                pages = [t for t in json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % cur['dbg'], timeout=2).read()) if t.get('type') == 'page']
                if pages:
                    first = pages[0]
                    break
            except Exception:
                pass
            time.sleep(0.25)
        cc = bt.CDP(first['webSocketDebuggerUrl'])
        cc.call('Page.enable'); cc.call('Runtime.enable'); cc.call('Network.enable')
        cc.call('Network.setBlockedURLs', urls=['*supabase.co*', '*/sw.js*', '*twemoji*', '*cdn.jsdelivr.net*', '*cdnjs.cloudflare.com*', '*unpkg.com*', '*giphy*', '*tenor*', '*fonts.g*'])   # nothing reaches the real Supabase; the chat's
        # ~870 emoji pictures (from a CDN, once a member is known) would keep a headless page busy for a long while
        cc.call('Page.addScriptToEvaluateOnNewDocument', source=pre + FAKE_JS)
        cc.call('Page.navigate', url=url)
        cur['c'] = cc
        time.sleep(3)
        try:
            c.eval(bt.PRELUDE)
        except Exception:
            pass

    def mode(m):
        return "try { localStorage.setItem('__e2eMode', %s); } catch (e) {}\n" % json.dumps(m)

    class Cur(object):
        # an answer within 20 s, or an error: a page that stops answering never stalls the test
        def eval(self, js):
            cc = cur['c']; cc.id += 1; want = cc.id
            cc._send({'id': want, 'method': 'Runtime.evaluate', 'params': {'expression': js, 'awaitPromise': True, 'returnByValue': True}})
            end = time.time() + 20
            while time.time() < end:
                if not cc.buf and not select.select([cc.s], [], [], 1.0)[0]:
                    continue   # nothing yet (a whole message is read once one starts: a timeout part-way would split it)
                m = cc._recv()
                if m.get('id') == want:
                    r = m.get('result') or {}
                    if 'exceptionDetails' in r:
                        raise RuntimeError(str(r['exceptionDetails'])[:200])
                    return (r.get('result') or {}).get('value')
            if os.environ.get('PO_DEBUG') and not cur.get('sampled'):
                cur['sampled'] = 1
                cc.id += 1; cc._send({'id': cc.id, 'method': 'Debugger.enable'}); cc.id += 1; cc._send({'id': cc.id, 'method': 'Debugger.pause'}); e2 = time.time() + 15
                while time.time() < e2:
                    if not cc.buf and not select.select([cc.s], [], [], 1.0)[0]:
                        continue
                    m = cc._recv()
                    if m.get('method') == 'Debugger.paused':
                        print('  busy page at:', ' | '.join('%s:%s' % (f.get('functionName'), f['location'].get('lineNumber')) for f in m['params']['callFrames'][:14]), flush=True); break
                else:
                    print('  busy page: no pause in 15 s (not running script)', flush=True)
                cc.id += 1; cc._send({'id': cc.id, 'method': 'Debugger.resume'})
            raise RuntimeError('no answer in 20 s')
    c = Cur()

    def st():
        for _ in range(6):
            try:
                return json.loads(c.eval(STATE_JS))
            except Exception:
                time.sleep(0.5)
        return {}

    def until(pred, secs):
        end = time.time() + secs
        s = st()
        while time.time() < end and not pred(s):
            time.sleep(0.5)
            s = st()
        return s

    try:
        # healthy first: the plan read and kept on the device
        load(mode('ok'))
        s = until(lambda s: s.get('badge') and s.get('cache') and s.get('charts'), 30)
        check('healthy: signed in, the badge says Journal Pro, Charts and Community there', s.get('user') and s.get('badge') == 'Journal Pro' and s.get('paid') and s.get('charts') and s.get('community') and not s.get('gates'), s)
        check('...the plan kept on this device for this member', s.get('cache') == {'paid': True, 'plan': 'bundle'}, s.get('cache'))

        # Supabase down: no session to hand out, the profile read failing - still signed in, the plan as it was
        load(mode('down'))
        s = until(lambda s: s.get('badge') and s.get('charts') and s.get('community'), 15)
        check('down: still signed in (the session the server could not refresh), no sign-in screen, no paywall', s.get('user') and s.get('away') and not s.get('gates'), s)
        check('...the badge still says Journal Pro, Charts and Community still there, paid features on', s.get('badge') == 'Journal Pro' and s.get('paid') and s.get('charts') and s.get('community') and (s.get('plan') or {}).get('paid') is True, s)
        p0 = s.get('prof', 0)
        s = until(lambda s: s.get('prof', 0) > p0, 25)
        check('...the plan asked for again in the background (15 s later)', s.get('prof', 0) > p0 and s.get('badge') == 'Journal Pro', [p0, s.get('prof')])
        # the server back, no reload: the session handed out again, the plan read again
        c.eval("(() => { localStorage.setItem('__e2eMode', 'ok'); return true; })()")
        p1 = s.get('prof', 0)
        s = until(lambda s: not s.get('away') and s.get('prof', 0) > p1, 50)
        check('back: the session taken up again in the background, the plan read again, nothing changed on screen', not s.get('away') and s.get('prof', 0) > p1 and s.get('badge') == 'Journal Pro' and s.get('charts') and s.get('community') and not s.get('gates'), s)

        # a profile read that never answers: the plan kept, asked again
        load(mode('hang'))
        s = until(lambda s: s.get('prof', 0) >= 2, 35)
        check('a profile read that hangs: the plan as it was, asked again after 12 s', s.get('badge') == 'Journal Pro' and s.get('paid') and s.get('charts') and s.get('community') and s.get('prof', 0) >= 2, s)

        # only a real answer changes the plan
        load(mode('noplan'))
        s = until(lambda s: s.get('cache') == {'paid': False, 'plan': None}, 20)
        check('a real answer saying no plan: the plan changes (the trial over: the paywall), and that is what is kept', s.get('cache') == {'paid': False, 'plan': None} and not s.get('paid') and s.get('gates') == 1 and (s.get('plan') or {}).get('paid') is False, s)
        load(mode('down'))
        s = until(lambda s: s.get('user'), 15)
        check('...down after that: the kept plan is that answer (no plan comes back from the outage)', s.get('user') and not s.get('paid') and (s.get('plan') or {}).get('paid') is False, s)

        # signed out for real (nothing on the device): the sign-in screen
        load(mode('down') + "try { localStorage.removeItem('sb-figozyxoyobixadhqewr-auth-token'); localStorage.setItem('__e2eNoSeed', '1'); } catch (e) {};")
        s = until(lambda s: s.get('gates'), 15)
        check('signed out for real (no session on this device), the server down: the sign-in screen, nothing kept signed in', not s.get('user') and not s.get('away') and s.get('gates', 0) >= 1, s)
    finally:
        stop()
        bt.kill_profile(prof)
        httpd.shutdown()
        shutil.rmtree(prof, ignore_errors=True)
    for r in results:
        print(('PASS  ' if r['ok'] else 'FAIL  ') + r['name'] + ('' if r['ok'] else '   got: ' + json.dumps(r['got'])[:600]))
    bad = [r for r in results if not r['ok']]
    print('\n%d checks, %d failed' % (len(results), len(bad)))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
