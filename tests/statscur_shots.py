# Screenshots for statscur_e2e.js (29 Oct 2026): Statistics > Overview in "All accounts" with a £ and a $ account - the money cards and
# the win / loss cards - on a computer and at 375 px. With a second folder (another checkout, e.g. main before a change) it shoots that
# one instead and names the files "before".
#   python tests/statscur_shots.py OUT_FOLDER [OTHER_CHECKOUT]
import base64, functools, http.server, json, os, random, shutil, subprocess, sys, tempfile, threading, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
os.environ.setdefault('E2E_TIMEOUT', '600')
import browser_test as bt
SHOTS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(tempfile.gettempdir(), 'st_statscur')
SERVE = sys.argv[2] if len(sys.argv) > 2 else ROOT
TAG = 'before' if len(sys.argv) > 2 else 'after'
os.makedirs(SHOTS, exist_ok=True)
SRC = open(os.path.join(HERE, 'statscur_e2e.js'), encoding='utf-8').read()
REDRAW = ("(async function(){ var W = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }; var st = document.createElement('style'); st.textContent = '#st-offline-bar { display: none !important; }'; document.head.appendChild(st); try { window.__scD.accounts[1].currency = 'USD'; } catch (e) {}"
          " data.viewScope = 'lifetime'; try { renderTradesStats(); } catch (e) {} await W(400); var b = document.querySelector('.stx-tab[data-stx=\"overview\"]'); if (b) b.click(); await W(500); return 1; })()")
RECT = ("JSON.stringify((function(sel){ var e = document.querySelector(sel); if (!e) return null; e.scrollIntoView({ block: 'start' }); var r = e.getBoundingClientRect();"
        " return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; })('%s'))")


def run(view, w, h, mob):
    edge = next(p for p in bt.EDGE_PATHS if os.path.exists(p))
    wp = bt.free_port(); httpd = http.server.ThreadingHTTPServer(('127.0.0.1', wp), functools.partial(bt.Quiet, directory=SERVE))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    dp = bt.free_port(); prof = tempfile.mkdtemp(prefix='edgeprof_statscur_')
    proc = bt.edge_popen([edge, '--headless=new', '--remote-debugging-port=%d' % dp, '--user-data-dir=' + prof, '--no-first-run', '--hide-scrollbars',
                          '--window-size=%d,%d' % (max(w, 800), max(h, 800)), 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        pages = []
        for _ in range(80):
            try:
                pages = [t for t in json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dp, timeout=2).read()) if t.get('type') == 'page']
                if pages: break
            except Exception: pass
            time.sleep(0.25)
        c = bt.CDP(pages[0]['webSocketDebuggerUrl']); c.call('Page.enable'); c.call('Runtime.enable')
        c.call('Emulation.setDeviceMetricsOverride', width=w, height=h, deviceScaleFactor=2, mobile=mob)
        c.call('Page.navigate', url='http://127.0.0.1:%d/app.html?e2e=%d' % (wp, random.randint(1, 10 ** 9))); time.sleep(2)
        c.eval(bt.PRELUDE)
        c.eval(SRC)
        c.eval(REDRAW); time.sleep(1)
        for name, sel in (('cards', '.zr.zr-4[data-stx="overview"]'), ('winloss', '#wl-win-count')):
            r = json.loads(c.eval(RECT % sel) or 'null')
            if name == 'winloss' and r:
                r = json.loads(c.eval(RECT % '.zr:has(#wl-win-count)') or 'null') or r
            if not r: print('no', sel); continue
            time.sleep(0.4)
            img = c.call('Page.captureScreenshot', format='png', captureBeyondViewport=True, clip={'x': max(0, r['x'] - 8), 'y': max(0, r['y'] - 8), 'width': r['w'] + 16, 'height': r['h'] + 16, 'scale': 1})
            p = os.path.join(SHOTS, 'statscur_%s_%s_%s.png' % (TAG, view, name)); open(p, 'wb').write(base64.b64decode(img['data'])); print('shot', p)
    finally:
        try: subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception: proc.kill()
        bt.kill_profile(prof)
        httpd.shutdown(); shutil.rmtree(prof, ignore_errors=True)


run('desk', 1600, 960, False)
run('phone', 375, 812, True)
