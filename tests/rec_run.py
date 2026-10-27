# Runs the chart recording test (rec_e2e.js, 27 Oct 2026): a stand-in EA 9.03 (fake_ea_livecharts.py) on a throwaway channel through Session
# Terminal's relay on this machine, then the app in headless Edge on a 1920 x 1080 screen with Edge's stand-in camera and microphone, the tab's
# own capture accepted without a prompt (--auto-accept-this-tab-capture) and downloads into a folder of this run's own. Per format (YouTube,
# Reels, Instagram, Square) a 5 s recording; the saved MP4 is then read here too: its picture size, its sound track, its name. Pictures of the
# set-up, the platform while it records and one frame per format go to the folder given (default: a new folder in %TEMP%).
# Nothing live is touched; Edge is closed by its profile in a finally.
#   python tests/rec_run.py [out_dir]
import base64, calendar, faulthandler, functools, http.server, json, math, os, random, shutil, socket, struct, subprocess, sys, tempfile, threading, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import browser_test as bt

faulthandler.dump_traceback_later(900, exit=True)
T0 = calendar.timegm((2026, 10, 14, 8, 30, 0))
TOK = 'st-test-rec-e2e-%d' % os.getpid()
OUT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else tempfile.mkdtemp(prefix='st_rec_out_')
os.makedirs(OUT, exist_ok=True)
# (format, framing, width, height, the camera's corner): every corner once, Fill on the three tall and square formats, Fit once
# and the camera: framing (zoom; a drag) and background (None, Blur, a picture)
FORMATS = [('yt', None, 1920, 1080, 'bl', {'z': 1, 'bg': 'none'}), ('reel', 'fill', 1080, 1920, 'bl', {'z': 2, 'bg': 'none', 'drag': 30}), ('ig', 'fill', 1080, 1350, 'br', {'z': 1.5, 'bg': 'blur'}),
           ('sq', 'fill', 1080, 1080, 'tr', {'z': 1, 'bg': 'image'}), ('sq', 'fit', 1080, 1080, 'tl', {'z': 1, 'bg': 'none'})]


def stored_close(sym, dflt):
    try:
        req = urllib.request.Request('https://figozyxoyobixadhqewr.supabase.co/rest/v1/rpc/st_candles', method='POST',
            data=json.dumps({'p_symbol': sym, 'p_tf': 1, 'p_from': T0 - 3600, 'p_to': T0}).encode(),
            headers={'apikey': 'sb_publishable_h-TrkkVzrGOkwX6LxMDsaQ_hE8540Nv', 'Content-Type': 'application/json'})
        rows = json.loads(urllib.request.urlopen(req, timeout=15).read())
        if rows: return float(rows[-1]['c'])
    except Exception as e:
        print('stored close of', sym, 'not read, using', dflt, e)
    return dflt


