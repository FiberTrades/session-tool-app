"""A minimised chart window keeps its chart through a reload of the window that opened it (Nestor, 22 Oct 2026: "when i have 3 external
charts if i reload the main one with the EA and one of the other charts is minimized after the reload it always appears back in the
main external chart and i have to open it again on a new window").

Live Charts in its own window, its chart 2 in a chart window. The chart window is frozen (what the browser does to a minimised
window's timers), Live Charts' window is reloaded, 25 s pass, the chart window wakes: it must re-attach, not close itself.
    python tests/minimized_reload_run.py
    E2E_APP=old.html python tests/minimized_reload_run.py
"""
import functools, http.server, json, os, shutil, subprocess, sys, tempfile, threading, time, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import browser_test as bt

PAGE = os.environ.get('E2E_APP', 'app.html')


def main():
    edge = next((p for p in bt.EDGE_PATHS if os.path.exists(p)), None)
    web_port = bt.free_port()
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', web_port), functools.partial(bt.Quiet, directory=bt.ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    dbg_port = bt.free_port()
    prof = tempfile.mkdtemp(prefix='edgeprof_mzr_')
    proc = subprocess.Popen([edge, '--headless=new', '--remote-debugging-port=%d' % dbg_port, '--user-data-dir=' + prof,
                             '--no-first-run', '--no-default-browser-check', '--window-size=1400,950', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
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
            time.sleep(0.5)
        return v
    try:
        pages = []
        for _ in range(80):
            try:
                pages = targets()
                if pages: break
            except Exception: pass
            time.sleep(0.25)
        M = bt.CDP(pages[0]['webSocketDebuggerUrl']); M.call('Page.enable'); M.call('Runtime.enable')
        M.call('Page.addScriptToEvaluateOnNewDocument', source='window.__stLcForce = true;')
        M.call('Page.navigate', url='http://127.0.0.1:%d/%s' % (web_port, PAGE))
        until(M, '!!(window.__stPractice && window.__stLC && window.__stSB)'); time.sleep(1)
        ev(M, """(function(){ var C = window.__stPractice._cfg(); C.layout = 2; C.tfs = [15, 60, 240, 5]; C.max = false; C.resume = null; C.mm = Object.assign({}, C.mm, { col: true });
          document.querySelector('.tab[data-page="livecharts"]').click(); return 1; })()""")
        until(M, "(function(){ var P = window.__stPractice, s = P._s(); return !!(s && s.live && P._panes().length === 2 && P._panes()[1].n); })()", 90)
        ev(M, 'window.__stPractice._lcPop(); 1', True)
        lc = None
        for _ in range(60):
            lc = next((t for t in targets() if 'livecharts=1' in t.get('url', '')), None)
            if lc: break
            time.sleep(0.5)
        L = bt.CDP(lc['webSocketDebuggerUrl']); L.call('Page.enable'); L.call('Runtime.enable')
        L.call('Page.addScriptToEvaluateOnNewDocument', source='window.__stLcForce = true;'); ev(L, 'window.__stLcForce = true; 1')
        check("Live Charts' window: two charts", until(L, "(function(){ var P = window.__stPractice, s = P && P._s(); return !!(s && s.live && P._lv().solo && P._panes().length === 2 && P._panes()[1].n); })()", 90))
        ev(L, 'window.__stPractice._pop(1); 1', True)
        check('its chart 2 in a chart window', until(L, "(function(){ var P = window.__stPractice, o = P._pops()[1]; return !!(o && o.ready && P._panes()[1].el.ownerDocument === o.w.document && P._panes()[1].n); })()", 60))
        cw = next((t for t in targets() if 'chart.html' in t.get('url', '')), None)
        C2 = bt.CDP(cw['webSocketDebuggerUrl']); C2.call('Page.enable'); C2.call('Runtime.enable')
        # minimised: frozen, no timers run
        C2.call('Page.setWebLifecycleState', state='frozen'); time.sleep(1)
        L.call('Page.reload'); time.sleep(1.5)
        until(L, "(function(){ var P = window.__stPractice, s = P && P._s(); return !!(s && s.live && P._lv().solo); })()", 90)
        time.sleep(25)   # longer than the old 20 s wait
        C2.call('Page.setWebLifecycleState', state='active')
        time.sleep(1)
        ok = until(L, "(function(){ var P = window.__stPractice, o = P._pops()[1]; return !!(o && o.ready && !o.w.closed && P._panes()[1] && P._panes()[1].el.ownerDocument === o.w.document && P._panes()[1].n); })()", 40)
        st = ev(L, "(function(){ var P = window.__stPractice, ps = P._panes(); return JSON.stringify({ n: ps.length, here: ps.filter(function(p){ return p.el.ownerDocument === document; }).length, pops: Object.keys(P._pops()) }); })()")
        check('woken up after the reload: chart 2 back in its own window, not in Live Charts\' window', ok, st)
        check('...and the chart window is still open', any('chart.html' in t.get('url', '') for t in targets()), [t.get('url') for t in targets()])
    except Exception as e:
        import traceback; traceback.print_exc(); check('test ran', False, str(e))
    finally:
        try: subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception: proc.kill()
        bt.kill_profile(prof)
        httpd.shutdown(); time.sleep(0.5); shutil.rmtree(prof, ignore_errors=True)
    for name, ok, got in results:
        print('%s  %s%s' % ('PASS' if ok else 'FAIL', name, '' if ok else '   got: ' + json.dumps(got)[:300]))
    bad = [r for r in results if not r[1]]
    print('\n%d checks, %d failed' % (len(results), len(bad)))
    return 1 if bad or not results else 0


if __name__ == '__main__':
    sys.exit(main())
