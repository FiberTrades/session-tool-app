"""Live Charts in a window of its own, with charts already out in windows of their own: every move is seamless.

History. Nestor, 22 Oct 2026: with charts 2 and 3 out in windows of their own, opening Live Charts in its own window "ended up giving me 3
charts all together in 1 screen"; then "it looks cheaply built as when you close the main chart the other screens go black for a couple of
seconds". Then, 23 Oct 2026: "closing and opening the charts still makes the other charts lag a little" - Live Charts' window was a second
copy of the app starting up, on the same thread as the app and the chart windows, and they stalled about 0.2 s while it did. "do this":
Live Charts' window is now livecharts.html, drawn from the app window as a chart window is (stageAttach), so nothing starts again.

The app shows Live Charts with three charts; charts 2 and 3 go into windows of their own; then Live Charts goes into a window of its own;
the app is reloaded (it takes that window again); "Show it here instead"; to its own window again, a chart sent back and opened again from
there, then that window closed by hand; to its own window a third time and the app closed (that window becomes the app itself). Throughout,
every chart window is sampled several times a second: it must always show a chart (never blank) and never reload, and the longest pause
between two of its frames is measured.
    python tests/lc_handover_run.py

Measured 23 Oct 2026 at night, screen off (the longest pause between two frames in the chart windows, same test steps; at 1000 x 700):
    Live Charts to its own window      1300-3000 ms before (a second copy of the app starting up)  ->  17-33 ms
    the app reloaded                   200-300 ms before  ->  50 ms
    Show it here instead (after it)    50 ms before  ->  17-420 ms (software drawing: varies from run to run)
    its window closed by hand          67-84 ms before  ->  17-200 ms
Most moves measure 17-50 ms; with the screen off one move per run, any of them, spiked to 200-420 ms (software drawing), hence 500 ms
as the limit. At 500 x 320 every move was 17-50 ms (716-750 ms before for opening it). With the screen off the app window also failed to close now and then
in this test, before tonight's change too.
"""
import functools, http.server, json, os, shutil, subprocess, sys, tempfile, threading, time, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import browser_test as bt
import faulthandler
faulthandler.cancel_dump_traceback_later(); faulthandler.dump_traceback_later(900, exit=True)

PAGE = 'app.html'
HIDE = """(function(){ try { var lp = document.getElementById('lp-front'); if (lp) lp.style.display = 'none';
  Array.prototype.forEach.call(document.querySelectorAll('[class^="st-tour"], #onboarding-modal-bg, .onboarding-modal-bg'), function (e) { e.style.display = 'none'; }); } catch (e) {} return 1; })()"""
# where each chart is, seen from a window: 'here' (this window's document) or the slot's window ready and drawing it. In Live Charts' own
# window (livecharts.html) __stPractice is the app window's, which draws it.
WHERE = """JSON.stringify((function(){ var P = window.__stPractice, s = P && P._s && P._s(), ps = (P && P._panes) ? P._panes() : [], o = (P && P._pops) ? P._pops() : {};
  return { live: !!(s && s.live), solo: !!(P && P._lv && P._lv().solo), inl: !!(P && P._lv && P._lv().inl), stage: !!(P && P._stage && P._stage().on), n: ps.length, away: !!document.getElementById('lc-away'),
    here: ps.filter(function(p){ return p.el.ownerDocument === document; }).map(function(p){ return p.i; }),
    drawn: ps.filter(function(p){ return p.el.ownerDocument === document && p.n > 0; }).map(function(p){ return p.i; }),
    out: ps.filter(function(p){ var q = o[p.i]; return !!(q && q.ready && q.w && !q.w.closed && p.el.ownerDocument === q.w.document && p.n > 0); }).map(function(p){ return p.i; }),
    panesInDoc: Array.prototype.filter.call(document.querySelectorAll('.stpr-pane'), function(e){ return e.offsetWidth > 0 && e.offsetHeight > 0; }).length,
    mm: !!document.getElementById('stpr-mm'), tb: !!document.getElementById('lc-tb'), url: location.pathname + location.search }; })())"""
# a chart window: how many charts it shows (canvases of a real size), whether it was reloaded (the mark goes), leftover pictures, and the
# longest pause between two of its frames since the last reset
CW = """JSON.stringify((function(){ var cv = Array.prototype.filter.call(document.querySelectorAll('canvas'), function(c){ var r = c.getBoundingClientRect(); return r.width > 100 && r.height > 100 && getComputedStyle(c).visibility !== 'hidden'; });
  return { cv: cv.length, mark: window.__mark || 0, bgs: document.querySelectorAll('#stpr-bg').length, gap: Math.round(window.__mx || 0) }; })())"""
