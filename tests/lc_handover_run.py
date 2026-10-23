"""Live Charts sent to a window of its own takes the chart windows already out with it, and every hand-over is seamless (Nestor,
22 Oct 2026: with charts 2 and 3 out in windows of their own, opening Live Charts in its own window "ended up giving me 3 charts all
together in 1 screen ... there is still a chart that shouldnt be there anymore in the app"; then "it looks cheaply built as when you
close the main chart the other screens go black for a couple of seconds ... i see the 3 charts inside the app then it turns to just
the one").

The app shows Live Charts with three charts; charts 2 and 3 go into windows of their own; then Live Charts goes into a window of its
own; the app is reloaded; "Show it here instead"; Live Charts to its own window again; that window closed by hand. Throughout, every
chart window is sampled several times a second: it must always show a chart (never blank) and never reload, and the window taking the
charts over must never build charts 2 and 3 inside itself first.
    python tests/lc_handover_run.py            (the app as it is)
    python tests/lc_handover_run.py old.html   (another copy of the app, served from the repo, to see the old behaviour)
"""
import functools, http.server, json, os, shutil, subprocess, sys, tempfile, threading, time, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import browser_test as bt
import faulthandler
faulthandler.cancel_dump_traceback_later(); faulthandler.dump_traceback_later(600, exit=True)

PAGE = sys.argv[1] if len(sys.argv) > 1 else 'app.html'
HIDE = """(function(){ try { var lp = document.getElementById('lp-front'); if (lp) lp.style.display = 'none';
  Array.prototype.forEach.call(document.querySelectorAll('[class^="st-tour"], #onboarding-modal-bg, .onboarding-modal-bg'), function (e) { e.style.display = 'none'; }); } catch (e) {} return 1; })()"""
# where each chart is: 'here' (this window) or the slot's window ready and drawing it
WHERE = """JSON.stringify((function(){ var P = window.__stPractice, s = P && P._s(), ps = P ? P._panes() : [], o = P ? P._pops() : {};
  return { live: !!(s && s.live), solo: !!(P && P._lv().solo), inl: !!(P && P._lv().inl), n: ps.length, away: !!document.getElementById('lc-away'),
    here: ps.filter(function(p){ return p.el.ownerDocument === document; }).map(function(p){ return p.i; }),
    out: ps.filter(function(p){ var q = o[p.i]; return !!(q && q.ready && q.w && !q.w.closed && p.el.ownerDocument === q.w.document && p.n > 0); }).map(function(p){ return p.i; }),
    panesInDoc: Array.prototype.filter.call(document.querySelectorAll('.stpr-pane'), function(e){ return e.offsetWidth > 0 && e.offsetHeight > 0; }).length,
    pill0: !!document.querySelector('.stpr-pane[data-i="0"] .stpr-sympill, #stpr-tl .stpr-sympill') }; })())"""
