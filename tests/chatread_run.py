# Runs chatread_e2e.js (27 Oct 2026): the Charts chat's unread count across reloads, then crops of the add-reaction faces (the reaction
# row, the hover toolbar, the message menu) dark and light, on a computer and at 375 px - as platchat_run.py, a stand-in EA through a
# local relay. With a second folder (another checkout, e.g. main before the change) it only takes the crops, named "before".
#   python tests/chatread_run.py OUT_FOLDER [OTHER_CHECKOUT]
import base64, calendar, functools, http.server, json, os, random, shutil, socket, subprocess, sys, tempfile, threading, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
os.environ.setdefault('E2E_TIMEOUT', '1500')   # three reloads and the crops take longer than the helper's 4 minutes
import browser_test as bt
T0 = calendar.timegm((2026, 10, 14, 8, 30, 0))
TOK = 'st-test-chatread-e2e'
SHOTS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(tempfile.gettempdir(), 'st_chatread_shots')
SERVE = sys.argv[2] if len(sys.argv) > 2 else ROOT
TAG = 'before' if len(sys.argv) > 2 else 'after'
os.makedirs(SHOTS, exist_ok=True)

s = socket.socket(); s.bind(('127.0.0.1', 0)); RPORT = s.getsockname()[1]; s.close()
relay = subprocess.Popen([sys.executable, os.path.join(ROOT, 'relay', 'server.py')], env=dict(os.environ, PORT=str(RPORT)), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(60):   # the relay up before the EA dials it
    try: socket.create_connection(('127.0.0.1', RPORT), timeout=1).close(); break
    except OSError: time.sleep(0.25)
out = os.path.join(tempfile.gettempdir(), 'st_fake_ea_chatread.json')
ea = subprocess.Popen([sys.executable, os.path.join(HERE, 'fake_ea_livecharts.py'), TOK, '600', out, 'EURUSD', str(T0), '1.1640', '5', '90001234'],
                      env=dict(os.environ, ST_RELAY='127.0.0.1:%d' % RPORT, ST_FAKE_V='9.03'))
time.sleep(2)
SRC = open(os.path.join(HERE, 'chatread_e2e.js'), encoding='utf-8').read().replace('__RELAY__', 'ws://127.0.0.1:%d/realtime/v1/websocket?vsn=1.0.0' % RPORT).replace('__TOK__', TOK)
fails = 0


def run(view, w, h, mob, phases):
    global fails
    edge = next(p for p in bt.EDGE_PATHS if os.path.exists(p))
    wp = bt.free_port(); httpd = http.server.ThreadingHTTPServer(('127.0.0.1', wp), functools.partial(bt.Quiet, directory=SERVE))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    dp = bt.free_port(); prof = tempfile.mkdtemp(prefix='edgeprof_chread_')
    proc = subprocess.Popen([edge, '--headless=new', '--remote-debugging-port=%d' % dp, '--user-data-dir=' + prof, '--no-first-run', '--hide-scrollbars',
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
        c.call('Emulation.setDeviceMetricsOverride', width=w, height=h, deviceScaleFactor=2, mobile=mob)
        if mob: c.call('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
        url = 'http://127.0.0.1:%d/app.html?e2e=%d' % (wp, random.randint(1, 10 ** 9))
        for ph in phases:
            c.call('Page.navigate', url=url); time.sleep(2.5)   # each phase a page load of its own (a reload)
            c.eval(bt.PRELUDE)
            raw = c.eval(SRC.replace('__PHASE__', ph))
            res = json.loads(raw) if isinstance(raw, str) else (raw or [])
            print('-- %s, phase %s --' % (view, ph))
            for r in res:
                print('%s  %s%s' % ('PASS' if r.get('ok') else 'FAIL', r['name'], '' if r.get('ok') else '   got: ' + json.dumps(r.get('got'), ensure_ascii=False)[:400]))
            if TAG == 'after' or ph != 'shot': fails += len([r for r in res if not r.get('ok')])
            if ph == 'shot': crops(c, view)
    finally:
        try: subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception: proc.kill()
        bt.kill_profile(prof)
        httpd.shutdown(); shutil.rmtree(prof, ignore_errors=True)


def clip(c, name, r, pad=10):
    if not r: print('no rect for', name); return
    x, y = max(0, r['x'] - pad), max(0, r['y'] - pad)
    img = c.call('Page.captureScreenshot', format='png', captureBeyondViewport=True, clip={'x': x, 'y': y, 'width': r['w'] + 2 * pad, 'height': r['h'] + 2 * pad, 'scale': 1})
    p = os.path.join(SHOTS, 'chatread_%s_%s.png' % (TAG, name)); open(p, 'wb').write(base64.b64decode(img['data'])); print('shot', p)


def crops(c, view):
    for th in ("dark", "light"):   # page coordinates: the app page may sit scrolled
        if th == 'light':
            c.eval("(function(){var P=window.__stPractice; if(P&&P._plTheme) P._plTheme(); else { var b=document.querySelector('.plat-top [data-pltheme]'); if(b) b.click(); } return 1;})()")
            time.sleep(1.5)
        if os.environ.get('CR_FULL'): full = c.call('Page.captureScreenshot', format='png'); open(os.path.join(SHOTS, 'chatread_%s_%s_%s_full.png' % (TAG, view, th)), 'wb').write(base64.b64decode(full['data']))
        rr = json.loads(c.eval("JSON.stringify((function(){var row=document.querySelector('.dcx-msg.__crfocus'); if(!row) return null; var a=row.getBoundingClientRect(), t=row.querySelector('.dcx-actions'), b=t?t.getBoundingClientRect():a; var x=Math.min(a.left,b.left), y=Math.min(a.top,b.top); return {x:x+scrollX, y:y+scrollY, w:Math.max(a.right,b.right)-x, h:Math.max(a.bottom,b.bottom)-y};})())") or 'null')
        clip(c, '%s_%s_row' % (view, th), rr)
        c.eval("(function(){var m=document.querySelector('.dcx-msg.__crfocus .dcx-more'); if(m) m.click(); return 1;})()"); time.sleep(0.6)
        mr = json.loads(c.eval("JSON.stringify((function(){var m=document.getElementById('dcx-menu'); if(!m||!m.classList.contains('open')) return null; var r=m.getBoundingClientRect(); return {x:r.left+scrollX, y:r.top+scrollY, w:r.width, h:r.height};})())") or 'null')
        clip(c, '%s_%s_menu' % (view, th), mr)
        c.eval("(function(){var m=document.getElementById('dcx-menu'); if(m) m.classList.remove('open'); return 1;})()")
        lt = c.eval("(function(){var w=document.getElementById('stpr-win'); return w && w.classList.contains('pl-lt') ? 'light' : 'dark';})()")
        print('theme', th, '->', lt)


try:
    if os.environ.get('CR_PHASES') == 'phone':
        pass
    elif os.environ.get('CR_PHASES'):
        run('desk', 1600, 960, False, os.environ['CR_PHASES'].split(','))
    elif TAG == 'after':
        run('desk', 1600, 960, False, ['1', '2', '3'])
        run('desk', 1600, 960, False, ['shot'])   # the crops in a fresh browser: nothing left over from the reloads
    else:
        run('desk', 1600, 960, False, ['shot'])
    run('phone', 375, 812, True, ['shot'])
finally:
    relay.terminate(); ea.terminate()
print('\n%d failed' % fails)
sys.exit(1 if fails else 0)
