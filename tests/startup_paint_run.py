# Start-up shows Session Bias and nothing else (Nestor, 25 Oct 2026: "when i reload the app i first see the charts tab then it takes me to
# the session bias, why is that? i want this fixed so on reload the first and only thing i see is the session bias, once the chart windows
# are opened on their own windows they can reload and appear back in those charts").
# A probe put in before any of the app's scripts records, on every frame from the first, the active tab and whether any of Charts is on
# screen (its page, the chart window, a chart's canvas, the phone platform). Three starts: a computer with chart windows set to reopen
# (they must reopen, in their own windows), a computer without, and a phone. Any frame with Charts on screen fails.
#   python tests/startup_paint_run.py
import functools, http.server, json, os, random, shutil, subprocess, sys, tempfile, threading, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import browser_test as bt
import faulthandler; faulthandler.cancel_dump_traceback_later()

PROBE = r"""window.__stLcForce = true; window.__stPaint = [];
(function () { var t0 = performance.now();
  function vis(el) { if (!el || !el.isConnected) return false; var cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
    var r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight; }
  function frame() { try { var at = document.querySelector('.tabs .tab.active'), pg = document.getElementById('page-livecharts'), win = document.getElementById('stpr-win'), bias = document.getElementById('page-bias');
      var cv = Array.prototype.some.call(document.querySelectorAll('#stpr-win canvas'), vis);
      window.__stPaint.push({ t: Math.round(performance.now() - t0), tab: at ? at.getAttribute('data-page') : '', lc: vis(pg), win: vis(win), cv: cv, bias: vis(bias), ph: !!(document.body && document.body.classList.contains('st-plph')) && vis(win) }); } catch (e) {}
    if (window.__stPaint.length < 40000) requestAnimationFrame(frame); }
  requestAnimationFrame(frame); })();"""


