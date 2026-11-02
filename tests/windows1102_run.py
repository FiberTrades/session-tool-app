# Runs windows1102_e2e.js (2 Nov 2026): chart windows behaviour Nestor reported - Replay to Live leaves every window where it is, no Live button
# while Live, the app's right-click menu in every window, menus kept inside a narrow window, Execute's lines follow Trade lines; then a REAL
# minimised window (the browser's own throttling on: none of the --disable-background flags) to measure the candle timers in the other windows.
# A stand-in EA through a local relay; nothing live is touched.
#   python tests/windows1102_run.py [screenshot folder]
#   E2E_APP=old.html python tests/windows1102_run.py      (another copy of the app, to see the old behaviour)
import base64, calendar, functools, http.server, json, os, random, shutil, socket, subprocess, sys, tempfile, threading, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import browser_test as bt
T0 = calendar.timegm((2026, 10, 14, 8, 30, 0))
TOK = 'st-test-windows1102'
SHOTS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(tempfile.gettempdir(), 'st_windows1102')
os.makedirs(SHOTS, exist_ok=True)
SESS = {}


def targets(dbg):
    return [t for t in json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dbg, timeout=5).read()) if t.get('type') == 'page']


def shot(dbg, part, name):
    for t in targets(dbg):
        if part in t.get('url', ''):
            c = SESS.get(t['id']) or bt.CDP(t['webSocketDebuggerUrl'])
            img = c.call('Page.captureScreenshot', format='png')
            out = os.path.join(SHOTS, name); open(out, 'wb').write(base64.b64decode(img['data'])); print('screenshot', out)
            return out
    print('no window for', part)


def size_popups(dbg, stop):
    """Headless opens every pop-up small: each new window is given a computer's size, as a member's would be."""
    done = set()
    while not stop.is_set():
        try:
            for t in targets(dbg):
                u = t.get('url', '')
                if t['id'] in done or not ('livecharts.html' in u or 'chart.html' in u):
                    continue
                c = bt.CDP(t['webSocketDebuggerUrl'])
                w, h = (1440, 940) if 'livecharts.html' in u else (1100, 680)
                c.call('Emulation.setDeviceMetricsOverride', width=w, height=h, deviceScaleFactor=1, mobile=False)
                done.add(t['id']); SESS[t['id']] = c
        except Exception:
            pass
        time.sleep(0.3)


def window_state(c, state):
    w = c.call('Browser.getWindowForTarget')
    c.call('Browser.setWindowBounds', windowId=w['windowId'], bounds={'windowState': state})


def real_click(c, kind, x, y):
    """A real mouse press through the browser, as a member's: 'right' fires the page's contextmenu; defaultPrevented says if the browser's menu is kept away."""
    for t in ('mouseMoved', 'mousePressed', 'mouseReleased'):
        c.call('Input.dispatchMouseEvent', type=t, x=x, y=y, button=(kind if t != 'mouseMoved' else 'none'), buttons=(2 if kind == 'right' and t == 'mousePressed' else 0), clickCount=(1 if t != 'mouseMoved' else 0))


def hide_part(cdp, dbg, part, results, stop):
    # ---- a real minimised window: the browser's own throttling, measured from the windows still on screen ----
    part('hidePrep')
    cdp.call('Emulation.setFocusEmulationEnabled', enabled=False)   # (it keeps a page "visible")
    window_state(cdp, 'minimized'); time.sleep(1.2)
    part('hideMain')
    window_state(cdp, 'normal'); cdp.call('Emulation.setFocusEmulationEnabled', enabled=True); time.sleep(1.2)
    part('showMain')
    part('stageOpen2')
    st = [x for x in targets(dbg) if 'livecharts.html' in x.get('url', '')]
    if st:
        c = bt.CDP(st[0]['webSocketDebuggerUrl'])
        window_state(c, 'minimized'); time.sleep(1.2)
        part('hideStage')
        window_state(c, 'normal'); time.sleep(.8)
    # the session voice, the app window minimised (a person has clicked in it; the database out of reach: the claim answers "unavailable", which speaks)
    cdp.call('Network.enable'); cdp.call('Network.setBlockedURLs', urls=['*supabase.co*'])
    for t in ('mousePressed', 'mouseReleased'): cdp.call('Input.dispatchMouseEvent', type=t, x=800, y=20, button='left', clickCount=1)
    time.sleep(.3)
    cdp.call('Emulation.setFocusEmulationEnabled', enabled=False)
    window_state(cdp, 'minimized'); time.sleep(1.2)
    part('voice')
    window_state(cdp, 'normal'); cdp.call('Emulation.setFocusEmulationEnabled', enabled=True)
    stop.set()
    for k, v in (json.loads(cdp.eval('JSON.stringify(window.__W1102rep || {})')) or {}).items():
        print('MEASURED', k, json.dumps(v))
    bad = [r for r in results if not r.get('ok')]
    print('\n%d checks, %d failed' % (len(results), len(bad)))
    return 1 if (bad or not results) else 0


