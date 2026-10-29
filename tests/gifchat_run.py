# Runs gifchat_e2e.js (29 Oct 2026): GIFs in the Charts chat hold still after their ten seconds - the app window, then Live Charts' own window. A stand-in EA 9.03 through a local relay, the app in
# headless Edge; the pop-up given a computer's size (headless opens them at 784 x 528); then screenshots of that window, dark and light.
#   python tests/gifchat_run.py [screenshot folder]
import base64, calendar, functools, http.server, json, os, random, socket, subprocess, sys, tempfile, threading, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
os.environ.setdefault('E2E_TIMEOUT', '900')
import browser_test as bt
T0 = calendar.timegm((2026, 10, 14, 8, 30, 0))
TOK = 'st-test-gifchat'
SHOTS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(tempfile.gettempdir(), 'st_gifchat')
os.makedirs(SHOTS, exist_ok=True)
SESS = {}


def size_popups(dbg_port, stop):
    done = set()
    while not stop.is_set():
        try:
            for t in json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dbg_port, timeout=2).read()):
                if t.get('type') != 'page' or t['id'] in done or 'livecharts.html' not in t.get('url', ''):
                    continue
                c = bt.CDP(t['webSocketDebuggerUrl'])
                c.call('Emulation.setDeviceMetricsOverride', width=1440, height=940, deviceScaleFactor=1, mobile=False)
                done.add(t['id']); SESS[t['id']] = c
        except Exception:
            pass
        time.sleep(0.3)


def shot(dbg_port, name):
    for t in json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dbg_port, timeout=5).read()):
        if t.get('type') == 'page' and 'livecharts.html' in t.get('url', ''):
            c = SESS.get(t['id']) or bt.CDP(t['webSocketDebuggerUrl'])
            img = c.call('Page.captureScreenshot', format='png')
            out = os.path.join(SHOTS, name); open(out, 'wb').write(base64.b64decode(img['data'])); print('screenshot', out)
            return
    print('no Live Charts window')


def main():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); rport = s.getsockname()[1]; s.close()
    relay = subprocess.Popen([sys.executable, os.path.join(HERE, '..', 'relay', 'server.py')], env=dict(os.environ, PORT=str(rport)), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(60):
        try: socket.create_connection(('127.0.0.1', rport), timeout=1).close(); break
        except OSError: time.sleep(0.25)
    out = os.path.join(tempfile.gettempdir(), 'st_fake_ea_gifchat.json')
    ea = subprocess.Popen([sys.executable, os.path.join(HERE, 'fake_ea_livecharts.py'), TOK, '500', out, 'EURUSD', str(T0), '1.1640', '5', '90001234'],
                          env=dict(os.environ, ST_RELAY='127.0.0.1:%d' % rport, ST_FAKE_V='9.03'))
    time.sleep(2)
    test_js = open(os.path.join(HERE, 'gifchat_e2e.js'), encoding='utf-8').read().replace('__RELAY__', 'ws://127.0.0.1:%d/realtime/v1/websocket?vsn=1.0.0' % rport).replace('__TOK__', TOK)
    edge = next((p for p in bt.EDGE_PATHS if os.path.exists(p)), None)
    web_port = bt.free_port()
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', web_port), functools.partial(bt.Quiet, directory=bt.ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    dbg_port = bt.free_port(); prof = tempfile.mkdtemp(prefix='edgeprof_gifchat_')
    proc = bt.edge_popen([edge, '--headless=new', '--remote-debugging-port=%d' % dbg_port, '--user-data-dir=' + prof, '--no-first-run', '--no-default-browser-check',
                          '--window-size=1280,1000', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
                          '--disable-features=CalculateNativeWinOcclusion', '--disable-popup-blocking', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    rc = 1
    try:
        pages = []
        for _ in range(80):
            try:
                pages = [t for t in json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dbg_port, timeout=2).read()) if t.get('type') == 'page']
                if pages: break
            except Exception: pass
            time.sleep(0.25)
        cdp = bt.CDP(pages[0]['webSocketDebuggerUrl']); cdp.call('Page.enable'); cdp.call('Runtime.enable')
        try: cdp.call('Page.bringToFront'); cdp.call('Emulation.setFocusEmulationEnabled', enabled=True)
        except Exception: pass
        cdp.call('Emulation.setDeviceMetricsOverride', width=1600, height=960, deviceScaleFactor=1, mobile=False)
        cdp.call('Page.navigate', url='http://127.0.0.1:%d/app.html?e2e=%d' % (web_port, random.randint(1, 10 ** 9)))
        time.sleep(2)
        cdp.eval('window.__stPlatOff = false; 1')
        if not cdp.eval(bt.PRELUDE):
            print('The app did not load'); return 2
        stop = threading.Event(); threading.Thread(target=size_popups, args=(dbg_port, stop), daemon=True).start()
        raw = cdp.eval(test_js)
        results = json.loads(raw) if isinstance(raw, str) else (raw or [])
        for r in results:
            print('%s  %s%s' % ('PASS' if r.get('ok') else 'FAIL', r['name'], '' if r.get('ok') else '   got: ' + json.dumps(r.get('got'), ensure_ascii=False)[:500]))
        bad = [r for r in results if not r.get('ok')]
        print('\n%d checks, %d failed' % (len(results), len(bad)))
        rc = 1 if (bad or not results) else 0
        time.sleep(1)
        shot(dbg_port, 'gifchat_window_dark.png')
        cdp.eval("(function(){ var d = window.__pcSat && window.__pcSat.document; var b = d && d.querySelector('.plat-top [data-pltheme]'); if (b) b.click(); return 1; })()")
        time.sleep(2)
        shot(dbg_port, 'gifchat_window_light.png')
        stop.set()
        return rc
    finally:
        try: subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception: proc.kill()
        bt.kill_profile(prof)
        httpd.shutdown(); relay.terminate(); ea.terminate()
        time.sleep(0.5)
        import shutil; shutil.rmtree(prof, ignore_errors=True)


if __name__ == '__main__':
    sys.exit(main())
