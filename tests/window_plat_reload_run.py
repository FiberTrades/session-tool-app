"""Reloads with charts out in windows of their own (Nestor, 27 Oct 2026, the main window and two chart windows - EURUSD 1h and 15m - then
a reload: "why did this happened when i reloaded the charts? this is a bug, fix it!" - the main window's layout had taken those charts too,
1m + 1h + 15m beside their own windows). Each window restores only its own charts: the main window never lays out a chart that is out
in a window, whichever reloads first and however slow a chart window is to ask again.

Signed out (the tests' stand-in for Charts), the shared candles, no EA: nothing live is touched.
  1. The app's Charts tab with chart 1 (1m), charts 2 (1h) and 3 (15m) each in a window of its own.
  2. Main first: both chart windows frozen (what the browser does to a window it slows down), the app reloaded and Charts opened at once;
     for 20 s - past the 15 s the main window used to wait - it must show chart 1 alone. Then the windows wake and take their charts.
  3. Pop-out first: chart 2's window reloaded: the main window never shows it meanwhile, and the window has it again.
  4. Live Charts in a window of its own as the main window: that window reloaded, then a chart window: the same.
    python tests/window_plat_reload_run.py
    E2E_APP=old.html python tests/window_plat_reload_run.py      (another copy of the app, to see the old behaviour)
"""
import functools, http.server, json, os, shutil, sys, tempfile, threading, time, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lowprio  # noqa: F401  (this runner below normal priority)
os.environ.setdefault('E2E_TIMEOUT', '900')   # four phases, two of them 20 s waits
import browser_test as bt

PAGE = os.environ.get('E2E_APP', 'app.html')
# where each chart is drawn, and how many charts the main window lays out (its grid; the held ones are not in it)
STATE = r"""(function(){ var P = window.__stPractice; if (!P || !P._panes) return null; var L = P._lv(), sat = L.sat && !L.sat.closed ? L.sat : null, sd = sat ? sat.document : document;
  var g = sd.getElementById('stpr-grid'), vis = g ? Array.prototype.filter.call(g.querySelectorAll('.stpr-pane'), function(e){ return e.offsetWidth > 0 && e.offsetHeight > 0; }).length : -1;
  var ps = P._panes(), pops = P._pops ? P._pops() : {};
  var tab = document.querySelector('.tab.active');
  return JSON.stringify({ main: vis, n: ps.length, layout: P._cfg().layout, stage: !!sat, tab: tab ? tab.getAttribute('data-page') : '',
    where: ps.map(function(p){ var d = p.el.ownerDocument, o = pops[p.i]; return d === sd ? (p.el.closest('.stpr-held') ? 'held' : 'main') : ((o && o.w && o.w.document === d) ? 'win' : 'other'); }),
    drawn: ps.map(function(p){ return p.n > 0; }), pops: Object.keys(pops).filter(function(k){ return pops[k].ready; }).map(Number) }); })()"""


