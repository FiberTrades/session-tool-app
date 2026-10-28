"""Reloading the app leaves Live Charts' own window and its chart windows exactly as they were (Nestor, 22 Oct 2026: "if i reload
the app this is what happens, this cannot happen, the external windows must stay the same as they were").

The app opens Live Charts in a window of its own; that window puts its chart 2 in a window of its own; the chart windows are set
to open by themselves at start. Then the app is reloaded: it must take Live Charts' window again (the tab says it is there), draw no
Live Charts in its own page and open no chart windows, and that window must keep its chart window.

Since 23 Oct 2026 Live Charts' own window is livecharts.html, drawn from the app window (stageAttach): its __stPractice is the app
window's, and a reloaded app takes it again. The old ?livecharts=1 page (a second copy of the app) is only what that window becomes
when the app window closes (lc_handover_run.py covers that and the frame gaps of every move).
    python tests/lc_reload_run.py            (the app as it is)
    python tests/lc_reload_run.py old.html   (another copy of the app, served from the repo, to see the old behaviour)
"""
import functools, http.server, json, os, shutil, subprocess, sys, tempfile, threading, time, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import browser_test as bt
import faulthandler
faulthandler.cancel_dump_traceback_later(); faulthandler.dump_traceback_later(400, exit=True)

PAGE = sys.argv[1] if len(sys.argv) > 1 else 'app.html'
HIDE = """(function(){ try { var lp = document.getElementById('lp-front'); if (lp) lp.style.display = 'none';
  Array.prototype.forEach.call(document.querySelectorAll('[class^="st-tour"], #onboarding-modal-bg, .onboarding-modal-bg'), function (e) { e.style.display = 'none'; }); } catch (e) {} return 1; })()"""
# where each chart is, seen from a window: in this window's page (drawn), or out in its slot's window and drawn there
WHERE = """JSON.stringify((function(){ var P = window.__stPractice, s = P && P._s && P._s(), ps = (P && P._panes) ? P._panes() : [], o = (P && P._pops) ? P._pops() : {};
  return { live: !!(s && s.live), inl: !!(P && P._lv && P._lv().inl), stage: !!(P && P._stage && P._stage().on), n: ps.length, away: !!document.getElementById('lc-away'),
    drawn: ps.filter(function(p){ return p.el.ownerDocument === document && p.n > 0; }).map(function(p){ return p.i; }),
    out: ps.filter(function(p){ var q = o[p.i]; return !!(q && q.ready && q.w && !q.w.closed && p.el.ownerDocument === q.w.document && p.n > 0); }).map(function(p){ return p.i; }),
    panesInDoc: Array.prototype.filter.call(document.querySelectorAll('.stpr-pane'), function(e){ return e.offsetWidth > 0 && e.offsetHeight > 0; }).length,
    url: location.pathname + location.search }; })())"""


