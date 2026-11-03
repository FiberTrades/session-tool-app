# Runs replaywin_e2e.js (3 Nov 2026): Live Charts' own window and two chart windows turn into Replay where they are and back; real windows, a stand-in EA
# through a local relay; nothing live is touched.
#   python tests/replaywin_run.py [screenshot folder]
#   E2E_APP=old.html python tests/replaywin_run.py      (another copy of the app, to see the old behaviour)
import base64, calendar, functools, http.server, json, os, random, shutil, socket, subprocess, sys, tempfile, threading, time, urllib.request
os.environ.setdefault('E2E_TIMEOUT', '500')
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import browser_test as bt
T0 = calendar.timegm((2026, 10, 14, 8, 30, 0))
TOK = 'st-test-replaywin'
SHOTS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(tempfile.gettempdir(), 'st_replaywin')
os.makedirs(SHOTS, exist_ok=True)
SESS = {}


def targets(dbg):
    return [t for t in json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dbg, timeout=5).read()) if t.get('type') == 'page']


def shot(dbg, part, name):
    for t in targets(dbg):
        if part in t.get('url', ''):
            c = SESS.get(t['id']) or bt.CDP(t['webSocketDebuggerUrl'])
            out = os.path.join(SHOTS, name); open(out, 'wb').write(base64.b64decode(c.call('Page.captureScreenshot', format='png')['data'])); print('screenshot', out)
            return


def size_popups(dbg, stop):
    done = set()
    while not stop.is_set():
        try:
            for t in targets(dbg):
                u = t.get('url', '')
                if t['id'] in done or not ('livecharts.html' in u or 'chart.html' in u): continue
                c = bt.CDP(t['webSocketDebuggerUrl'])
                w, h = (1440, 940) if 'livecharts.html' in u else (1100, 680)
                c.call('Emulation.setDeviceMetricsOverride', width=w, height=h, deviceScaleFactor=1, mobile=False)
                done.add(t['id']); SESS[t['id']] = c
        except Exception:
            pass
        time.sleep(0.3)


def main():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); rport = s.getsockname()[1]; s.close()
    relay = subprocess.Popen([sys.executable, os.path.join(HERE, '..', 'relay', 'server.py')], env=dict(os.environ, PORT=str(rport)), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    out = os.path.join(tempfile.gettempdir(), 'st_fake_ea_replaywin.json')
    ea = subprocess.Popen([sys.executable, os.path.join(HERE, 'fake_ea_livecharts.py'), TOK, '500', out, 'EURUSD', str(T0), '1.1640', '5', '90001234'],
                          env=dict(os.environ, ST_RELAY='127.0.0.1:%d' % rport, ST_FAKE_V='9.03'), stdout=subprocess.DEVNULL)
    time.sleep(2)
    src = open(os.path.join(HERE, 'replaywin_e2e.js'), encoding='utf-8').read().replace('__RELAY__', 'ws://127.0.0.1:%d/realtime/v1/websocket?vsn=1.0.0' % rport).replace('__TOK__', TOK)
    edge = next(p for p in bt.EDGE_PATHS if os.path.exists(p))
    wp = bt.free_port()
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', wp), functools.partial(bt.Quiet, directory=bt.ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    dbg = bt.free_port(); prof = tempfile.mkdtemp(prefix='edgeprof_rw_')
    proc = bt.edge_popen([edge, '--headless=new', '--remote-debugging-port=%d' % dbg, '--user-data-dir=' + prof, '--no-first-run', '--no-default-browser-check', '--window-size=1280,1000',
                          '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion', '--disable-popup-blocking', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    results = []
    try:
        pages = []
        for _ in range(80):
            try:
                pages = targets(dbg)
                if pages: break
            except Exception: pass
            time.sleep(0.25)
        cdp = bt.CDP(pages[0]['webSocketDebuggerUrl']); cdp.call('Page.enable'); cdp.call('Runtime.enable')
        try: cdp.call('Page.bringToFront'); cdp.call('Emulation.setFocusEmulationEnabled', enabled=True)
        except Exception: pass
        cdp.call('Emulation.setDeviceMetricsOverride', width=1600, height=960, deviceScaleFactor=1, mobile=False)
        cdp.call('Page.navigate', url='http://127.0.0.1:%d/%s?e2e=%d' % (wp, os.environ.get('E2E_APP', 'app.html'), random.randint(1, 10 ** 9)))
        time.sleep(2)
        cdp.eval('window.__stPlatOff = false; 1')
        if not cdp.eval(bt.PRELUDE):
            print('The app did not load'); return 2
        stop = threading.Event(); threading.Thread(target=size_popups, args=(dbg, stop), daemon=True).start()

        def part(name):
            raw = cdp.eval('window.__RW.' + name + '()')
            r = json.loads(raw) if isinstance(raw, str) else (raw or [])
            results.extend(r)
            for x in r:
                print('%s  %s%s' % ('PASS' if x.get('ok') else 'FAIL', x['name'], '' if x.get('ok') else '   got: ' + json.dumps(x.get('got'), ensure_ascii=False)[:500]), flush=True)

        cdp.eval(src)
        part('setup')
        part('toReplay')
        shot(dbg, 'livecharts.html', 'rw_stage_replay.png'); shot(dbg, 'chart.html?slot=1', 'rw_chart_replay.png')
        part('stageControls'); part('chartWinControls')
        t = [x for x in targets(dbg) if 'chart.html?slot=1' in x.get('url', '')]
        if t:
            c = SESS.get(t[0]['id']) or bt.CDP(t[0]['webSocketDebuggerUrl'])
            c.call('Emulation.setDeviceMetricsOverride', width=760, height=500, deviceScaleFactor=1, mobile=False); time.sleep(.8)
            part('narrowChartWin'); shot(dbg, 'chart.html?slot=1', 'rw_chart_narrow.png')
            c.call('Emulation.setDeviceMetricsOverride', width=1100, height=680, deviceScaleFactor=1, mobile=False); time.sleep(.5)
        part('noLive'); part('toLive')
        shot(dbg, 'livecharts.html', 'rw_stage_live_again.png'); shot(dbg, 'chart.html?slot=1', 'rw_chart_live_again.png')
        stop.set()
        bad = [r for r in results if not r.get('ok')]
        print('\n%d checks, %d failed' % (len(results), len(bad)))
        return 1 if (bad or not results) else 0
    finally:
        try: subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception: proc.kill()
        bt.kill_profile(prof); httpd.shutdown(); relay.terminate(); ea.terminate(); time.sleep(.5); shutil.rmtree(prof, ignore_errors=True)


if __name__ == '__main__':
    sys.exit(main())