def main():
    edge = next(p for p in bt.EDGE_PATHS if os.path.exists(p))
    wp = bt.free_port(); httpd = http.server.ThreadingHTTPServer(('127.0.0.1', wp), functools.partial(bt.Quiet, directory=bt.ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    dp = bt.free_port(); prof = tempfile.mkdtemp(prefix='edgeprof_paint_')
    proc = subprocess.Popen([edge, '--headless=new', '--remote-debugging-port=%d' % dp, '--user-data-dir=' + prof, '--no-first-run', '--no-default-browser-check', '--disable-popup-blocking',
                             '--window-size=1500,950', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
                             '--disable-features=CalculateNativeWinOcclusion', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    res = []
    def ok(name, cond, got=None):
        res.append((name, bool(cond), got)); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '   got: ' + json.dumps(got, ensure_ascii=False)[:500]), flush=True)
    def lst():
        return [t for t in json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dp, timeout=3).read()) if t.get('type') == 'page']
    try:
        pages = []
        for _ in range(80):
            try:
                pages = lst()
                if pages: break
            except Exception: pass
            time.sleep(0.25)
        cdp = bt.CDP(pages[0]['webSocketDebuggerUrl']); cdp.call('Page.enable'); cdp.call('Runtime.enable')
        try: cdp.call('Page.bringToFront'); cdp.call('Emulation.setFocusEmulationEnabled', enabled=True)
        except Exception: pass
        cdp.call('Page.addScriptToEvaluateOnNewDocument', source=PROBE)
        base = 'http://127.0.0.1:%d/app.html' % wp

        def start(secs, until=None):
            cdp.call('Page.navigate', url=base + '?x=%d' % random.randint(1, 10 ** 9))
            end = time.time() + secs
            while time.time() < end:
                time.sleep(0.5)
                try:
                    if until and cdp.eval(until): time.sleep(2.5); break
                except Exception: pass
            return json.loads(cdp.eval('JSON.stringify(window.__stPaint || [])') or '[]')

        def judge(name, fr):
            bad = [f for f in fr if f.get('lc') or f.get('win') or f.get('cv') or f.get('ph') or (f.get('tab') and f.get('tab') != 'bias')]
            seen = [f for f in fr if f.get('bias')]
            ok(name + ': every frame from the first shows Session Bias only (%d frames over %.1f s)' % (len(fr), (fr[-1]['t'] / 1000.0) if fr else 0),
               fr and not bad and seen, {'frames': len(fr), 'bad': bad[:4], 'first_bias_ms': seen[0]['t'] if seen else None})

        # ---- a computer, chart windows set to reopen: set up two live charts with chart 2 remembered in its window ----
        cdp.call('Emulation.setDeviceMetricsOverride', width=1500, height=950, deviceScaleFactor=1, mobile=False)
        cdp.call('Page.navigate', url=base + '?x=%d' % random.randint(1, 10 ** 9)); time.sleep(3)
        print(cdp.eval(r"""(async function(){ var W = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
          for (var i = 0; i < 200 && !(window.__stPractice && window.__stLC); i++) await W(100); await W(800);
          var P = window.__stPractice, C = P._cfg(); C.layout = 2; C.tfs = [15, 60, 240, 5]; C.max = false; P._cfgSave && P._cfgSave();
          document.querySelector('.tab[data-page="livecharts"]').click();   // as a member who had them open: the two charts' candles in once
          for (var k = 0; k < 240 && !(P._s() && P._panes().length === 2 && P._panes().every(function(p){ return p.n > 0; })); k++) await W(250);
          var n = P._panes().map(function(p){ return p.n; });
          document.querySelector('.tab[data-page="bias"]').click(); await W(500);
          P._wsr.set({ on: true, slots: { '1': { x: 120, y: 90, w: 1000, h: 640 } } }); return 'set up ' + JSON.stringify(n); })()"""))
        fr = start(60, "(function(){ var P = window.__stPractice; return !!(P && P._pops && P._pops()[1] && P._pops()[1].ready && P._panes()[1] && P._panes()[1].n > 0); })()")
        judge('a computer, chart windows set to reopen', fr)
        st = json.loads(cdp.eval(r"""JSON.stringify((function(){ var P = window.__stPractice, o = P._pops()[1], p = P._panes()[1];
          return { open: !!(o && o.ready), inWin: !!(o && p && p.el.ownerDocument === o.w.document && p.n > 0), tab: document.querySelector('.tabs .tab.active').getAttribute('data-page') }; })())""") or '{}')
        ok('...chart 2 back in its own window, its chart drawn there; the app still on Session Bias', st.get('open') and st.get('inWin') and st.get('tab') == 'bias', st)
        wins = [t for t in lst() if 'chart.html' in t.get('url', '')]
        if wins:   # that window reloads by itself: its chart comes back in it
            cw = bt.CDP(wins[0]['webSocketDebuggerUrl']); cw.call('Page.reload'); time.sleep(8)
            st2 = json.loads(cdp.eval(r"""JSON.stringify((function(){ var P = window.__stPractice, o = P._pops()[1], p = P._panes()[1];
              return { open: !!(o && o.ready), inWin: !!(o && p && p.el.ownerDocument === o.w.document && p.n > 0), tab: document.querySelector('.tabs .tab.active').getAttribute('data-page') }; })())""") or '{}')
            ok('...that window reloaded by itself: its chart back in it, the app still on Session Bias', st2.get('open') and st2.get('inWin') and st2.get('tab') == 'bias', st2)
        cl = json.loads(cdp.eval(r"""(async function(){ var W = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }; var P = window.__stPractice;
          document.querySelector('.tab[data-page="livecharts"]').click(); for (var k = 0; k < 40 && !(P._panes()[0] && P._panes()[0].el.getBoundingClientRect().width > 100); k++) await W(150); await W(500);
          var r = { charts: P._panes()[0] ? Math.round(P._panes()[0].el.getBoundingClientRect().width) : 0, out: !!(P._pops()[1] && P._pops()[1].ready) };
          document.querySelector('.tab[data-page="bias"]').click(); await W(400); return JSON.stringify(r); })()""") or '{}')
        ok('...Charts opened by hand afterwards: chart 1 there at once, chart 2 still in its window', cl.get('charts', 0) > 100 and cl.get('out'), cl)
        for t in lst():
            if 'chart.html' in t.get('url', ''): urllib.request.urlopen('http://127.0.0.1:%d/json/close/%s' % (dp, t['id']), timeout=5)

        # ---- a computer, nothing set to reopen ----
        cdp.eval("(function(){ window.__stPractice._wsr.set({ on: false, slots: {} }); return 1; })()")
        judge('a computer, a plain reload', start(14))

        # ---- a phone ----
        cdp.call('Emulation.setDeviceMetricsOverride', width=390, height=844, deviceScaleFactor=2, mobile=True)
        cdp.call('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
        judge('a phone, a reload', start(14))
    finally:
        try: subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception: proc.kill()
        bt.kill_profile(prof); httpd.shutdown(); time.sleep(0.5); shutil.rmtree(prof, ignore_errors=True)
    bad = [r for r in res if not r[1]]
    print('\n%d checks, %d failed' % (len(res), len(bad)))
    return 1 if bad or not res else 0


if __name__ == '__main__':
    sys.exit(main())
