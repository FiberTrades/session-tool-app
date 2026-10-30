# Runs chartsel_e2e.js (30 Oct 2026): the Watchlist's rows kept while prices tick and named by their account, any press selects a
# chart and the top timeframes act on it alone, Candles in front of drawings. A stand-in EA 9.03 through a local relay, as wledit_run.py.
#   python tests/chartsel_run.py [screenshot folder]
import base64, calendar, functools, http.server, json, os, random, shutil, socket, subprocess, sys, tempfile, threading, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
os.environ.setdefault('E2E_TIMEOUT', '900')
import browser_test as bt
T0 = calendar.timegm((2026, 10, 14, 8, 30, 0))
TOK = 'st-test-chartsel'
SHOTS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(tempfile.gettempdir(), 'st_chartsel')
os.makedirs(SHOTS, exist_ok=True)

s = socket.socket(); s.bind(('127.0.0.1', 0)); RPORT = s.getsockname()[1]; s.close()
relay = subprocess.Popen([sys.executable, os.path.join(ROOT, 'relay', 'server.py')], env=dict(os.environ, PORT=str(RPORT)), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(60):
    try: socket.create_connection(('127.0.0.1', RPORT), timeout=1).close(); break
    except OSError: time.sleep(0.25)
out = os.path.join(tempfile.gettempdir(), 'st_fake_ea_chartsel.json')
ea = subprocess.Popen([sys.executable, os.path.join(HERE, 'fake_ea_livecharts.py'), TOK, '500', out, 'EURUSD', str(T0), '1.1640', '5', '90001234'],
                      env=dict(os.environ, ST_RELAY='127.0.0.1:%d' % RPORT, ST_FAKE_V='9.03'))
time.sleep(2)
SRC = open(os.path.join(HERE, 'chartsel_e2e.js'), encoding='utf-8').read().replace('__RELAY__', 'ws://127.0.0.1:%d/realtime/v1/websocket?vsn=1.0.0' % RPORT).replace('__TOK__', TOK)
fails = 0

def run(view, w, h, mob):
    global fails
    edge = next(p for p in bt.EDGE_PATHS if os.path.exists(p))
    wp = bt.free_port(); httpd = http.server.ThreadingHTTPServer(('127.0.0.1', wp), functools.partial(bt.Quiet, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    dp = bt.free_port(); prof = tempfile.mkdtemp(prefix='edgeprof_chartsel_')
    proc = bt.edge_popen([edge, '--headless=new', '--remote-debugging-port=%d' % dp, '--user-data-dir=' + prof, '--no-first-run', '--hide-scrollbars',
                          '--window-size=%d,%d' % (max(w, 800), max(h, 800)), '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
                          '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        pages = []
        for _ in range(80):
            try:
                pages = [t for t in json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dp, timeout=2).read()) if t.get('type') == 'page']
                if pages: break
            except Exception: pass
            time.sleep(0.25)
        c = bt.CDP(pages[0]['webSocketDebuggerUrl']); c.call('Page.enable'); c.call('Runtime.enable')
        try: c.call('Page.bringToFront'); c.call('Emulation.setFocusEmulationEnabled', enabled=True)
        except Exception: pass
        c.call('Emulation.setDeviceMetricsOverride', width=w, height=h, deviceScaleFactor=2 if mob else 1, mobile=mob)
        if mob: c.call('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
        c.call('Page.navigate', url='http://127.0.0.1:%d/app.html?e2e=%d' % (wp, random.randint(1, 10 ** 9))); time.sleep(2)
        c.eval(bt.PRELUDE)
        raw = c.eval(SRC)
        res = json.loads(raw) if isinstance(raw, str) else (raw or [])
        print('-- %s --' % view)
        for r in res:
            print('%s  %s%s' % ('PASS' if r.get('ok') else 'FAIL', r['name'], '' if r.get('ok') else '   got: ' + json.dumps(r.get('got'), ensure_ascii=False)[:400]))
        fails += len([r for r in res if not r.get('ok')])

        def shot(name):
            img = c.call('Page.captureScreenshot', format='png'); p = os.path.join(SHOTS, 'chartsel_%s.png' % name); open(p, 'wb').write(base64.b64decode(img['data'])); print('shot', p)
        shot('copy_dark')
        c.eval("(function(){ var P = window.__stPractice; if (P && P._plTheme) P._plTheme(); setTimeout(function(){ var b = document.querySelector('#stpr-mm [data-mm=acct]'); if (b) b.click(); setTimeout(function(){ var c = document.querySelector('#stpr-menu [data-cpsheet]'); if (c) c.click(); }, 1900); }, 1200); return 1; })()")
        time.sleep(4); shot('copy_light')
        c.eval("(function(){ var P = window.__stPractice; if (P && P._plTheme) P._plTheme(); document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return 1; })()")
        time.sleep(1.5); shot('candles_front')
        c.eval("(function(){ var p = window.__stPractice._panes()[0], pc = p.el.querySelector('.stpr-pc'), r = pc.getBoundingClientRect(); pc.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left + r.width * 0.3, clientY: r.top + r.height * 0.5, button: 2 })); setTimeout(function(){ var b = p.el.querySelector('.stpr-ctx [data-act=cfront]'); if (b) b.click(); }, 300); return 1; })()")
        time.sleep(1.5); shot('drawings_front')
        c.eval("(function(){ window.__stPractice._layout(4); return 1; })()"); time.sleep(5); shot('layout4')
        c.eval("(function(){ window.__stPractice._layout(8); return 1; })()"); time.sleep(5); shot('layout8')
    finally:
        try: subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception: proc.kill()
        bt.kill_profile(prof)
        httpd.shutdown(); shutil.rmtree(prof, ignore_errors=True)


try:
    run('computer', 1600, 960, False)
finally:
    relay.terminate(); ea.terminate()
print('\n%d failed' % fails)
sys.exit(1 if fails else 0)