def write_y4m(path, w=320, h=240, n=30):
    """The stand-in camera's picture, a file (Edge's own stand-in camera stops after its first use in a headless window, 27 Oct 2026): a warm
    backdrop and a round face drifting across it, as YUV4MPEG2."""
    with open(path, 'wb') as f:
        f.write(b'YUV4MPEG2 W%d H%d F30:1 Ip A1:1 C420jpeg\n' % (w, h))
        for k in range(n):
            cx, cy, r = w / 2 + math.sin(k / n * 2 * math.pi) * w * 0.12, h * 0.48, h * 0.26
            y = bytes(200 if (i - cx) ** 2 + (j - cy) ** 2 < r * r else 70 + 60 * j // h for j in range(h) for i in range(w))
            u = bytes(110 if (2 * i - cx) ** 2 + (2 * j - cy) ** 2 < r * r else 150 for j in range(h // 2) for i in range(w // 2))
            v = bytes(160 if (2 * i - cx) ** 2 + (2 * j - cy) ** 2 < r * r else 120 for j in range(h // 2) for i in range(w // 2))
            f.write(b'FRAME\n' + y + u + v)


def mp4_boxes(b, a=0, z=None, depth=0, out=None):
    """The boxes of an MP4 (ISO BMFF) file: [(type, start, end, depth)], walking into the containers that matter here."""
    out = [] if out is None else out
    z = len(b) if z is None else z
    while a + 8 <= z:
        n, t = struct.unpack('>I4s', b[a:a + 8]); h = 8
        if n == 1: n = struct.unpack('>Q', b[a + 8:a + 16])[0]; h = 16
        elif n == 0: n = z - a
        if n < h: break
        t = t.decode('latin-1'); out.append((t, a + h, a + n, depth))
        if t in ('moov', 'trak', 'mdia', 'minf', 'stbl', 'moof', 'traf'): mp4_boxes(b, a + h, a + n, depth + 1, out)
        a += n
    return out


def mp4_info(path):
    b = open(path, 'rb').read(); bx = mp4_boxes(b); info = {'tracks': [], 'size': len(b)}
    for t, s, e, d in bx:
        if t == 'tkhd':
            v = b[s]; off = s + (4 + 8 + 8 + 4 + 4 + 8 if v == 1 else 4 + 4 + 4 + 4 + 4 + 4) + 8 + 2 + 2 + 2 + 2 + 36
            w, h = struct.unpack('>II', b[off:off + 8]); info['tracks'].append({'w': w >> 16, 'h': h >> 16})
        if t == 'hdlr': info.setdefault('handlers', []).append(b[s + 8:s + 12].decode('latin-1'))
        if t == 'mvhd':
            v = b[s]; ts, du = (struct.unpack('>IQ', b[s + 20:s + 32]) if v == 1 else struct.unpack('>II', b[s + 12:s + 20])); info['mvhd_s'] = du / ts if ts else None
    info['ftyp'] = b[8:12].decode('latin-1') if b[4:8] == b'ftyp' else None
    return info


p0 = stored_close('EURUSD', 1.1640)
RPORT = bt.free_port()
relay = subprocess.Popen([sys.executable, os.path.join(HERE, '..', 'relay', 'server.py')], env=dict(os.environ, PORT=str(RPORT)), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(50):
    try: socket.create_connection(('127.0.0.1', RPORT), 0.5).close(); break
    except OSError: time.sleep(0.15)
eaout = os.path.join(tempfile.gettempdir(), 'st_fake_ea_rec_%d.json' % os.getpid())
ea = subprocess.Popen([sys.executable, os.path.join(HERE, 'fake_ea_livecharts.py'), TOK, '600', eaout, 'EURUSD', str(T0), str(p0), '5', '90001234'],
                      env=dict(os.environ, ST_RELAY='127.0.0.1:%d' % RPORT, ST_FAKE_V='9.03'))
time.sleep(2)
src = open(os.path.join(HERE, 'rec_e2e.js'), encoding='utf-8').read().replace('__RELAY__', 'ws://127.0.0.1:%d/realtime/v1/websocket?vsn=1.0.0' % RPORT).replace('__TOK__', TOK)

web_port = bt.free_port()
httpd = http.server.ThreadingHTTPServer(('127.0.0.1', web_port), functools.partial(bt.Quiet, directory=os.path.dirname(HERE)))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
edge = next((p for p in bt.EDGE_PATHS if os.path.exists(p)), None)
dbg = bt.free_port()
prof = tempfile.mkdtemp(prefix='edgeprof_rec_')
dl = tempfile.mkdtemp(prefix='st_rec_dl_')
camf = os.path.join(prof, 'camera.y4m'); write_y4m(camf)
proc = subprocess.Popen([edge, '--headless=new', '--remote-debugging-port=%d' % dbg, '--user-data-dir=' + prof, '--no-first-run', '--no-default-browser-check', '--window-size=1920,1080', '--screen-info={1920x1080}',
                         '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion',
                         '--disable-popup-blocking', '--autoplay-policy=no-user-gesture-required',
                         # the stand-in camera and microphone (a moving test picture, a beep), and this tab's capture accepted without its prompt
                         '--use-fake-device-for-media-stream', '--use-file-for-fake-video-capture=' + camf.replace(os.sep, '/'), '--auto-accept-this-tab-capture', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
results = []


def add(rs):
    for r in rs:
        results.append(r)
        got = '' if r.get('ok') else '   got: ' + json.dumps(r.get('got'), ensure_ascii=False)[:400]
        print('%s  %s%s' % ('PASS' if r.get('ok') else 'FAIL', r['name'], got), flush=True)


def shot(c, name):
    try:
        p = os.path.join(OUT, name); open(p, 'wb').write(base64.b64decode(c.call('Page.captureScreenshot', format='png')['data'])); return p
    except Exception as e:
        print('screenshot failed:', e)


def ev(c, js, gesture=False):
    r = c.call('Runtime.evaluate', expression=js, awaitPromise=True, returnByValue=True, userGesture=gesture)
    if 'exceptionDetails' in r:
        ex = r['exceptionDetails']; raise RuntimeError((ex.get('exception') or {}).get('description') or ex.get('text'))
    return r.get('result', {}).get('value')


def page(c, mobile=False):
    if mobile:
        c.call('Emulation.setDeviceMetricsOverride', width=390, height=844, deviceScaleFactor=2, mobile=True)
        c.call('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
    c.call('Page.navigate', url='http://127.0.0.1:%d/app.html?e2e=%d%s' % (web_port, random.randint(1, 10 ** 9), os.environ.get('REC_Q', '')))
    time.sleep(2)
    if not ev(c, bt.PRELUDE): raise RuntimeError('The app did not load')
    ev(c, src)


try:
    pages = []
    for _ in range(80):
        try:
            pages = [t for t in json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dbg, timeout=2).read()) if t.get('type') == 'page']
            if pages: break
        except Exception: pass
        time.sleep(0.25)
    c = bt.CDP(pages[0]['webSocketDebuggerUrl'])
    c.call('Page.enable'); c.call('Runtime.enable')
    try: c.call('Page.bringToFront'); c.call('Emulation.setFocusEmulationEnabled', enabled=True)
    except Exception: pass
    origin = 'http://127.0.0.1:%d' % web_port
    c.call('Browser.grantPermissions', permissions=['videoCapture', 'audioCapture'], origin=origin)
    try: c.call('Browser.setDownloadBehavior', behavior='allow', downloadPath=dl)
    except Exception: c.call('Page.setDownloadBehavior', behavior='allow', downloadPath=dl)
    page(c)
    add(json.loads(ev(c, '__recT.setup()')))
    for i, (fmt, fit, ew, eh, corner, camo) in enumerate(FORMATS):
        tag = fmt + ('_fit' if fit == 'fit' else '')
        add(json.loads(ev(c, '__recT.sheet(%s, %s, %s, %s, %s)' % (json.dumps(fmt), json.dumps(fit), 'true' if i == 0 else 'false', json.dumps(corner), json.dumps(camo)))))
        if i == 0: print('set-up picture:', shot(c, 'rec_setup_sheet.png'))
        if camo['bg'] != 'none' or camo['z'] > 1: print('set-up picture:', shot(c, 'rec_setup_sheet_%s.png' % ('zoom' if camo['bg'] == 'none' else camo['bg'])))
        before = set(os.listdir(dl))
        ev(c, "document.querySelector('#st-rec-bg [data-r=\"go\"]').click(), 1", gesture=True)   # the Start click, as a person's
        st = {}
        for _ in range(60):
            st = ev(c, '__stRec.state()') or {}
            if st.get('st') == 'rec' or st.get('st') == 'setup': break
            time.sleep(0.25)
        if st.get('st') != 'rec':
            add([{'name': fmt + ': the recording started', 'ok': False, 'got': [st, ev(c, "(document.querySelector('#st-rec-bg .rs-err')||{}).textContent || ''")]}]); continue
        add(json.loads(ev(c, '__recT.during(%s, %s, %s, %s)' % (json.dumps(fmt), json.dumps(fit), json.dumps(corner), json.dumps(camo)))))
        if i in (0, 1): print('while recording:', shot(c, 'rec_recording_screen%s.png' % ('' if i == 0 else '_' + tag)))
        ev(c, '__recT.mark()')
        time.sleep(5)
        ev(c, '__recT.stop()')
        a = json.loads(ev(c, '__recT.after(%s, %s, %s)' % (json.dumps(fmt), json.dumps(fit), json.dumps(camo))))
        add(a['res'])
        if a.get('frame'):
            fp = os.path.join(OUT, 'rec_frame_%s.png' % tag); open(fp, 'wb').write(base64.b64decode(a['frame'].split(',', 1)[1])); print('frame:', fp)
        # the file the browser saved, read here
        f = None
        for _ in range(40):
            new = [x for x in set(os.listdir(dl)) - before if not x.endswith('.crdownload')]
            if new: f = new[0]; break
            time.sleep(0.25)
        add([{'name': fmt + ': saved by itself into Downloads, under its name', 'ok': bool(f) and f == a.get('name'), 'got': [f, a.get('name')]}])
        if f:
            info = mp4_info(os.path.join(dl, f))
            vt = [t for t in info['tracks'] if t['w']]
            add([{'name': fmt + ': the file is an MP4 of %d x %d with a sound track' % (ew, eh), 'ok': bool(vt) and vt[0]['w'] == ew and vt[0]['h'] == eh and 'soun' in (info.get('handlers') or []) and 'vide' in (info.get('handlers') or []),
                  'got': info}])
            shutil.move(os.path.join(dl, f), os.path.join(OUT, 'rec_%s%s' % (tag, os.path.splitext(f)[1])))   # out of Downloads: the next one may share its minute, so its name
    add(json.loads(ev(c, '__recT.refused()')))
    add(json.loads(ev(c, '__recT.es()')))
    add([{'name': 'the set-up in the light theme', 'ok': bool(ev(c, '__recT.light(true)')), 'got': None}])
    print('set-up, light:', shot(c, 'rec_setup_sheet_light.png'))
    add([{'name': 'and back to dark', 'ok': bool(ev(c, '__recT.light(false)')), 'got': None}])
    page(c, mobile=True)
    add(json.loads(ev(c, '__recT.phone()')))
finally:
    try: subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception: proc.kill()
    bt.kill_profile(prof)
    httpd.shutdown(); relay.terminate(); ea.terminate()
    time.sleep(0.5)
    shutil.rmtree(prof, ignore_errors=True); shutil.rmtree(dl, ignore_errors=True)
bad = [r for r in results if not r.get('ok')]
print('\n%d checks, %d failed\npictures and files: %s' % (len(results), len(bad), OUT))
sys.exit(1 if (bad or not results) else 0)