MARK = """(function(){ window.__mark = 1; window.__mx = 0; window.__lt = 0; if (!window.__mxOn) { window.__mxOn = 1;
  (function f(){ requestAnimationFrame(function(t){ var d = window.__lt ? t - window.__lt : 0; window.__lt = t; if (d > window.__mx) window.__mx = d; f(); }); })(); } return 1; })()"""


def main():
    edge = next((p for p in bt.EDGE_PATHS if os.path.exists(p)), None)
    web_port = bt.free_port()
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', web_port), functools.partial(bt.Quiet, directory=bt.ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    dbg_port = bt.free_port()
    prof = tempfile.mkdtemp(prefix='edgeprof_lch_')
    proc = bt.edge_popen([edge, '--headless=new', '--remote-debugging-port=%d' % dbg_port, '--user-data-dir=' + prof,
                             '--no-first-run', '--no-default-browser-check', '--window-size=1400,950',
                             '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
                             '--disable-features=CalculateNativeWinOcclusion', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    results = []
    gaps = []
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
    def size(c, w, h):   # the window's size set here, not left to the desktop (a monitor off shrinks headless windows)
        # a computer's window (over 760 px wide, or the app treats it as a phone: no chart windows), not left to the desktop: with the
        # screen off Windows shrinks headless windows to 500 x 320. Kept moderate: with the screen off it is all drawn in software, and
        # at 1400 x 950 that alone paused every window 0.2-0.4 s on some moves (LCH_SIZE=big to see it)
        if not os.environ.get('LCH_SIZE'): w, h = max(980, min(w, 1000)), max(640, min(h, 700))
        try: c.call('Emulation.setDeviceMetricsOverride', width=w, height=h, deviceScaleFactor=1, mobile=False)
        except Exception: pass
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
            c = bt.CDP(t['webSocketDebuggerUrl']); c.call('Runtime.enable'); size(c, 920, 640); CWC[tid] = c
        try: return json.loads(ev(CWC[tid], CW) or '{}')
        except Exception: return None
    def mark(ids):
        for tid in ids:
            cw(tid); ev(CWC[tid], MARK)
    def attach(pred, secs=12):   # a window by its address
        t = None
        for _ in range(int(secs * 10)):
            t = next((x for x in targets() if pred(x.get('url', ''))), None)
            if t: break
            time.sleep(0.1)
        if not t: return None
        c = bt.CDP(t['webSocketDebuggerUrl']); c.call('Page.enable'); c.call('Runtime.enable'); size(c, 1400, 920)
        c.call('Page.addScriptToEvaluateOnNewDocument', source='window.__stLcForce = true;')
        return c
    # watch a move: every chart window always shows a chart and is not reloaded; the longest pause between its frames
    def watch(name, ids, taker, secs, done_js, max_gap=None, max_still=None):
        for tid in ids:
            try: ev(CWC[tid], 'window.__mx = 0; 1')
            except Exception: pass
        blank, reloaded, most, t1, ok_at, still = [], [], 0, time.time(), None, {}
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
        g = [(cw(t) or {}).get('gap', -1) for t in ids]
        frozen = max([v[1] - v[0] + 0.12 for v in still.values()] or [0])
        gaps.append((name, g))
        print('    (%s: done after %s s; blank samples %d; reloads %d; most charts in the taking window %d; still picture up to %.1f s; longest frame gaps %s ms)' % (name, round(ok_at, 1) if ok_at is not None else '-', len(blank), len(set(r[1] for r in reloaded)), most, frozen, g))
        if max_gap is not None: check(name + ': the chart windows never paused more than %d ms' % max_gap, all(0 <= x <= max_gap for x in g), g)
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
        M = bt.CDP(pages[0]['webSocketDebuggerUrl']); M.call('Page.enable'); M.call('Runtime.enable'); size(M, 1400, 950)
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
        mark(ids); time.sleep(1.0)
        watch('nothing moving (the baseline)', ids, None, 3, 'false')

        # 1. Live Charts in a window of its own: livecharts.html, drawn from the app window
        ev(M, "document.getElementById('stpr-pop').click(); 1", gesture=True)
        L = attach(lambda u: 'livecharts.html' in u)
        check("Live Charts' own window is livecharts.html (no second copy of the app)", L is not None, [t.get('url') for t in targets()])
        done = "(function(){ var w = %s; w = JSON.parse(w); return w.live && w.stage && w.drawn.join() === '0' && w.out.join() === '1,2'; })()" % WHERE
        watch('Live Charts to its own window', ids, L, 40, done, max_gap=500)
        wl = where(L)
        check("Live Charts' window: chart 1 drawn there, the EA panel and the Toolbox too; charts 2 and 3 still in their windows", wl.get('stage') and wl.get('drawn') == [0] and wl.get('out') == [1, 2] and wl.get('mm') and wl.get('tb') and not wl.get('solo'), wl)
        check('still two chart windows, the same two', charts() == ids, [ids, charts()])
        wm = where(M)
        check('the app: no chart of its own left (it says Live Charts is open in its own window)', wm.get('away') and wm.get('panesInDoc') == 0 and wm.get('here') == [], wm)

        # 2. the app reloaded: that window keeps a still picture and the reloaded app takes it again; the chart windows the same
        M.call('Page.reload'); time.sleep(0.3)
        done_r = "(function(){ var w = %s; w = JSON.parse(w); return w.live && w.stage && w.drawn.join() === '0' && w.out.join() === '1,2'; })()" % WHERE
        watch('the app reloaded', ids, L, 45, done_r, max_still=8.0)
        until(M, '!!(window.__stPractice && window.__stLC && window.__stSB)'); ev(M, HIDE)
        wl2 = where(L)
        check("...the reloaded app took Live Charts' window again: chart 1 live there, charts 2 and 3 in their windows; no second copy of the app", wl2.get('stage') and wl2.get('drawn') == [0] and wl2.get('out') == [1, 2] and 'livecharts.html' in (wl2.get('url') or ''), wl2)
        ev(M, """(function(){ var t = document.querySelector('.tab[data-page="livecharts"]'); if (!t.classList.contains('active')) t.click(); return 1; })()"""); time.sleep(1.5)
        wm2 = where(M)
        check('...the reloaded app: no chart of its own, it says Live Charts is open in its own window', wm2.get('away') and wm2.get('panesInDoc') == 0, wm2)
        # nothing of the app before the reload stays on top in its windows (27 Oct 2026, Nestor's screenshot: a frozen » square beside the live
        # one): no leftover picture once the charts are drawn, one » per chart
        time.sleep(9)
        GH = "(function(){ return { ghosts: Array.prototype.filter.call(document.body.children, function (e) { return e.style && e.style.zIndex === '2147483000'; }).length, rt: document.querySelectorAll('.stpr-rt').length, panes: document.querySelectorAll('.stpr-pc').length }; })()"
        gl = [ev(L, GH)]
        for t in ids:
            cw(t); gl.append(ev(CWC[t], GH))
        check('...nothing of the app before the reload left on top in its windows: no leftover picture, one \u00bb per chart', all(g and g['ghosts'] == 0 and g['rt'] <= max(1, g['panes']) for g in gl), gl)

        # 3. "Show it here instead": back in the app at once; the chart windows do not move at all
        ev(M, "document.querySelector('#lc-away [data-lcback]').click(); 1", gesture=True)
        done_m = "(function(){ var w = %s; w = JSON.parse(w); return w.live && w.inl && !w.stage && !w.away && w.drawn.join() === '0' && w.out.join() === '1,2'; })()" % WHERE
        # (the first moves back into an app window just reloaded: with the screen off headless Edge draws in software, and those measured
        # 17-420 ms from run to run - 50 ms for the old Live Charts window in the same conditions; everything else here, old 50-3000 ms)
        watch('Show it here instead', ids, M, 40, done_m, max_gap=500)
        check('...Live Charts back in the app, chart 1 here, charts 2 and 3 still in their windows', ev(M, done_m), where(M))
        time.sleep(1)
        check("...Live Charts' window closed, the same two chart windows", not any('livecharts' in t.get('url', '') for t in targets()) and charts() == ids, [[t.get('url') for t in targets()], ids])

        # 4. to its own window again; chart 3 back into it and out again from there (a click there opens it); then that window closed by hand
        ev(M, "document.getElementById('stpr-pop').click(); 1", gesture=True)
        L = attach(lambda u: 'livecharts.html' in u)
        watch('Live Charts to its own window again', ids, L, 40, done, max_gap=500)
        ev(M, 'window.__stPractice._unpop(2); 1')
        until(L, "(function(){ var w = %s; w = JSON.parse(w); return w.drawn.join() === '0,2' && w.out.join() === '1'; })()" % WHERE, 30)
        time.sleep(0.8)
        wl3 = where(L)
        check("...chart 3 sent back: drawn in Live Charts' window with chart 1", wl3.get('drawn') == [0, 2] and wl3.get('out') == [1], wl3)
        b = json.loads(ev(L, """JSON.stringify((function(){ var b = document.querySelector('.stpr-pane[data-i="2"] [data-popc="2"]'); if (!b) return null; var r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })())""") or 'null')
        if b:
            for t in ('mousePressed', 'mouseReleased'):
                L.call('Input.dispatchMouseEvent', type=t, x=b['x'], y=b['y'], button='left', clickCount=1)
        new3 = None
        for _ in range(100):
            new3 = next((x['id'] for x in targets() if 'chart.html?slot=2' in x.get('url', '') and x['id'] not in ids), None)
            if new3: break
            time.sleep(0.1)
        ok3 = until(L, "(function(){ var w = %s; w = JSON.parse(w); return w.drawn.join() === '0' && w.out.join() === '1,2'; })()" % WHERE, 30)
        check("...and out again from there: its button in Live Charts' window opens chart 3's window (drawn by the app window)", bool(b) and bool(new3) and bool(ok3), [b, new3, where(L)])
        ids2 = [ids[0] if 'slot=1' in next((x.get('url', '') for x in targets() if x['id'] == ids[0]), '') else ids[1]] + ([new3] if new3 else [])
        ids2 = sorted(set([x for x in ids2 if x]))
        mark(ids2); time.sleep(0.5)
        ev(L, 'window.close(); 1')
        watch("Live Charts' window closed by hand", ids2, M, 40, done_m, max_gap=500)
        check('...Live Charts back in the app; charts 2 and 3 still in their windows (also the one opened from that window)', ev(M, done_m) and all(cw(t) for t in ids2), [where(M), [cw(t) for t in ids2]])

        # 5. once more to its own window, then the app itself closed: that window becomes the app (as before), and keeps the chart windows
        ids = charts(); mark(ids)
        ev(M, "document.getElementById('stpr-pop').click(); 1", gesture=True)
        L = attach(lambda u: 'livecharts.html' in u)
        watch('Live Charts to its own window a third time', ids, L, 40, done, max_gap=500)
        app_id = next((t['id'] for t in targets() if t.get('url', '').split('?')[0].endswith('/' + PAGE) and 'livecharts' not in t.get('url', '')), None)
        print('    (closing the app window %s; the windows: %s)' % (app_id, [t.get('url', '')[-45:] for t in targets()]))
        try: print('    (/json/close:', urllib.request.urlopen('http://127.0.0.1:%d/json/close/%s' % (dbg_port, app_id), timeout=5).read()[:80], ')')
        except Exception as e: print('close failed', e)
        try:
            ver = json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/version' % dbg_port, timeout=3).read())
            BR = bt.CDP(ver['webSocketDebuggerUrl']); time.sleep(0.5)
            if any(t['id'] == app_id for t in targets()): print('    (Target.closeTarget:', BR.call('Target.closeTarget', targetId=app_id), ')')
        except Exception as e: print('closeTarget failed', e)
        for _ in range(20):   # a "Leave site?" question (something still being saved) is answered Leave
            if not any(t['id'] == app_id for t in targets()): break
            try: M.call('Page.handleJavaScriptDialog', accept=True)
            except Exception: pass
            time.sleep(0.25)
        L2 = None
        for _ in range(100):
            t = next((x for x in targets() if 'livecharts=1' in x.get('url', '')), None)
            if t:
                L2 = bt.CDP(t['webSocketDebuggerUrl']); L2.call('Runtime.enable'); size(L2, 1400, 920); break
            time.sleep(0.1)
        done_s = "(function(){ var w = %s; w = JSON.parse(w); return w.live && w.solo && w.here.join() === '0' && w.out.join() === '1,2'; })()" % WHERE
        if L2: ev(L2, 'window.__stLcForce = true; 1')
        watch('the app closed', ids, L2, 60, done_s, max_still=12.0) if L2 else None
        check('the app closed: it is gone', app_id and not any(t['id'] == app_id for t in targets()), [t.get('url') for t in targets()])
        check("...Live Charts' window became the app itself (?livecharts=1): live, chart 1 there and charts 2 and 3 still in their windows", L2 is not None and where(L2).get('live') and where(L2).get('here') == [0] and where(L2).get('out') == [1, 2], L2 and where(L2))
        check('...the same two chart windows, not folded into one', charts() == ids, [ids, charts()])
    except Exception as e:
        import traceback; traceback.print_exc(); check('test ran', False, str(e))
    finally:
        try: subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception: proc.kill()
        bt.kill_profile(prof)
        httpd.shutdown(); time.sleep(0.5); shutil.rmtree(prof, ignore_errors=True)
    print('\nlongest pause between two frames in each chart window (ms):')
    for name, g in gaps: print('    %-48s %s' % (name, g))
    w = max(len(r[0]) for r in results) if results else 10
    for name, ok, got in results:
        print('%s  %s%s' % ('PASS' if ok else 'FAIL', name.ljust(w), '' if ok else '   got: ' + json.dumps(got, ensure_ascii=False)[:400]))
    bad = [r for r in results if not r[1]]
    print('\n%d checks, %d failed' % (len(results), len(bad)))
    return 1 if bad or not results else 0


if __name__ == '__main__':
    sys.exit(main())