def main():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); rport = s.getsockname()[1]; s.close()
    relay = subprocess.Popen([sys.executable, os.path.join(HERE, '..', 'relay', 'server.py')], env=dict(os.environ, PORT=str(rport)), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    out = os.path.join(tempfile.gettempdir(), 'st_fake_ea_windows1102.json')
    ea = subprocess.Popen([sys.executable, os.path.join(HERE, 'fake_ea_livecharts.py'), TOK, str(400 + 3 * int(os.environ.get('W1102_LONG', '0')) // 1000), out, 'EURUSD', str(T0), '1.1640', '5', '90001234'],
                          env=dict(os.environ, ST_RELAY='127.0.0.1:%d' % rport, ST_FAKE_V='9.03'))
    time.sleep(2)
    src = open(os.path.join(HERE, 'windows1102_e2e.js'), encoding='utf-8').read().replace('__RELAY__', 'ws://127.0.0.1:%d/realtime/v1/websocket?vsn=1.0.0' % rport).replace('__TOK__', TOK).replace('__LONG__', os.environ.get('W1102_LONG', '0'))
    edge = next((p for p in bt.EDGE_PATHS if os.path.exists(p)), None)
    web_port = bt.free_port()
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', web_port), functools.partial(bt.Quiet, directory=bt.ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    dbg = bt.free_port()
    prof = tempfile.mkdtemp(prefix='edgeprof_win1102_')
    proc = bt.edge_popen([edge, '--headless=new', '--remote-debugging-port=%d' % dbg, '--user-data-dir=' + prof, '--no-first-run', '--no-default-browser-check',
                          '--window-size=1280,1000', '--disable-popup-blocking', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    rc = 1
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
        cdp.call('Page.navigate', url='http://127.0.0.1:%d/%s?e2e=%d' % (web_port, os.environ.get('E2E_APP', 'app.html'), random.randint(1, 10 ** 9)))
        time.sleep(2)
        cdp.eval('window.__stPlatOff = false; 1')
        if not cdp.eval(bt.PRELUDE):
            print('The app did not load'); return 2
        stop = threading.Event(); threading.Thread(target=size_popups, args=(dbg, stop), daemon=True).start()

        def part(name):
            raw = cdp.eval('window.__W1102.' + name + '()')
            r = json.loads(raw) if isinstance(raw, str) else (raw or [])
            results.extend(r)
            for x in r:
                print('%s  %s%s' % ('PASS' if x.get('ok') else 'FAIL', x['name'], '' if x.get('ok') else '   got: ' + json.dumps(x.get('got'), ensure_ascii=False)[:500]), flush=True)

        cdp.eval(src)
        part('setup')
        hide_only = os.environ.get('W1102_HIDE')   # the minimised-window measurement alone (W1102_LONG: milliseconds hidden first, over 5 minutes to reach the browser's once-a-minute)
        if hide_only:
            return hide_part(cdp, dbg, part, results, stop)
        part('replayToLive')
        part('rightClick')
        shot(dbg, 'chart.html?slot=1', 'w1102_ctx_chartwin.png')
        part('execLines')
        shot(dbg, 'chart.html?slot=1', 'w1102_exec_off.png')
        part('stageOpen')
        # the right press through the browser in each window, so a menu the browser would show is really seen: the app keeps it away only if the
        # event's default is prevented (the page marks it, a press of a real mouse)
        for label, want in (('chart.html?slot=1', 'chart window'), ('livecharts.html', 'Live Charts window')):
            t = [x for x in targets(dbg) if label in x.get('url', '')]
            if not t:
                results.append({'name': want + ' found', 'ok': False, 'got': None}); continue
            c = SESS.get(t[0]['id']) or bt.CDP(t[0]['webSocketDebuggerUrl'])
            xy = json.loads(c.eval("""JSON.stringify((function(){ window.__ctxp = []; document.addEventListener('contextmenu', function(e){ setTimeout(function(){ window.__ctxp.push(e.defaultPrevented); }, 0); }); var pc = document.querySelector('.stpr-pc'), r = pc.getBoundingClientRect(); return { x: r.left + r.width * .4, y: r.top + r.height * .5, ax: r.right - 20, ay: r.top + r.height * .5 }; })())"""))
            real_click(c, 'right', xy['x'], xy['y']); time.sleep(.4)
            got = json.loads(c.eval("JSON.stringify({ p: window.__ctxp, menu: !!Array.prototype.filter.call(document.querySelectorAll('.stpr-ctx,.stpr-cm'), function(e){ return e.style.display !== 'none' && e.offsetWidth > 0; }).length })"))
            ok = got['p'] == [True] and got['menu']
            results.append({'name': 'a real right press on the candles in the ' + want + ': the app\'s menu, not the browser\'s', 'ok': ok, 'got': got})
            print('PASS ' if ok else 'FAIL ', results[-1]['name'], '' if ok else got, flush=True)
            real_click(c, 'right', xy['ax'], xy['ay']); time.sleep(.4)
            got = json.loads(c.eval("JSON.stringify({ p: window.__ctxp })"))
            ok = len(got['p']) == 2 and got['p'][1] is True
            results.append({'name': '...and on its price scale', 'ok': ok, 'got': got})
            print('PASS ' if ok else 'FAIL ', results[-1]['name'], '' if ok else got, flush=True)
            c.eval("document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })); 1")
        part('narrowMenu')
        shot(dbg, 'livecharts.html', 'w1102_copy_sheet_narrow.png')
        part('stageBack')
        # a small chart window: its menus stay inside it
        t = [x for x in targets(dbg) if 'chart.html?slot=1' in x.get('url', '')]
        if t:
            c = SESS.get(t[0]['id']) or bt.CDP(t[0]['webSocketDebuggerUrl'])
            c.call('Emulation.setDeviceMetricsOverride', width=640, height=430, deviceScaleFactor=1, mobile=False); time.sleep(.8)
            part('smallWin')
            shot(dbg, 'chart.html?slot=1', 'w1102_small_window.png')
            c.call('Emulation.setDeviceMetricsOverride', width=1100, height=680, deviceScaleFactor=1, mobile=False); time.sleep(.5)
        return hide_part(cdp, dbg, part, results, stop)
    finally:
        try: subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception: proc.kill()
        bt.kill_profile(prof)
        httpd.shutdown(); relay.terminate(); ea.terminate()
        time.sleep(0.5)
        shutil.rmtree(prof, ignore_errors=True)


if __name__ == '__main__':
    sys.exit(main())
