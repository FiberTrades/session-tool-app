"""Live Charts sent to a window of its own takes the chart windows already out with it (Nestor, 22 Oct 2026: with charts 2 and 3 out
in windows of their own, opening Live Charts in its own window "ended up giving me 3 charts all together in 1 screen ... there is still
a chart that shouldnt be there anymore in the app").

The app shows Live Charts with three charts; charts 2 and 3 go into windows of their own; then Live Charts goes into a window of its
own. That window must show chart 1 only, with charts 2 and 3 still in the same two windows; the app must show no chart. Reloading the
app must leave all of that alone, and "Show it here instead" must bring Live Charts back to the app with charts 2 and 3 still out.
    python tests/lc_handover_run.py            (the app as it is)
    python tests/lc_handover_run.py old.html   (another copy of the app, served from the repo, to see the old behaviour)
"""
import functools, http.server, json, os, shutil, subprocess, sys, tempfile, threading, time, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import browser_test as bt
import faulthandler
faulthandler.cancel_dump_traceback_later(); faulthandler.dump_traceback_later(500, exit=True)

PAGE = sys.argv[1] if len(sys.argv) > 1 else 'app.html'
HIDE = """(function(){ try { var lp = document.getElementById('lp-front'); if (lp) lp.style.display = 'none';
  Array.prototype.forEach.call(document.querySelectorAll('[class^="st-tour"], #onboarding-modal-bg, .onboarding-modal-bg'), function (e) { e.style.display = 'none'; }); } catch (e) {} return 1; })()"""
# where each chart is: 'here' (this window) or the slot's window ready and drawing it
WHERE = """JSON.stringify((function(){ var P = window.__stPractice, s = P && P._s(), ps = P ? P._panes() : [], o = P ? P._pops() : {};
  return { live: !!(s && s.live), solo: !!(P && P._lv().solo), inl: !!(P && P._lv().inl), n: ps.length, away: !!document.getElementById('lc-away'),
    here: ps.filter(function(p){ return p.el.ownerDocument === document; }).map(function(p){ return p.i; }),
    out: ps.filter(function(p){ var q = o[p.i]; return !!(q && q.ready && q.w && !q.w.closed && p.el.ownerDocument === q.w.document && p.n > 0); }).map(function(p){ return p.i; }),
    panesInDoc: Array.prototype.filter.call(document.querySelectorAll('.stpr-pane'), function(e){ return e.offsetWidth > 0 && e.offsetHeight > 0; }).length, pill0: !!document.querySelector('.stpr-pane[data-i="0"] .stpr-sympill, #stpr-tl .stpr-sympill') }; })())"""