def main():
    edge = next((p for p in bt.EDGE_PATHS if os.path.exists(p)), None)
    web_port = bt.free_port()
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', web_port), functools.partial(bt.Quiet, directory=bt.ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    dbg_port = bt.free_port()
    prof = tempfile.mkdtemp(prefix='edgeprof_lcr_')
    proc = bt.edge_popen([edge, '--headless=new', '--remote-debugging-port=%d' % dbg_port, '--user-data-dir=' + prof,
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
    def size(c, w, h):   # a computer's window, not left to the desktop: with the screen off Windows shrinks headless windows to 500 x 320,
        try: c.call('Emulation.setDeviceMetricsOverride', width=w, height=h, deviceScaleFactor=1, mobile=False)   # and under 760 px the app is a phone (no chart windows)
        except Exception: pass
    def where(c):
        try: return json.loads(ev(c, WHERE) or '{}')
        except Exception: return {}
    def lc_target():
        return next((t for t in targets() if 'livecharts' in t.get('url', '')), None)
    try:
        pages = []
        for _ in range(80):
            try:
                pages = targets()
                if pages: break
            except Exception: pass
            time.sleep(0.25)
        M = bt.CDP(pages[0]['webSocketDebuggerUrl']); M.call('Page.enable'); M.call('Runtime.enable'); size(M, 1280, 900)
        M.call('Page.addScriptToEvaluateOnNewDocument', source='window.__stLcForce = true;')   # the tests' stand-in for a member signed in
        base = 'http://127.0.0.1:%d/%s' % (web_port, PAGE)
        M.call('Page.navigate', url=base)
        until(M, '!!(window.__stPractice && window.__stLC && window.__stSB)'); time.sleep(1.2); ev(M, HIDE)
        ev(M, """(function(){ var C = window.__stPractice._cfg(); C.layout = 2; C.tfs = [15, 60, 240, 5]; C.max = false; C.resume = null;
          var W = window.__stPractice._wsr; if (W) { var o = W.get(); o.on = false; o.slots = {}; W.set(o); }
          document.querySelector('.tab[data-page="livecharts"]').click(); return 1; })()""")
        ok = until(M, "(function(){ var P = window.__stPractice, s = P._s(); return !!(s && s.live && P._panes().length === 2 && P._panes()[1].n); })()", 90)
        check('the app: Live Charts in the Charts tab, two charts', ok)

        # Live Charts in a window of its own: livecharts.html, drawn from the app window
        ev(M, 'window.__stPractice._lcPop(); 1', gesture=True)
        lc = None
        for _ in range(60):
            lc = lc_target()
            if lc: break
            time.sleep(0.5)
        check("Live Charts' own window is livecharts.html (no second copy of the app)", lc and 'livecharts.html' in lc.get('url', ''), [t.get('url') for t in targets()])
        L = bt.CDP(lc['webSocketDebuggerUrl']); L.call('Page.enable'); L.call('Runtime.enable'); size(L, 1280, 900)
        L.call('Page.addScriptToEvaluateOnNewDocument', source='window.__stLcForce = true;')
        ok = until(L, "(function(){ var w = JSON.parse(%s); return w.live && w.stage && w.n === 2 && w.drawn.join() === '0,1'; })()" % WHERE, 90)
        check("Live Charts' own window: live, two charts drawn there", ok, where(L))
        check('the app: the tab says Live Charts is open in its own window, no chart in its own page',
              until(M, "(function(){ var w = JSON.parse(%s); return w.away && w.panesInDoc === 0; })()" % WHERE, 10), where(M))

        # its chart 2 in a window of its own (opened by Live Charts' window, a click there allows it), and the chart windows set to open
        # by themselves at start
        ev(L, 'window.__stPractice._pop(1); 1', gesture=True)
        ok = until(L, "(function(){ var w = JSON.parse(%s); return w.drawn.join() === '0' && w.out.join() === '1'; })()" % WHERE, 60)
        check("Live Charts' window: chart 2 in a window of its own", ok, where(L))
        cw = [t for t in targets() if 'chart.html' in t.get('url', '')]
        check('one chart window', len(cw) == 1, [t.get('url') for t in cw])
        cw_id = cw[0]['id'] if cw else None
        ev(M, """(function(){ var W = window.__stPractice._wsr, o = W.get(); o.on = true; o.slots = o.slots || {}; if (!o.slots['1']) o.slots['1'] = { x: 60, y: 60, w: 900, h: 600 }; W.set(o); return 1; })()""")

        # the app reloaded
        M.call('Page.reload'); time.sleep(1.0)
        until(M, '!!(window.__stPractice && window.__stLC && window.__stSB)'); ev(M, HIDE)
        time.sleep(9)   # past the start's chart windows (2 s) and its checks
        ev(M, """(function(){ var t = document.querySelector('.tab[data-page="livecharts"]'); if (!t.classList.contains('active')) t.click(); return 1; })()"""); time.sleep(3)   # (a reload starts on the first tab)
        # (the app holds Live Charts' own window as LV.sat; LV.popW is only for the ?livecharts=1 copy of the app, after the app window closed)
        st = json.loads(ev(M, """JSON.stringify((function(){ var P = window.__stPractice, lv = P._lv(), w = null; try { w = lv.sat && !lv.sat.closed ? lv.sat.location.pathname : null; } catch (e) {}
          var tab = document.querySelector('.tab[data-page="livecharts"]');
          return { tab: !!(tab && tab.classList.contains('active')), away: !!document.getElementById('lc-away'), stage: !!P._stage().on, inl: !!lv.inl, sat: w,
            panesInDoc: Array.prototype.filter.call(document.querySelectorAll('.stpr-pane'), function(e){ return e.offsetWidth > 0 && e.offsetHeight > 0; }).length }; })())""") or '{}')
        check('reloaded app: in the Charts tab', st.get('tab'), st)
        check('reloaded app: takes Live Charts\' window again ("open in its own window")', st.get('away') and st.get('stage') and 'livecharts.html' in (st.get('sat') or ''), st)
        check('reloaded app: no Live Charts in its own page', not st.get('inl') and st.get('panesInDoc') == 0, st)
        cw2 = [t for t in targets() if 'chart.html' in t.get('url', '')]
        check('no chart windows of its own: still one chart window, the same one', len(cw2) == 1 and cw2[0]['id'] == cw_id, [(t.get('id'), t.get('url')) for t in cw2])
        check('still one Live Charts window, livecharts.html', [t.get('url', '').split('/')[-1].split('?')[0] for t in targets() if 'livecharts' in t.get('url', '')] == ['livecharts.html'], [t.get('url') for t in targets()])
        lst = where(L)
        check("Live Charts' window: unchanged - chart 1 drawn here, chart 2 still in its window, live", lst.get('n') == 2 and lst.get('drawn') == [0] and lst.get('out') == [1] and lst.get('live') and lst.get('stage') and 'livecharts.html' in (lst.get('url') or ''), lst)
        if cw2:
            C2 = bt.CDP(cw2[0]['webSocketDebuggerUrl']); C2.call('Runtime.enable')
            cst = json.loads(ev(C2, """JSON.stringify({ op: (function(){ try { return window.opener.location.pathname; } catch (e) { return 'x'; } })(), cv: document.querySelectorAll('.stpr-pane canvas').length })""") or '{}')
            check('the chart window: still Live Charts\' window\'s, its chart drawn', 'livecharts.html' in (cst.get('op') or '') and cst.get('cv', 0) > 0, cst)

        # "Show it here instead": that window closes and Live Charts comes back to the tab; the chart window stays out
        ev(M, "document.querySelector('#lc-away [data-lcback]').click(); 1", gesture=True)
        ok = until(M, "(function(){ var w = JSON.parse(%s); return w.live && w.inl && !w.stage && !w.away && w.drawn.join() === '0' && w.out.join() === '1'; })()" % WHERE, 60)
        check('Show it here instead: Live Charts back in the tab, chart 1 here, chart 2 still in its window', ok, where(M))
        time.sleep(3)
        check("...and Live Charts' window closed", not any('livecharts' in t.get('url', '') for t in targets()), [t.get('url') for t in targets()])
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
