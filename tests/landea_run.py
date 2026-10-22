# -*- coding: utf-8 -*-
"""A phone on its side: the EA panel sits right of the chart's timeframe button, on its row (Nestor, 22 Oct 2026: "on phone
landscape move the EA next to the TF, leave the TF where it is and place then EA to its right").

    python tests/landea_run.py

Live Charts in headless Edge with phone metrics and touch media (signed out, stand-in nothing: no account is touched):
- opened in portrait and turned to landscape (780 x 360, his case): folded strip and open panel both beside the "1m" button;
- a narrower phone opened in landscape (740 x 340): the panel on the chart beside the button, not under the chart;
- portrait (375 x 812): the panel under the chart as before;
- a computer (1280 x 900, mouse): the panel at the chart's top left as before (the timeframe in the top bar).
"""
import functools, http.server, json, os, random, shutil, subprocess, sys, tempfile, threading, time, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import browser_test as bt   # noqa: E402

OPEN = r"""(async function(col){ var W = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  for (var i = 0; i < 200 && !(window.__stPractice && window.__stLC); i++) await W(100); await W(600);
  try { STCloud.getData()._tourDoneV1 = true; } catch (e) {}
  var css = document.createElement('style'); css.textContent = '.stc-gate, #onboarding-modal-bg, .onboarding-modal-bg, #lp-front, [class^="st-tour"], .st-welcome, #st-demo-bar { display: none !important; }'; document.head.appendChild(css);
  var P = window.__stPractice, C = P._cfg(); C.layout = 1; C.tfs = [1, 15, 60, 240]; C.max = false; C.mm = Object.assign({}, C.mm, { col: col, on: false });
  document.querySelector('.tab[data-page="livecharts"]').click();
  for (var k = 0; k < 250 && !(P._s() && P._s().live && P._panes().length && P._panes()[0].n); k++) await W(100); await W(1200); return 1; })(%s)"""
MEASURE = r"""(function(){ var q = function(e){ if (!e || !e.offsetWidth) return null; var r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; };
  var mm = document.getElementById('stpr-mm'), pill = document.querySelector('#stpr-grid .stpr-pane .stpr-ptfw .stpr-tfpill'), tl = document.getElementById('stpr-tl'), cw = document.getElementById('stpr-cw');
  return JSON.stringify({ parent: mm && mm.parentElement && mm.parentElement.id, cls: mm && mm.className, mm: q(mm), pill: q(pill), cw: q(cw), tlStyle: tl && tl.getAttribute('style') || '' }); })()"""


def run(edge, wp, w, h, touch, col, rotate_from=None):
    dp = bt.free_port(); prof = tempfile.mkdtemp(prefix='edgeprof_landea_')
    proc = subprocess.Popen([edge, '--headless=new', '--remote-debugging-port=%d' % dp, '--user-data-dir=' + prof, '--no-first-run', '--window-size=1400,1000', 'about:blank'],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        pages = []
        for _ in range(80):
            try:
                pages = [t for t in json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dp, timeout=2).read()) if t.get('type') == 'page']
                if pages: break
            except Exception: pass
            time.sleep(0.25)
        c = bt.CDP(pages[0]['webSocketDebuggerUrl']); c.call('Page.enable'); c.call('Runtime.enable')
        def metrics(mw, mh):
            land = mw > mh
            c.call('Emulation.setDeviceMetricsOverride', width=mw, height=mh, deviceScaleFactor=2, mobile=touch,
                   screenOrientation={'type': 'landscapePrimary' if land else 'portraitPrimary', 'angle': 90 if land else 0})
        metrics(*(rotate_from or (w, h)))
        if touch:
            c.call('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
            c.call('Emulation.setEmulatedMedia', features=[{'name': 'hover', 'value': 'none'}, {'name': 'pointer', 'value': 'coarse'}, {'name': 'any-hover', 'value': 'none'}, {'name': 'any-pointer', 'value': 'coarse'}])
        c.call('Page.addScriptToEvaluateOnNewDocument', source='window.__stLcForce = true;')
        c.call('Page.navigate', url='http://127.0.0.1:%d/app.html?x=%d' % (wp, random.randint(1, 10 ** 9))); time.sleep(3)
        ev = lambda js: c.call('Runtime.evaluate', expression=js, awaitPromise=True, returnByValue=True)['result'].get('value')
        ev(OPEN % ('true' if col else 'false'))
        if rotate_from:
            metrics(w, h); time.sleep(0.3)
            ev("window.dispatchEvent(new Event('resize')); window.dispatchEvent(new Event('orientationchange')); 1"); time.sleep(1.5)
        return json.loads(ev(MEASURE))
    finally:
        subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try: bt.kill_profile(prof)
        except Exception: pass
        shutil.rmtree(prof, ignore_errors=True)


def beside(m):
    return bool(m and m['parent'] == 'stpr-tl' and m['mm'] and m['pill'] and abs(m['mm'][1] - m['pill'][1]) <= 2 and 0 <= m['mm'][0] - m['pill'][2] <= 12)


def main():
    edge = next((p for p in bt.EDGE_PATHS if os.path.exists(p)), None)
    if not edge:
        print('Microsoft Edge not found'); return 2
    wp = bt.free_port()
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', wp), functools.partial(bt.Quiet, directory=bt.ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    results = []
    def check(name, ok, got=None): results.append({'name': name, 'ok': bool(ok), 'got': got})
    try:
        m = run(edge, wp, 780, 360, True, True, rotate_from=(360, 780))
        check('turned from portrait to landscape (780 x 360), folded: the strip beside the 1m button, on its row', beside(m) and 'strip' in m['cls'], m)
        m = run(edge, wp, 780, 360, True, False, rotate_from=(360, 780))
        check('...the panel open: beside the button too, its top level with it', beside(m) and 'drop' in m['cls'], m)
        m = run(edge, wp, 740, 340, True, True)
        check('a narrower phone opened in landscape (740 x 340): on the chart beside the button, not under the chart', beside(m), m)
        m = run(edge, wp, 375, 812, True, True)
        check('portrait (375 x 812): the panel under the chart, as before', m['parent'] == 'stpr-win' and m['mm'] and m['cw'] and m['mm'][1] >= m['cw'][3] - 2 and not m['tlStyle'], m)
        m = run(edge, wp, 1280, 900, False, True)
        check('a computer (1280 x 900): at the chart\'s top left as before, nothing moved by this', m['parent'] == 'stpr-tl' and not m['tlStyle'] and m['mm'] and m['cw'] and m['mm'][0] - m['cw'][0] < 40, m)
    finally:
        httpd.shutdown()
    width = max(len(r['name']) for r in results)
    for r in results:
        print('%s  %s%s' % ('PASS' if r['ok'] else 'FAIL', r['name'].ljust(width), '' if r['ok'] else '   got: ' + json.dumps(r['got'])[:400]))
    bad = [r for r in results if not r['ok']]
    print('\n%d checks, %d failed' % (len(results), len(bad)))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