def main():
    edge = next((p for p in bt.EDGE_PATHS if os.path.exists(p)), None)
    web_port = bt.free_port()
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', web_port), functools.partial(bt.Quiet, directory=bt.ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    dbg_port = bt.free_port()
    prof = tempfile.mkdtemp(prefix='edgeprof_wpr_')
    proc = bt.edge_popen([edge, '--headless=new', '--remote-debugging-port=%d' % dbg_port, '--user-data-dir=' + prof, '--no-first-run', '--no-default-browser-check',
                          '--window-size=1400,950', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
                          '--disable-features=CalculateNativeWinOcclusion', '--disable-popup-blocking', 'about:blank'])
    results = []
    def check(name, ok, got=None):
        results.append((name, bool(ok), got)); print(('ok ' if ok else 'NO ') + name, '' if ok else json.dumps(got)[:300], flush=True)
    def targets():
        return [t for t in json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dbg_port, timeout=3).read()) if t.get('type') == 'page']
    def ev(c, js, g=False):
        return (c.call('Runtime.evaluate', expression=js, awaitPromise=True, returnByValue=True, userGesture=g).get('result') or {}).get('value')
    def until(c, js, secs=60):
        end = time.time() + secs; v = None
        while time.time() < end:
            try: v = ev(c, js)
            except Exception: v = None
            if v: return v
            time.sleep(0.4)
        return v
    def conn(part):
        t = next((t for t in targets() if part in t.get('url', '')), None)
        if not t: return None
        c = bt.CDP(t['webSocketDebuggerUrl']); c.call('Page.enable'); c.call('Runtime.enable'); return c
    KEEP = []   # every session kept open: a session that closes takes its start-up script with it
    def app():
        c = bt.CDP(next(t for t in targets() if '/' + PAGE in t.get('url', ''))['webSocketDebuggerUrl']); c.call('Page.enable'); c.call('Runtime.enable')
        c.call('Page.addScriptToEvaluateOnNewDocument', source='window.__stLcForce = true; window.__stPlatOff = false;'); KEEP.append(c); return c
    def state(c):
        try: return json.loads(ev(c, STATE) or 'null')
        except Exception: return None
    def sample(c, secs, every=0.15):
        """the most charts the main window laid out over that time, and the states seen"""
        end = time.time() + secs; most = 0; seen = []
        while time.time() < end:
            st = state(c)
            if st:
                most = max(most, st['main']); k = json.dumps(st)
                if not seen or seen[-1] != k: seen.append(k)
            time.sleep(every)
        return most, seen
    def to_charts(c, secs=30):
        """Charts opened as the member opens it, once the app is up (a click while it still starts can be undone by its start)"""
        end = time.time() + secs; held = 0
        while time.time() < end:
            on = ev(c, "!!document.querySelector('#page-livecharts.active')")
            if on: held += 1
            else: held = 0; ev(c, open_charts)
            if held >= 4: return True
            time.sleep(0.5)
        return False
    out3 = "(function(){ var s = JSON.parse(%s || 'null'); return !!(s && s.n === 3 && s.where[0] === 'main' && s.where[1] === 'win' && s.where[2] === 'win' && s.drawn.every(Boolean) && s.main <= 1); })()" % STATE.strip()   # (main: 0 when another tab shows)
    try:
        pages = []
        for _ in range(80):
            try:
                pages = targets()
                if pages: break
            except Exception: pass
            time.sleep(0.25)
        M = bt.CDP(pages[0]['webSocketDebuggerUrl']); M.call('Page.enable'); M.call('Runtime.enable')
        M.call('Page.addScriptToEvaluateOnNewDocument', source='window.__stLcForce = true; window.__stPlatOff = false;')
        M.call('Page.navigate', url='http://127.0.0.1:%d/%s' % (web_port, PAGE))
        until(M, '!!(window.__stPractice && window.__stLC && window.__stSB)'); time.sleep(1); ev(M, bt.PRELUDE)
        open_charts = """(function(){ document.querySelectorAll('.stc-gate.open').forEach(function (e) { e.classList.remove('open'); }); document.querySelectorAll('.modal-bg.show').forEach(function (e) { e.classList.remove('show'); });
          document.querySelector('.tab[data-page="livecharts"]').click(); return 1; })()"""
        ev(M, """(function(){ var C = window.__stPractice._cfg(); C.layout = 3; C.tfs = [1, 60, 15, 5]; C.syms = []; C.max = false; C.resume = null; localStorage.removeItem('st_chartwins_v1'); return 1; })()""")
        ev(M, open_charts)
        check('the Charts tab: three charts', until(M, "(function(){ var P = window.__stPractice, s = P._s(); return !!(s && s.live && P._panes().length === 3 && P._panes().every(function(p){ return p.n; })); })()", 90))
        ev(M, 'window.__stPractice._pop(1); 1', True); time.sleep(2); ev(M, 'window.__stPractice._pop(2); 1', True)
        check('charts 2 (1h) and 3 (15m) each in a window of its own, chart 1 (1m) alone in the main window', until(M, out3, 90), state(M))
        time.sleep(2)

        # ---- 2. main first, the chart windows slow (frozen) ----
        C1, C2 = conn('chart.html?slot=1'), conn('chart.html?slot=2')
        for c in (C1, C2): c.call('Page.setWebLifecycleState', state='frozen')
        ev(M, 'setTimeout(function(){ location.reload(); }, 30); 1'); time.sleep(2.5)
        M = app(); until(M, '!!(window.__stPractice && window.__stLC && window.__stSB)'); ev(M, bt.PRELUDE); to_charts(M)
        until(M, "(function(){ var P = window.__stPractice, s = P._s(); return !!(s && s.live && P._panes().length === 3 && P._panes()[0].n); })()", 60)
        most, seen = sample(M, 20)
        check('main reloaded, its chart windows slow to ask: for 20 s the main window shows chart 1 alone', most == 1, seen[-4:])
        for c in (C1, C2): c.call('Page.setWebLifecycleState', state='active')
        check('...the windows wake and take their charts back; the main window still chart 1 alone', until(M, out3, 30), state(M))
        check('...and the two chart windows are still open', sum(1 for t in targets() if 'chart.html' in t.get('url', '')) == 2)

        # ---- 3. pop-out first ----
        C1 = conn('chart.html?slot=1'); ev(C1, 'setTimeout(function(){ location.reload(); }, 30); 1')
        most, seen = sample(M, 6, 0.1)
        check('chart 2\'s window reloaded: the main window never shows chart 2 meanwhile', most == 1, seen[-4:])
        check('...and that window has chart 2 again', until(M, out3, 30), state(M))
        ev(M, 'setTimeout(function(){ location.reload(); }, 30); 1'); time.sleep(2.5)
        M = app(); until(M, '!!(window.__stPractice && window.__stLC && window.__stSB)'); ev(M, bt.PRELUDE); to_charts(M)
        most, seen = sample(M, 8)
        check('then the main window reloaded (the windows awake): chart 1 alone there throughout', most <= 1, seen[-4:])
        check('...charts 2 and 3 back in their windows', until(M, out3, 30), state(M))

        # ---- 4. Live Charts in a window of its own as the main window ----
        to_charts(M); time.sleep(1)
        ev(M, 'window.__stPractice._lcPop(); 1', True)
        check("Live Charts in its own window: chart 1 there, charts 2 and 3 still in theirs", until(M, "(function(){ var s = JSON.parse(%s || 'null'); return !!(s && s.stage && s.main === 1 && s.where[0] === 'main' && s.where[1] === 'win' && s.where[2] === 'win' && s.drawn.every(Boolean)); })()" % STATE.strip(), 90), state(M))
        time.sleep(2)
        L = conn('livecharts.html'); ev(L, 'setTimeout(function(){ location.reload(); }, 30); 1')
        most, seen = sample(M, 10)
        check("Live Charts' window reloaded: it never lays out charts 2 or 3", most <= 1, seen[-4:])
        check("...it has chart 1 again, the chart windows theirs", until(M, "(function(){ var s = JSON.parse(%s || 'null'); return !!(s && s.stage && s.main === 1 && s.where[1] === 'win' && s.where[2] === 'win' && s.drawn.every(Boolean)); })()" % STATE.strip(), 40), state(M))
        C2 = conn('chart.html?slot=2'); ev(C2, 'setTimeout(function(){ location.reload(); }, 30); 1')
        most, seen = sample(M, 6, 0.1)
        check("a chart window reloaded: Live Charts' window never shows its chart meanwhile", most <= 1, seen[-4:])
        check('...and that window has its chart again', until(M, "(function(){ var s = JSON.parse(%s || 'null'); return !!(s && s.stage && s.main === 1 && s.where[1] === 'win' && s.where[2] === 'win' && s.drawn.every(Boolean)); })()" % STATE.strip(), 30), state(M))
    except Exception as e:
        import traceback; traceback.print_exc(); check('test ran', False, str(e))
    finally:
        try: proc.kill()
        except Exception: pass
        bt.kill_profile(prof)
        httpd.shutdown(); time.sleep(0.5); shutil.rmtree(prof, ignore_errors=True)
    for name, ok, got in results:
        print('%s  %s%s' % ('PASS' if ok else 'FAIL', name, '' if ok else '   got: ' + json.dumps(got)[:400]))
    bad = [r for r in results if not r[1]]
    print('\n%d checks, %d failed' % (len(results), len(bad)))
    return 1 if bad or not results else 0


if __name__ == '__main__':
    sys.exit(main())