# a chart window: how many charts it shows (canvases of a real size), whether it was reloaded (the mark goes), leftover pictures
CW = """JSON.stringify((function(){ var cv = Array.prototype.filter.call(document.querySelectorAll('canvas'), function(c){ var r = c.getBoundingClientRect(); return r.width > 100 && r.height > 100 && getComputedStyle(c).visibility !== 'hidden'; });
  return { cv: cv.length, mark: window.__mark || 0, bgs: document.querySelectorAll('#stpr-bg').length }; })())"""


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
            time.sleep(0.25)
        return v
    def where(c):
        try: return json.loads(ev(c, WHERE) or '{}')
        except Exception: return {}
    def charts():
        return sorted([t['id'] for t in targets() if 'chart.html' in t.get('url', '')])
    CWC = {}
    def cw(tid):
        if tid not in CWC:
            t = next((x for x in targets() if x['id'] == tid), None)
            if not t: return None
            c = bt.CDP(t['webSocketDebuggerUrl']); c.call('Runtime.enable'); CWC[tid] = c
        try: return json.loads(ev(CWC[tid], CW) or '{}')
        except Exception: return None
    def mark(ids):
        for tid in ids:
            cw(tid); ev(CWC[tid], 'window.__mark = 1; 1')
    # watch a hand-over: every chart window always shows a chart and is not reloaded; the taking window never has more than chart 1
    def watch(name, ids, taker, secs, done_js, max_still=None):
        blank, reloaded, most, t1, ok_at = [], [], 0, time.time(), None
        still = {}
        while time.time() - t1 < secs:
            for tid in ids:
                s = cw(tid)
                if not s or s.get('cv', 0) < 1: blank.append((round(time.time() - t1, 2), tid[-4:], s))
                if s and not s.get('mark'): reloaded.append((round(time.time() - t1, 2), tid[-4:]))
                if s and s.get('bgs', 0) >= 2:
                    tt = time.time() - t1; a = still.get(tid); still[tid] = [a[0] if a else tt, tt]
            if taker is not None:
                w = where(taker)
                if w.get('live'): most = max(most, len(w.get('here') or []))
            if ok_at is None:
                try:
                    if ev(taker if taker is not None else M, done_js): ok_at = time.time() - t1
                except Exception: pass
            elif time.time() - t1 > ok_at + 1.5: break
            time.sleep(0.12)
        frozen = max([v[1] - v[0] + 0.12 for v in still.values()] or [0])
        print('    (%s: done after %s s; blank samples %d; reloads %d; most charts in the taking window %d; still picture up to %.1f s)' % (name, round(ok_at, 1) if ok_at is not None else '-', len(blank), len(set(r[1] for r in reloaded)), most, frozen))
        if max_still is not None: check(name + ': the chart windows paused for at most %.1f s (a still picture while they change hands)' % max_still, frozen <= max_still, round(frozen, 2))
        check(name + ': every chart window kept showing a chart', not blank, blank[:4])
        check(name + ': no chart window reloaded', not reloaded, reloaded[:4])
        if taker is not None: check(name + ': the window taking over never had more than chart 1 in it', most <= 1, most)
        return ok_at
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
        w0 = where(M); ids = charts()
        check('the app: chart 1 here, charts 2 and 3 in two windows of their own', w0.get('here') == [0] and w0.get('out') == [1, 2] and len(ids) == 2, [w0, ids])
        check('...chart 1 alone here: no symbol button of its own on it (the one at the top is its)', w0.get('pill0') is False, w0)
        mark(ids)

        # 1. Live Charts in a window of its own
        ev(M, 'window.__stPractice._lcPop(); 1', gesture=True)
        lc = None
        for _ in range(80):
            lc = next((t for t in targets() if 'livecharts=1' in t.get('url', '')), None)
            if lc: break
            time.sleep(0.1)
        L = bt.CDP(lc['webSocketDebuggerUrl']); L.call('Page.enable'); L.call('Runtime.enable')
        L.call('Page.addScriptToEvaluateOnNewDocument', source='window.__stLcForce = true;'); ev(L, 'window.__stLcForce = true; 1')
        done = "(function(){ var w = %s; w = JSON.parse(w); return w.live && w.here.join() === '0' && w.out.join() === '1,2'; })()" % WHERE
        watch('Live Charts to its own window', ids, L, 40, done, max_still=2.5)
        wl = where(L)
        check("Live Charts' window: chart 1 there, charts 2 and 3 in their windows", wl.get('solo') and wl.get('here') == [0] and wl.get('out') == [1, 2], wl)
        check('still two chart windows, the same two', charts() == ids, [ids, charts()])
        wm = where(M)
        check('the app: no chart of its own left (it says Live Charts is open in its own window)', wm.get('away') and not wm.get('live') and wm.get('panesInDoc') == 0 and not wm.get('out'), wm)
        time.sleep(0.6)
        check('...the still pictures gone from the chart windows (one chart window page each)', all((cw(t) or {}).get('bgs') == 1 for t in ids), [cw(t) for t in ids])

        # 2. the app reloaded: nothing moves
        M.call('Page.reload'); time.sleep(0.3)
        watch('the app reloaded', ids, None, 10, 'false')
        until(M, '!!(window.__stPractice && window.__stLC && window.__stSB)'); ev(M, HIDE)
        ev(M, """(function(){ var t = document.querySelector('.tab[data-page="livecharts"]'); if (!t.classList.contains('active')) t.click(); return 1; })()"""); time.sleep(3)
        check("...Live Charts' window still has charts 2 and 3 in their windows", where(L).get('out') == [1, 2], where(L))
        wm2 = where(M)
        check('...the reloaded app: still no chart of its own', wm2.get('away') and not wm2.get('live') and wm2.get('panesInDoc') == 0, wm2)

        # 3. "Show it here instead": Live Charts back in the app, charts 2 and 3 still in their windows
        ev(M, "document.querySelector('#lc-away [data-lcback]').click(); 1", gesture=True)
        done_m = "(function(){ var w = %s; w = JSON.parse(w); return w.live && w.inl && !w.away && w.here.join() === '0' && w.out.join() === '1,2'; })()" % WHERE
        watch('Show it here instead', ids, M, 40, done_m, max_still=2.5)
        check('...Live Charts back in the app, chart 1 here, charts 2 and 3 still in their windows', ev(M, done_m), where(M))
        time.sleep(1)
        check("...Live Charts' window closed, the same two chart windows", not any('livecharts=1' in t.get('url', '') for t in targets()) and charts() == ids, [[t.get('url') for t in targets()], ids])

        # 4. to its own window again, then that window closed by hand (its X)
        ev(M, 'window.__stPractice._lcPop(); 1', gesture=True)
        lc = None
        for _ in range(80):
            lc = next((t for t in targets() if 'livecharts=1' in t.get('url', '')), None)
            if lc: break
            time.sleep(0.1)
        L = bt.CDP(lc['webSocketDebuggerUrl']); L.call('Page.enable'); L.call('Runtime.enable')
        L.call('Page.addScriptToEvaluateOnNewDocument', source='window.__stLcForce = true;'); ev(L, 'window.__stLcForce = true; 1')
        watch('Live Charts to its own window again', ids, L, 40, done)
        ev(L, 'window.close(); 1')
        watch("Live Charts' window closed by hand", ids, M, 40, done_m)
        check('...Live Charts back in the app with charts 2 and 3 still in their windows', ev(M, done_m), where(M))

        # 5. once more to its own window, then the app itself closed: Live Charts' window and its chart windows stay as they are
        ev(M, 'window.__stPractice._lcPop(); 1', gesture=True)
        lc = None
        for _ in range(80):
            lc = next((t for t in targets() if 'livecharts=1' in t.get('url', '')), None)
            if lc: break
            time.sleep(0.1)
        L = bt.CDP(lc['webSocketDebuggerUrl']); L.call('Page.enable'); L.call('Runtime.enable')
        L.call('Page.addScriptToEvaluateOnNewDocument', source='window.__stLcForce = true;'); ev(L, 'window.__stLcForce = true; 1')
        watch('Live Charts to its own window a third time', ids, L, 40, done, max_still=2.5)
        app_id = next((t['id'] for t in targets() if t.get('url', '').split('?')[0].endswith('/' + PAGE.split('#')[0]) and 'livecharts=1' not in t.get('url', '')), None)
        try: urllib.request.urlopen('http://127.0.0.1:%d/json/close/%s' % (dbg_port, app_id), timeout=5).read()
        except Exception as e: print('close failed', e)
        time.sleep(4)
        check('the app closed: it is gone', app_id and not any(t['id'] == app_id for t in targets()), [t.get('url') for t in targets()])
        check("...Live Charts' window still open, live, chart 1 there and charts 2 and 3 still in their windows", where(L).get('live') and where(L).get('here') == [0] and where(L).get('out') == [1, 2], where(L))
        check('...the same two chart windows, not folded into one', charts() == ids, [ids, charts()])
        if os.environ.get('LCH_DEBUG'):
            print('DEBUG targets', [t.get('url', '')[-40:] for t in targets()])
            print('DEBUG app', ev(M, "JSON.stringify((function(){ var lv = window.__stPractice._lv(), w = lv.popW, st = 'none'; try { st = w ? (w.closed ? 'closed' : 'open') : 'none'; } catch (e) { st = 'err'; } return { popW: st, awayT: !!lv.awayT, seen: lv.seenAt, tab: (document.querySelector('.tab[data-page=\"livecharts\"]') || {}).className, expect: lv.expect }; })())"))
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
