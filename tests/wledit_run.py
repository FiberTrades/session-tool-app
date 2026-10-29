# Runs wledit_e2e.js (29 Oct 2026): the Watchlist as TradingView's - on a computer (the Charts platform's panel) and on a phone at 375 px
# (the symbol menu). A stand-in EA 9.03 through a local relay; then screenshots: the list's menu, a row's x under the mouse and its
# right-click menu, Edit list, dark and light; on the phone a long press's menu and Edit list.
#   python tests/wledit_run.py [screenshot folder]
import base64, calendar, functools, http.server, json, os, random, shutil, socket, subprocess, sys, tempfile, threading, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
os.environ.setdefault('E2E_TIMEOUT', '900')
import browser_test as bt
T0 = calendar.timegm((2026, 10, 14, 8, 30, 0))
TOK = 'st-test-wledit'
SHOTS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(tempfile.gettempdir(), 'st_wledit')
os.makedirs(SHOTS, exist_ok=True)

s = socket.socket(); s.bind(('127.0.0.1', 0)); RPORT = s.getsockname()[1]; s.close()
relay = subprocess.Popen([sys.executable, os.path.join(ROOT, 'relay', 'server.py')], env=dict(os.environ, PORT=str(RPORT)), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(60):
    try: socket.create_connection(('127.0.0.1', RPORT), timeout=1).close(); break
    except OSError: time.sleep(0.25)
out = os.path.join(tempfile.gettempdir(), 'st_fake_ea_wledit.json')
ea = subprocess.Popen([sys.executable, os.path.join(HERE, 'fake_ea_livecharts.py'), TOK, '500', out, 'EURUSD', str(T0), '1.1640', '5', '90001234'],
                      env=dict(os.environ, ST_RELAY='127.0.0.1:%d' % RPORT, ST_FAKE_V='9.03'))
time.sleep(2)
SRC = open(os.path.join(HERE, 'wledit_e2e.js'), encoding='utf-8').read().replace('__RELAY__', 'ws://127.0.0.1:%d/realtime/v1/websocket?vsn=1.0.0' % RPORT).replace('__TOK__', TOK)
fails = 0

MENU = "(function(){ var b = document.querySelector('.plat-right [data-plwlmenu]'); if (b) b.click(); return 1; })()"
CLOSE = "(function(){ var e = document.querySelector('#stpr-win > .wl-cm'); if (e) e.style.display = 'none'; var d = document.querySelector('.plat-right [data-wldone]'); if (d && !d.hidden) d.click(); return 1; })()"
ROWXY = "JSON.stringify((function(){ var r = document.querySelector('.plat-right .pl-wlr[data-wlr=\"GBPUSD\"]'); if (!r) return null; var b = r.getBoundingClientRect(); return { x: b.left + b.width * 0.35, y: b.top + b.height / 2 }; })())"
EDIT = "(function(){ var b = document.querySelector('.plat-right [data-plwlmenu]'); if (b) b.click(); setTimeout(function(){ var e = document.querySelector('#stpr-win > .wl-cm [data-wlact=\"edit\"]'); if (e) e.click(); }, 200); return 1; })()"
THEME = "(function(){ var P = window.__stPractice; if (P && P._plTheme) P._plTheme(); return 1; })()"
LONG = ("(async function(){ var W = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }; var d = document.querySelector('#stpr-menu [data-wldone]'); if (d && !d.hidden) d.click(); await W(300);"
        " var r = document.querySelector('#stpr-wlrows .stpr-wlr[data-wlr=\"XAUUSD\"]'); if (!r) return 0; var b = r.querySelector('b').getBoundingClientRect(), x = b.left + 10, y = b.top + b.height / 2;"
        " r.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y, pointerId: 9, pointerType: 'touch', isPrimary: true })); await W(750);"
        " document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: x, clientY: y, pointerId: 9, pointerType: 'touch', isPrimary: true })); return 1; })()")


def run(view, w, h, mob):
    global fails
    edge = next(p for p in bt.EDGE_PATHS if os.path.exists(p))
    wp = bt.free_port(); httpd = http.server.ThreadingHTTPServer(('127.0.0.1', wp), functools.partial(bt.Quiet, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    dp = bt.free_port(); prof = tempfile.mkdtemp(prefix='edgeprof_wledit_')
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
            img = c.call('Page.captureScreenshot', format='png'); p = os.path.join(SHOTS, 'wledit_%s.png' % name); open(p, 'wb').write(base64.b64decode(img['data'])); print('shot', p)
        if mob:
            shot('phone_edit')
            c.eval(LONG); time.sleep(0.8); shot('phone_rowmenu')
        else:
            time.sleep(1)
            for th in ('dark', 'light'):
                c.eval(MENU); time.sleep(0.6); shot('desk_%s_menu' % th); c.eval(CLOSE); time.sleep(0.4)
                xy = json.loads(c.eval(ROWXY) or 'null')
                if xy:
                    c.call('Input.dispatchMouseEvent', type='mouseMoved', x=xy['x'], y=xy['y'])
                    time.sleep(0.4); shot('desk_%s_hover' % th)
                    c.call('Input.dispatchMouseEvent', type='mousePressed', x=xy['x'], y=xy['y'], button='right', clickCount=1)
                    c.call('Input.dispatchMouseEvent', type='mouseReleased', x=xy['x'], y=xy['y'], button='right', clickCount=1)
                    time.sleep(0.5); shot('desk_%s_rowmenu' % th); c.eval(CLOSE); time.sleep(0.3)
                c.eval(EDIT); time.sleep(0.8); shot('desk_%s_edit' % th); c.eval(CLOSE); time.sleep(0.4)
                if th == 'dark': c.eval(THEME); time.sleep(1.5)
    finally:
        try: subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception: proc.kill()
        bt.kill_profile(prof)
        httpd.shutdown(); shutil.rmtree(prof, ignore_errors=True)


try:
    run('computer', 1600, 960, False)
    run('phone', 375, 812, True)
finally:
    relay.terminate(); ea.terminate()
print('\n%d failed' % fails)
sys.exit(1 if fails else 0)
