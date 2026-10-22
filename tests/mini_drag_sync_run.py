"""The Minimalist moves with the candles while the chart is dragged (Nestor, 22 Oct 2026: "if i click in the middle of this chart and
i drag the screen from side to side the sessions and P/D zone comes off their anchored candles then they reattach but it looks like
it has a lag").

A real mouse drag (the browser's own events) across a Replay chart with the Minimalist on - in the app's window, and on a chart in a
window of its own (chart.html), which paints on its own window's frames. After every frame of the window being dragged, once it is
on screen, the zone's left edge as drawn is compared with where its first candle is now: they must match in (nearly) every frame.
    python tests/mini_drag_sync_run.py            (the app as it is)
    E2E_APP=old.html python tests/mini_drag_sync_run.py
"""
import functools, http.server, json, os, shutil, subprocess, sys, tempfile, threading, time, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import browser_test as bt

PAGE = os.environ.get('E2E_APP', 'app.html')
OPEN = r"""(async function(){ var W = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  for (var i = 0; i < 200 && !window.__stPractice; i++) await W(100); await W(600);
  document.querySelectorAll('.stc-gate, #onboarding-modal-bg, .onboarding-modal-bg, #lp-front, [class^="st-tour"]').forEach(function(e){ e.style.setProperty('display', 'none', 'important'); });
  var P = window.__stPractice, C = P._cfg(); C.layout = 2; C.tfs = [15, 15, 240, 5]; C.max = true; C.mm = Object.assign({}, C.mm, { col: true }); C.resume = null; C.mini = true; C.miniOff = {};
  await P.open({ symbol: 'EURUSD', day: '2026-10-01' }); for (var k = 0; k < 100 && !(P._s() && P._panes().length === 2 && P._panes()[1].n); k++) await W(100);
  P._goto && P._goto('16:00'); P._render(); await W(1200); return 1; })()"""
POP = r"""(async function(){ var W = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }, P = window.__stPractice; P._pop(1);
  for (var k = 0; k < 120 && !(P._pops()[1] && P._pops()[1].ready && P._panes()[1].el.ownerDocument !== document && P._panes()[1].n); k++) await W(100); await W(1200);
  return P._panes()[1].el.ownerDocument !== document ? 1 : 0; })()"""
ARM = r"""(function(I){ var P = window.__stPractice, p = P._panes()[I], M = P._mini(I); if (!p._mz || !M || !M.zone) return JSON.stringify({ err: 'no zone' });
  var w = p.el.ownerDocument.defaultView, t = p.bars[M.zone.i0].time, S = window.__lag = { n: 0, bad: 0, max: 0, on: false, lo: null, hi: null };
  var sample = function(){ if (!S.on) return; var q = P._panes()[I]; if (!q || !q._mz) return; var x = P._xOfT(I, t), d = Math.abs(x - q._mz.x0); S.n++;
    if (S.lo == null || x < S.lo) S.lo = x; if (S.hi == null || x > S.hi) S.hi = x; if (d > 0.75) S.bad++; if (d > S.max) S.max = d; };
  (function loop(){ w.requestAnimationFrame(function(){ w.setTimeout(sample, 0); if (window.__lag === S) loop(); }); })();   // after each of that window's frames is on screen
  var r = p.el.getBoundingClientRect(), x = r.left + r.width * 0.6, y = r.top + r.height * 0.7, e = p.el.ownerDocument.elementFromPoint(x, y); return JSON.stringify({ x: x, y: y, at: e ? (e.className || e.tagName) + ' < ' + (e.parentNode && e.parentNode.className) : '' }); })(%d)"""