def main():
    edge = next((p for p in bt.EDGE_PATHS if os.path.exists(p)), None)
    web_port = bt.free_port()
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', web_port), functools.partial(bt.Quiet, directory=bt.ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    dbg_port = bt.free_port()
    prof = tempfile.mkdtemp(prefix='edgeprof_lch_')
    proc = subprocess.Popen([edge, '--headless=new', '--remote-debugging-port=%d' % dbg_port, '--user-data-dir=' + prof,
                             '--no-first-run', '--no-default-browser-check', '--window-size=1400,950',
                             '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
                             '--disable-features=CalculateNativeWinOcclusion', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    results = []
    T0 = time.time()
    def check(name, ok, got=None):
        results.append((name, bool(ok), got)); print('...', round(time.time() - T0), 'ok' if ok else 'NO', name, '' if ok else json.dumps(got)[:300], flush=True)
    def targets():
        return [t for t in json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dbg_port, timeout=3).read()) if t.get('type') == 'page']
    def ev(c, js, gesture=False):
        r = c.call('Runtime.evaluate', expression=js, awaitPromise=True, returnByValue=True, userGesture=gesture)
        return (r.get('result') or {}).get('value')
    def until(c, js, secs=60):
        end = time.time() + secs; v = None
        while time.time() < end:
            try: v = ev(c, js)
            except Exception: v = None
            if v: return v
            time.sleep(0.5)
        return v
    def where(c):
        try: return json.loads(ev(c, WHERE) or '{}')
        except Exception: return {}
    def charts():
        return sorted([(t['id'], t.get('url', '').split('/')[-1]) for t in targets() if 'chart.html' in t.get('url', '')])
    try:
        pages = []
        for _ in range(80):
            try:
                pages = targets()
                if pages: break
            except Exception: pass
            time.sleep(0.25)
        M = bt.CDP(pages[0]['webSocketDebuggerUrl']); M.call('Page.enable'); M.call('Runtime.enable')
        M.call('Page.addScriptToEvaluateOnNewDocument', source='window.__stLcForce = true;')   # the tests' stand-in for a member signed in
        base = 'http://127.0.0.1:%d/%s' % (web_port, PAGE)
        M.call('Page.navigate', url=base)
        until(M, '!!(window.__stPractice && window.__stLC && window.__stSB)'); time.sleep(1.2); ev(M, HIDE)
        ev(M, """(function(){ var C = window.__stPractice._cfg(); C.layout = 3; C.tfs = [15, 60, 240, 5]; C.max = false; C.resume = null; C.syms = [];
          var W = window.__stPractice._wsr; if (W) { var o = W.get(); o.on = false; o.slots = {}; W.set(o); }
          document.querySelector('.tab[data-page="livecharts"]').click(); return 1; })()""")
        ok = until(M, "(function(){ var P = window.__stPractice, s = P._s(); return !!(s && s.live && P._panes().length === 3 && P._panes()[2].n); })()", 90)
        check('the app: Live Charts in the Charts tab, three charts', ok)

        # charts 2 and 3 in windows of their own (from the app)
        ev(M, 'window.__stPractice._pop(1); 1', gesture=True)
        until(M, "(function(){ var o = window.__stPractice._pops()[1]; return !!(o && o.ready && window.__stPractice._panes()[1].n); })()", 60)
        ev(M, 'window.__stPractice._pop(2); 1', gesture=True)
        until(M, "(function(){ var o = window.__stPractice._pops()[2]; return !!(o && o.ready && window.__stPractice._panes()[2].n); })()", 60)
        w0 = where(M); cw0 = charts()
        check('the app: chart 1 here, charts 2 and 3 in two windows of their own', w0.get('here') == [0] and w0.get('out') == [1, 2] and len(cw0) == 2, [w0, cw0])
        check('...chart 1 alone here: no symbol button of its own on it (the one at the top is its)', w0.get('pill0') is False, w0)

        # Live Charts in a window of its own
        ev(M, 'window.__stPractice._lcPop(); 1', gesture=True)
        lc = None
        for _ in range(60):
            lc = next((t for t in targets() if 'livecharts=1' in t.get('url', '')), None)
            if lc: break
            time.sleep(0.5)
        L = bt.CDP(lc['webSocketDebuggerUrl']); L.call('Page.enable'); L.call('Runtime.enable')
        L.call('Page.addScriptToEvaluateOnNewDocument', source='window.__stLcForce = true;'); ev(L, 'window.__stLcForce = true; 1')
        t1 = time.time(); most = 0; first = None; done = None
        while time.time() - t1 < 60:
            w = where(L)
            if w.get('live'):
                if first is None: first = time.time()
                most = max(most, len(w.get('here') or []))
                if w.get('here') == [0] and w.get('out') == [1, 2]: done = time.time(); break
            time.sleep(0.25)
        wl = where(L)
        check("Live Charts' window: chart 1 there, charts 2 and 3 in their windows", wl.get('solo') and wl.get('here') == [0] and wl.get('out') == [1, 2], wl)
        print('    (charts in Live Charts\' window while the windows changed over: up to %d, for %.1f s)' % (most, (done - first) if (done and first) else -1))
        cw1 = charts()
        check('still two chart windows, the same two', cw1 == cw0, [cw0, cw1])
        wm = where(M)
        check('the app: no chart of its own left (it says Live Charts is open in its own window)', wm.get('away') and not wm.get('live') and wm.get('panesInDoc') == 0 and not wm.get('out'), wm)

        # the app reloaded: nothing moves
        M.call('Page.reload'); time.sleep(0.5)
        bad = []
        t2 = time.time()
        while time.time() - t2 < 12:
            w = where(L)
            if not (w.get('here') == [0] and w.get('out') == [1, 2]): bad.append(w)
            time.sleep(0.5)
        until(M, '!!(window.__stPractice && window.__stLC && window.__stSB)'); ev(M, HIDE)
        ev(M, """(function(){ var t = document.querySelector('.tab[data-page="livecharts"]'); if (!t.classList.contains('active')) t.click(); return 1; })()"""); time.sleep(3)
        check("the app reloaded: Live Charts' window kept chart 1, its two chart windows kept theirs, the whole time", not bad and where(L).get('out') == [1, 2], bad[:3])
        check('...the same two chart windows', charts() == cw0, charts())
        wm2 = where(M)
        check('...the reloaded app: still no chart of its own', wm2.get('away') and not wm2.get('live') and wm2.get('panesInDoc') == 0, wm2)

        # "Show it here instead": Live Charts back in the app, charts 2 and 3 still in their windows
        ev(M, "document.querySelector('#lc-away [data-lcback]').click(); 1", gesture=True)
        ok = until(M, "(function(){ var w = %s; w = JSON.parse(w); return w.live && w.inl && !w.away && w.here.join() === '0' && w.out.join() === '1,2'; })()" % WHERE, 60)
        check('Show it here instead: Live Charts back in the app, chart 1 here, charts 2 and 3 still in their windows', ok, where(M))
        time.sleep(1.5)
        check("...Live Charts' window closed, the same two chart windows", not any('livecharts=1' in t.get('url', '') for t in targets()) and charts() == cw0, [[t.get('url') for t in targets()], cw0])
    except Exception as e:
        import traceback; traceback.print_exc(); check('test ran', False, str(e))
    finally:
        try: subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception: proc.kill()
        bt.kill_profile(prof)
        httpd.shutdown(); time.sleep(0.5); shutil.rmtree(prof, ignore_errors=True)
    w = max(len(r[0]) for r in results) if results else 10
    for name, ok, got in results:
        print('%s  %s%s' % ('PASS' if ok else 'FAIL', name.ljust(w), '' if ok else '   got: ' + json.dumps(got, ensure_ascii=False)[:400]))
    bad = [r for r in results if not r[1]]
    print('\n%d checks, %d failed' % (len(results), len(bad)))
    return 1 if bad or not results else 0


if __name__ == '__main__':
    sys.exit(main())
