# Runs popchat_e2e.js (27 Oct 2026): the Charts chat in Live Charts' own window. A stand-in EA 9.03 through a local relay, the app in
# headless Edge; the pop-up given a computer's size (headless opens them at 784 x 528); then screenshots of that window, dark and light.
#   python tests/popchat_run.py [screenshot folder]
import base64, calendar, functools, http.server, json, os, random, socket, subprocess, sys, tempfile, threading, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
os.environ.setdefault('E2E_TIMEOUT', '900')
import browser_test as bt
T0 = calendar.timegm((2026, 10, 14, 8, 30, 0))
TOK = 'st-test-popchat'
SHOTS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(tempfile.gettempdir(), 'st_popchat')
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
    out = os.path.join(tempfile.gettempdir(), 'st_fake_ea_popchat.json')
    ea = subprocess.Popen([sys.executable, os.path.join(HERE, 'fake_ea_livecharts.py'), TOK, '500', out, 'EURUSD', str(T0), '1.1640', '5', '90001234'],
                          env=dict(os.environ, ST_RELAY='127.0.0.1:%d' % rport, ST_FAKE_V='9.03'))
    time.sleep(2)
    test_js = open(os.path.join(HERE, 'popchat_e2e.js'), encoding='utf-8').read().replace('__RELAY__', 'ws://127.0.0.1:%d/realtime/v1/websocket?vsn=1.0.0' % rport).replace('__TOK__', TOK)
    edge = next((p for p in bt.EDGE_PATHS if os.path.exists(p)), None)
    web_port = bt.free_port()
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', web_port), functools.partial(bt.Quiet, directory=bt.ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    dbg_port = bt.free_port(); prof = tempfile.mkdtemp(prefix='edgeprof_popchat_')
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
        shot(dbg_port, 'popchat_window_dark.png')
        # a real click with the mouse on the picture in that window (2 Nov 2026: "i am clicking on this image and its not opening?"), and on the dark to close it
        sat = next((SESS[t] for t in SESS), None)
        if sat:
            sat.call('Runtime.enable')
            xy = sat.eval("(function(){var m=document.querySelector('[data-mid=\"fpic\"] .dcx-media'); if(!m) return ''; m.scrollIntoView({block:'center'}); var q=m.getBoundingClientRect(); return JSON.stringify([q.left+q.width/2,q.top+q.height/2]);})()")
            time.sleep(0.3)
            if xy:
                x, y = json.loads(xy)
                for t, b in (('mouseMoved', 0), ('mousePressed', 1), ('mouseReleased', 0)):
                    sat.call('Input.dispatchMouseEvent', type=t, x=x, y=y, button='left' if t != 'mouseMoved' else 'none', buttons=b, clickCount=0 if t == 'mouseMoved' else 1)
                time.sleep(0.8)
                opened = sat.eval("(function(){var o=document.getElementById('dcx-img'); return !!(o&&o.classList.contains('open'));})()")
                print('%s  a real mouse click on the picture in Live Charts\' window opens it' % ('PASS' if opened else 'FAIL'))
                if not opened: rc = 1
                shot(dbg_port, 'popchat_picture_big.png')
                for t, b in (('mouseMoved', 0), ('mousePressed', 1), ('mouseReleased', 0)):
                    sat.call('Input.dispatchMouseEvent', type=t, x=20, y=500, button='left' if t != 'mouseMoved' else 'none', buttons=b, clickCount=0 if t == 'mouseMoved' else 1)
                time.sleep(0.5)
                closed = sat.eval("(function(){var o=document.getElementById('dcx-img'); return !(o&&o.classList.contains('open'));})()")
                print('%s  ...a real click on the dark closes it' % ('PASS' if closed else 'FAIL'))
                if not closed: rc = 1
                # Nestor, 3 Nov 2026: "the X doesnt work!!! i cant come out the picture!!": the X itself, with a real mouse
                for t, b in (('mouseMoved', 0), ('mousePressed', 1), ('mouseReleased', 0)):
                    sat.call('Input.dispatchMouseEvent', type=t, x=x, y=y, button='left' if t != 'mouseMoved' else 'none', buttons=b, clickCount=0 if t == 'mouseMoved' else 1)
                time.sleep(0.8)
                info = json.loads(sat.eval("(function(){var b=document.getElementById('dcx-img-x'), o=document.getElementById('dcx-img'); if(!b||!o) return JSON.stringify({none:1}); var q=b.getBoundingClientRect(), cx=q.left+q.width/2, cy=q.top+q.height/2, top=document.elementFromPoint(cx,cy); return JSON.stringify({open:o.classList.contains('open'), x:cx, y:cy, w:q.width, h:q.height, top:top&&(top.id||top.className||top.tagName), z:getComputedStyle(o).zIndex, parent:o.parentNode&&o.parentNode.tagName, inView:window.innerWidth});})()"))
                print('info', info)
                if info.get('open'):
                    for t, b in (('mouseMoved', 0), ('mousePressed', 1), ('mouseReleased', 0)):
                        sat.call('Input.dispatchMouseEvent', type=t, x=info['x'], y=info['y'], button='left' if t != 'mouseMoved' else 'none', buttons=b, clickCount=0 if t == 'mouseMoved' else 1)
                    time.sleep(0.5)
                closed = sat.eval("(function(){var o=document.getElementById('dcx-img'); return !(o&&o.classList.contains('open'));})()")
                print('%s  ...and a real click on its X closes it' % ('PASS' if (closed and info.get('open')) else 'FAIL'))
                if not (closed and info.get('open')): rc = 1
                # ...and when something lies over the X and swallows clicks on the page
                for t, b in (('mouseMoved', 0), ('mousePressed', 1), ('mouseReleased', 0)):
                    sat.call('Input.dispatchMouseEvent', type=t, x=x, y=y, button='left' if t != 'mouseMoved' else 'none', buttons=b, clickCount=0 if t == 'mouseMoved' else 1)
                time.sleep(0.8)
                sat.eval("(function(){var c=document.createElement('div'); c.id='x-cover'; c.style.cssText='position:fixed;top:0;right:0;width:200px;height:120px;z-index:2147483647'; document.body.appendChild(c); window.__xEat=function(e){ e.stopPropagation(); }; document.addEventListener('click',window.__xEat,true); return 1;})()")
                for t, b in (('mouseMoved', 0), ('mousePressed', 1), ('mouseReleased', 0)):
                    sat.call('Input.dispatchMouseEvent', type=t, x=info['x'], y=info['y'], button='left' if t != 'mouseMoved' else 'none', buttons=b, clickCount=0 if t == 'mouseMoved' else 1)
                time.sleep(0.5)
                closed2 = sat.eval("(function(){var o=document.getElementById('dcx-img'); var r=!(o&&o.classList.contains('open')); document.removeEventListener('click',window.__xEat,true); var c=document.getElementById('x-cover'); if(c) c.remove(); return r;})()")
                print('%s  ...and still closes with something lying over the X and taking clicks' % ('PASS' if closed2 else 'FAIL'))
                if not closed2: rc = 1
        cdp.eval("(function(){ var d = window.__pcSat && window.__pcSat.document; var b = d && d.querySelector('.plat-top [data-pltheme]'); if (b) b.click(); return 1; })()")
        time.sleep(2)
        shot(dbg_port, 'popchat_window_light.png')
        # Replay in Live Charts' own window keeps a way back (6 Nov 2026, Nestor: "on the bottom chart how do i go back to live charts? the buttons
        # have dissapeared and also the chart above says replay and below says live charts still"): that window copied the app's classes once, as it
        # opened, so its Live button could stay hidden; its title said Live Charts in Replay
        cdp.eval("(function(){ var d = window.__pcSat && window.__pcSat.document; var b = d && d.querySelector('[data-plrp]'); if (b) b.click(); return 1; })()")
        time.sleep(1.5)
        cdp.eval("(function(){ var d = window.__pcSat && window.__pcSat.document; var b = (d && d.querySelector('[data-lca=\"1\"]')) || document.querySelector('[data-lca=\"1\"]'); if (b) b.click(); return 1; })()")
        rp = {}
        for _ in range(40):
            time.sleep(0.5)
            raw = cdp.eval("(function(){ var w = window.__pcSat, d = w && w.document, b = d && d.getElementById('stpr-lvback'), S = window.__stPractice._s(); return JSON.stringify({ replay: !!(S && !S.live), btn: b ? w.getComputedStyle(b).display : 'none', inWin: !!(b && b.ownerDocument === d), ok: !!(d && d.body.classList.contains('st-lcm-ok')), title: d && d.title }); })()")
            rp = json.loads(raw) if isinstance(raw, str) else {}
            if rp.get('replay') and rp.get('btn') != 'none' and str(rp.get('title', '')).startswith('Replay'): break
        good = rp.get('replay') and rp.get('btn') != 'none' and rp.get('inWin') and str(rp.get('title', '')).startswith('Replay')
        print('%s  Replay in Live Charts\' window: its Live button shows and its title says Replay   %s' % ('PASS' if good else 'FAIL', json.dumps(rp)))
        if not good: rc = 1
        shot(dbg_port, 'popchat_window_replay.png')
        cdp.eval("(function(){ var d = window.__pcSat && window.__pcSat.document; var b = d && d.getElementById('stpr-lvback'); if (b) b.click(); return 1; })()")
        time.sleep(1.5); cdp.eval("(function(){ var d = window.__pcSat && window.__pcSat.document; var b = (d && d.querySelector('[data-lca=\"1\"]')) || document.querySelector('[data-lca=\"1\"]'); if (b) b.click(); return 1; })()")   # it asks first, as from the tab
        back = {}
        for _ in range(40):
            time.sleep(0.5)
            raw = cdp.eval("(function(){ var w = window.__pcSat, d = w && w.document, S = window.__stPractice._s(); return JSON.stringify({ live: !!(S && S.live), title: d && d.title }); })()")
            back = json.loads(raw) if isinstance(raw, str) else {}
            if back.get('live') and str(back.get('title', '')).startswith('Live'): break
        good = back.get('live') and str(back.get('title', '')).startswith('Live Charts')
        print('%s  ...and its Live button takes it back to live, the title with it   %s' % ('PASS' if good else 'FAIL', json.dumps(back)))
        if not good: rc = 1
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