def main():
    edge = next((p for p in bt.EDGE_PATHS if os.path.exists(p)), None)
    web_port = bt.free_port()
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', web_port), functools.partial(bt.Quiet, directory=bt.ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    dbg_port = bt.free_port()
    prof = tempfile.mkdtemp(prefix='edgeprof_mds_')
    # HEADED=1: a real browser (off screen), each window on its own frame clock as on a desk with several screens; headless paints
    # every window in step, so a window that draws on another's frames looks fine there
    mode = ['--window-position=-32000,-32000', '--disable-features=CalculateNativeWinOcclusion', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'] if os.environ.get('HEADED') else ['--headless=new']
    proc = subprocess.Popen([edge, *mode, '--remote-debugging-port=%d' % dbg_port, '--user-data-dir=' + prof, '--disable-popup-blocking',
                             '--no-first-run', '--no-default-browser-check', '--window-size=1400,900', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    results = []
    def check(name, ok, got=None):
        results.append((name, bool(ok), got)); print(('ok ' if ok else 'NO ') + name, '' if ok else json.dumps(got)[:300], flush=True)
    def targets():
        return [t for t in json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dbg_port, timeout=2).read()) if t.get('type') == 'page']
    def ev(c, js, g=False):
        return (c.call('Runtime.evaluate', expression=js, awaitPromise=True, returnByValue=True, userGesture=g).get('result') or {}).get('value')
    def drag(c, main, x0, y0, what):
        c.call('Input.dispatchMouseEvent', type='mouseMoved', x=x0, y=y0, button='none')
        c.call('Input.dispatchMouseEvent', type='mousePressed', x=x0, y=y0, button='left', clickCount=1, buttons=1)
        ev(main, 'window.__lag.on = true')
        for k in range(1, 121):   # right, then back left: side to side
            dx = (k if k <= 60 else 120 - k) * 6
            c.call('Input.dispatchMouseEvent', type='mouseMoved', x=x0 + dx, y=y0, button='left', buttons=1)
            time.sleep(0.016)
        ev(main, 'window.__lag.on = false')
        c.call('Input.dispatchMouseEvent', type='mouseReleased', x=x0, y=y0, button='left', clickCount=1, buttons=0)
        st = json.loads(ev(main, 'JSON.stringify(window.__lag)')); print(what, st, flush=True); ev(main, 'window.__lag = null')
        check(what + ': dragged side to side, the chart moved', st['n'] > 30 and (st.get('hi') or 0) - (st.get('lo') or 0) > 100, st)
        check(what + ': the zone stays on its candle in (nearly) every frame - no trailing behind', st['bad'] <= max(2, st['n'] * 0.05), st)
    try:
        pages = []
        for _ in range(80):
            try:
                pages = targets()
                if pages: break
            except Exception: pass
            time.sleep(0.25)
        M = bt.CDP(pages[0]['webSocketDebuggerUrl']); M.call('Page.enable'); M.call('Runtime.enable')
        M.call('Page.navigate', url='http://127.0.0.1:%d/%s' % (web_port, PAGE)); time.sleep(3)
        ev(M, OPEN)
        v = json.loads(ev(M, ARM % 0)); check('a Replay chart with the Minimalist\'s zone', 'x' in v, v)
        if 'x' in v: drag(M, M, v['x'], v['y'], 'the app\'s window')
        ok = ev(M, POP, True); check('chart 2 in a window of its own', ok == 1, ok)
        cw = next((t for t in targets() if 'chart.html' in t.get('url', '')), None)
        if cw:
            Cw = bt.CDP(cw['webSocketDebuggerUrl']); Cw.call('Page.enable'); Cw.call('Runtime.enable')
            try: Cw.call('Page.bringToFront')
            except Exception: pass
            v = json.loads(ev(M, ARM % 1)); check('its zone', 'x' in v, v)
            if 'x' in v: drag(Cw, M, v['x'], v['y'], 'the chart\'s own window')
            # the app's window on another screen, on a clock of its own (a slower one here): the chart window must not wait for it
            ev(M, "window.requestAnimationFrame = function (cb) { return setTimeout(function () { cb(performance.now()); }, 45); }; 1")
            time.sleep(0.5)
            v = json.loads(ev(M, ARM % 1))
            if 'x' in v: drag(Cw, M, v['x'], v['y'], 'the chart\'s own window, the app\'s window on another screen\'s clock')
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
