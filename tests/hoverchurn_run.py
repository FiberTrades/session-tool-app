# What runs under a hovering mouse (Nestor, 2 Nov 2026: "many buttons on the app when i hover over them they flicker"): a real mouse on a tab for 10 s at a window width where the tabs have to tighten.
# The tab row's fit must not run, and no CSS transition may start, while nothing changes. Run: python tests/hoverchurn_run.py
import base64, json, os, sys, time
import browser_test as bt, functools, http.server, threading, tempfile, subprocess, urllib.request, shutil, random
faulthandler_on = __import__('faulthandler'); faulthandler_on.dump_traceback_later(170, exit=True)
fails = 0
for width in (1000, 1400):
    edge = next(p for p in bt.EDGE_PATHS if os.path.exists(p)); web = bt.free_port()
    app = os.environ.get('E2E_APP', 'app.html')
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', web), functools.partial(bt.Quiet, directory=bt.ROOT)); threading.Thread(target=httpd.serve_forever, daemon=True).start()
    dbg = bt.free_port(); prof = tempfile.mkdtemp(prefix='edgeprof_hov_')
    proc = bt.edge_popen([edge, '--headless=new', '--remote-debugging-port=%d' % dbg, '--user-data-dir=' + prof, '--no-first-run', '--window-size=%d,1000' % width, '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        pages = []
        for _ in range(80):
            try:
                pages = [t for t in json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dbg, timeout=2).read()) if t.get('type') == 'page']
                if pages: break
            except Exception: pass
            time.sleep(0.25)
        c = bt.CDP(pages[0]['webSocketDebuggerUrl']); c.call('Page.enable'); c.call('Runtime.enable'); c.call('Page.bringToFront'); c.call('Emulation.setFocusEmulationEnabled', enabled=True)
        c.call('Emulation.setDeviceMetricsOverride', width=width, height=1000, deviceScaleFactor=1, mobile=False)
        c.call('Page.navigate', url='http://127.0.0.1:%d/%s?e2e=%d' % (web, app, random.randint(1, 10 ** 9))); time.sleep(2); c.eval(bt.PRELUDE); time.sleep(4)
        c.eval("window.isSessionLive = function () { return true; }; document.querySelector('.tab[data-page=\"trades\"]').click(); 1"); time.sleep(3)
        r = json.loads(c.eval("JSON.stringify((function(){ var t = document.querySelector('.container > .tabs .tab[data-page=\"bias\"]').getBoundingClientRect(); return { x: t.left + t.width / 2, y: t.top + t.height / 2 }; })())"))
        c.call('Input.dispatchMouseEvent', type='mouseMoved', x=r['x'], y=r['y']); time.sleep(1)
        got = json.loads(c.eval(r"""(async function () {
          var row = document.querySelector('.container > .tabs'), writes = 0, runs = 0, mo = new MutationObserver(function (m) { writes += m.length; }); mo.observe(row, { attributes: true, subtree: true, childList: true, characterData: true });
          var tr = function () { runs++; }; document.addEventListener('transitionrun', tr, true);
          var hovered = document.querySelector('.tab:hover') ? 1 : 0;
          await new Promise(function (r) { setTimeout(r, 10000); });
          mo.disconnect(); document.removeEventListener('transitionrun', tr, true);
          return JSON.stringify({ hovered: hovered, writes: writes, transitions: runs, tight: row.className });
        })()"""))
        ok = got['writes'] == 0 and got['transitions'] == 0
        print('%s  width %d, mouse on a tab, 10 s: %s' % ('PASS' if ok else 'FAIL', width, json.dumps(got)))
        fails += 0 if ok else 1
    finally:
        subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); bt.kill_profile(prof); httpd.shutdown(); time.sleep(.3); shutil.rmtree(prof, ignore_errors=True)
print('\n%d failed' % fails)
sys.exit(1 if fails else 0)
