# Runs the Chat + Today test (platchat_e2e.js, 25 Oct 2026) as platform_run.py does - a stand-in EA 9.03 through a local relay, the app
# in headless Edge on a computer screen, then on a phone's - and saves screenshots (each rail panel, light and dark, on the computer) to SHOTS.
#   python tests/platchat_run.py [shots_folder]
import base64, calendar, functools, http.server, json, os, random, shutil, socket, subprocess, sys, tempfile, threading, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
os.environ.setdefault('E2E_TIMEOUT', '900')   # the computer and the phone runs together take longer than the helper's 4 minutes on a busy machine
import browser_test as bt
T0 = calendar.timegm((2026, 10, 14, 8, 30, 0))
TOK = 'st-test-platchat-e2e'
SHOTS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(tempfile.gettempdir(), 'st_platchat_shots')
os.makedirs(SHOTS, exist_ok=True)

s = socket.socket(); s.bind(('127.0.0.1', 0)); RPORT = s.getsockname()[1]; s.close()
relay = subprocess.Popen([sys.executable, os.path.join(ROOT, 'relay', 'server.py')], env=dict(os.environ, PORT=str(RPORT)), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(60):   # the relay up before the EA dials it (a busy machine takes a while)
    try: socket.create_connection(('127.0.0.1', RPORT), timeout=1).close(); break
    except OSError: time.sleep(0.25)
out = os.path.join(tempfile.gettempdir(), 'st_fake_ea_platchat.json')
ea = subprocess.Popen([sys.executable, os.path.join(HERE, 'fake_ea_livecharts.py'), TOK, '400', out, 'EURUSD', str(T0), '1.1640', '5', '90001234'],
                      env=dict(os.environ, ST_RELAY='127.0.0.1:%d' % RPORT, ST_FAKE_V='9.03'))
time.sleep(2)
src = open(os.path.join(HERE, 'platchat_e2e.js'), encoding='utf-8').read().replace('__RELAY__', 'ws://127.0.0.1:%d/realtime/v1/websocket?vsn=1.0.0' % RPORT).replace('__TOK__', TOK)
fails = 0


def run(view, w, h, mob):
    global fails
    edge = next(p for p in bt.EDGE_PATHS if os.path.exists(p))
    wp = bt.free_port(); httpd = http.server.ThreadingHTTPServer(('127.0.0.1', wp), functools.partial(bt.Quiet, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    dp = bt.free_port(); prof = tempfile.mkdtemp(prefix='edgeprof_pchat_')
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
        raw = c.eval(src)
        res = json.loads(raw) if isinstance(raw, str) else (raw or [])
        print('-- %s --' % view)
        for r in res:
            print('%s  %s%s' % ('PASS' if r.get('ok') else 'FAIL', r['name'], '' if r.get('ok') else '   got: ' + json.dumps(r.get('got'), ensure_ascii=False)[:300]))
        fails += len([r for r in res if not r.get('ok')])

        def shot(name):
            c.eval("(function(){document.querySelectorAll('[class^=\"st-tour\"], .st-greet-pop').forEach(function(e){e.remove();});var n=document.querySelector('.dcx-notif-no');if(n&&n.offsetParent)n.click();return 1;})()"); time.sleep(0.6)
            img = c.call('Page.captureScreenshot', format='png'); p = os.path.join(SHOTS, 'platchat_%s.png' % name); open(p, 'wb').write(base64.b64decode(img['data'])); print('shot', p)
        if mob:
            shot('phone')
        else:   # each rail panel, light (where the test left it) then dark
            for th in ('light', 'dark'):
                for k in ('wl', 'tm', 'ch', 'td', 'ot'):
                    c.eval("(function(){var b=document.querySelector('.plat-rail [data-plr=\"%s\"]'); if(b && !b.classList.contains('on')) b.click(); return 1;})()" % k); time.sleep(2.5 if k == 'ch' else 1.2)
                    shot('desk_%s_%s' % (k, th))
                c.eval("(function(){var b=document.querySelector('.plat-top [data-pltheme]'); if(b) b.click(); return 1;})()"); time.sleep(1.5)
    finally:
        try: subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception: proc.kill()
        bt.kill_profile(prof)
        httpd.shutdown(); shutil.rmtree(prof, ignore_errors=True)


try:
    run('computer', 1600, 960, False)
    run('phone', 390, 844, True)
finally:
    relay.terminate(); ea.terminate()
print('\n%d failed' % fails)
sys.exit(1 if fails else 0)
