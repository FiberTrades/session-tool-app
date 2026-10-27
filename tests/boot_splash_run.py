# The phone's opening screen (26 Oct 2026): records the first 3 s of loading the app frame by frame (DevTools screencast) and checks the
# logo starts at the phone launch screen's size (~56px), eases up to 120px, sits in the middle, and the screen is gone once the page is
# ready. Also: reduced motion (no growing), a computer (no opening screen).
#   python tests/browser_test.py is not used here: this drives Edge itself.   python tests/boot_splash_run.py [frames_dir]
import base64, functools, http.server, io, json, os, queue, subprocess, sys, tempfile, threading, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import browser_test as bt
import faulthandler
faulthandler.cancel_dump_traceback_later(); faulthandler.dump_traceback_later(600, exit=True)
from PIL import Image
OUT = sys.argv[1] if len(sys.argv) > 1 else None
PINK = (0xfc, 0x52, 0xab)
POLL = """(function(){var b=document.getElementById('st-boot');if(!b)return {gone:true,ds:document.readyState};var r=b.querySelector('svg').getBoundingClientRect();
  return {w:Math.round(r.width*10)/10,cx:Math.round(r.left+r.width/2),cy:Math.round(r.top+r.height/2),op:getComputedStyle(b).opacity,done:b.classList.contains('st-boot-done'),ds:document.readyState,vw:innerWidth,vh:innerHeight};})()"""
out = []
def check(name, ok, got=None):
    out.append((name, bool(ok))); print('%s  %s%s' % ('PASS' if ok else 'FAIL', name, '' if ok else '   got: ' + json.dumps(got)[:500]))


def pink_box(jpg, dpr):
    im = Image.open(io.BytesIO(jpg)).convert('RGB'); w, h = im.size; px = im.load(); xs = []; ys = []
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            r, g, b = px[x, y]
            if abs(r - PINK[0]) < 40 and abs(g - PINK[1]) < 45 and abs(b - PINK[2]) < 45: xs.append(x); ys.append(y)
    if not xs: return None
    return {'w': round((max(xs) - min(xs) + 2) / dpr, 1), 'cx': round((max(xs) + min(xs)) / 2 / dpr), 'cy': round((max(ys) + min(ys)) / 2 / dpr)}


def run(W, H, mob, reduce=False):
    edge = next(p for p in bt.EDGE_PATHS if os.path.exists(p))
    wp = bt.free_port(); httpd = http.server.ThreadingHTTPServer(('127.0.0.1', wp), functools.partial(bt.Quiet, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    dp = bt.free_port(); prof = tempfile.mkdtemp(prefix='edgeprof_boot_')
    proc = bt.edge_popen([edge, '--headless=new', '--remote-debugging-port=%d' % dp, '--user-data-dir=' + prof, '--no-first-run', '--hide-scrollbars', '--window-size=1600,1000',
                             '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-features=CalculateNativeWinOcclusion', 'about:blank'],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    frames, polls = [], []
    try:
        pages = []
        for _ in range(80):
            try:
                pages = [t for t in json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dp, timeout=2).read()) if t.get('type') == 'page']
                if pages: break
            except Exception: pass
            time.sleep(0.25)
        c = bt.CDP(pages[0]['webSocketDebuggerUrl'])
        dpr = 2 if mob else 1
        c.call('Page.enable'); c.call('Runtime.enable')
        c.call('Emulation.setDeviceMetricsOverride', width=W, height=H, deviceScaleFactor=dpr, mobile=mob)
        if mob: c.call('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
        if reduce: c.call('Emulation.setEmulatedMedia', features=[{'name': 'prefers-reduced-motion', 'value': 'reduce'}])
        q = queue.Queue()
        def reader():
            while True:
                try: q.put(c._recv())
                except Exception: break
        threading.Thread(target=reader, daemon=True).start()
        nid = [1000]
        def send(method, **params):
            nid[0] += 1; c._send({'id': nid[0], 'method': method, 'params': params}); return nid[0]
        send('Page.startScreencast', format='jpeg', quality=85, everyNthFrame=1)
        t0 = time.time(); send('Page.navigate', url='http://127.0.0.1:%d/app.html?e2e=boot' % wp)
        pending = {}; nextpoll = t0 + 0.03; gone_at = None
        while time.time() - t0 < 3.5:
            now = time.time()
            if now >= nextpoll:
                pending[send('Runtime.evaluate', expression=POLL, returnByValue=True)] = now - t0; nextpoll = now + 0.04
            try: m = q.get(timeout=0.01)
            except queue.Empty: continue
            if m.get('method') == 'Page.screencastFrame':
                p = m['params']; frames.append((time.time() - t0, base64.b64decode(p['data']))); send('Page.screencastFrameAck', sessionId=p['sessionId'])
            elif m.get('id') in pending:
                v = ((m.get('result') or {}).get('result') or {}).get('value')
                if v: polls.append((pending.pop(m['id']), v))
                if v and v.get('gone') and v.get('ds') in ('interactive', 'complete') and gone_at is None: gone_at = time.time() - t0
                if gone_at and time.time() - t0 > gone_at + 0.4: break
        send('Page.stopScreencast')
    finally:
        try: subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception: proc.kill()
        bt.kill_profile(prof); httpd.shutdown()
    scale = (Image.open(io.BytesIO(frames[0][1])).size[0] / float(W)) if frames else 1   # screencast frames are not always at the device's pixel ratio
    boxes = [(t, pink_box(f, scale)) for t, f in frames]
    return {'frames': frames, 'boxes': [(t, b) for t, b in boxes], 'polls': polls}


# The pink artwork spans 256 of the mark's 264 viewBox units: a 120px logo measures ~116px of pink, the 56px start ~54px.
ART = 256 / 264.0
def splash_window(r):   # frames up to the moment the screen starts fading (after that the app's own pink shows through)
    fading = [t for t, v in r['polls'] if v.get('done')]
    seen = [t for t, v in r['polls'] if not v.get('gone')]
    return fading[0] if fading else (max(seen) if seen else 9)
# a phone
ph = run(390, 844, True)
cut = splash_window(ph)
bx = [(t, b) for t, b in ph['boxes'] if b and t <= cut]
check('390 phone: the opening screen draws the logo', len(bx) >= 3, len(bx))
if bx:
    first, biggest = bx[0][1], max(b['w'] for t, b in bx)
    check('it starts at the phone launch screen\'s size (about 56px)', 50 <= first['w'] / ART <= 62, [first, round(first['w'] / ART, 1)])
    check('it eases up to 120px', 115 <= biggest / ART <= 125, round(biggest / ART, 1))
    grow = [b['w'] for t, b in bx]; peak = grow.index(max(grow))
    check('the growing never steps back (one smooth motion)', all(b2 >= b1 - 1 for b1, b2 in zip(grow[:peak], grow[1:peak + 1])), grow[:peak + 1])
    check('in the middle of the screen', all(abs(b['cx'] - 195) <= 3 and abs(b['cy'] - 422) <= 6 for t, b in bx), [b for t, b in bx][:4])
pl = ph['polls']
first_seen = min([t for t, v in pl if not v.get('gone')] or [0])
gone = [(t, v) for t, v in pl if v.get('gone') and t > first_seen]
check('gone once the page is ready, nothing added', gone and all(v.get('ds') != 'loading' for t, v in gone), [(round(t, 2), v) for t, v in pl if t > first_seen][-4:])
if OUT and bx:
    t_first = bx[0][0]; picks = []
    for want in (0, 0.08, 0.16, 0.26, 0.4):
        best = min(bx, key=lambda tb: abs((tb[0] - t_first) - want)); picks.append(best[0])
    fade = [t for t, b in ph['boxes'] if t > picks[-1] + 0.05]
    frs = {t: f for t, f in ph['frames']}
    strip = [Image.open(io.BytesIO(frs[t])).convert('RGB') for t in picks] + ([Image.open(io.BytesIO(frs[fade[0]])).convert('RGB')] if fade else [])
    sw = strip[0].width // 2; sh = strip[0].height // 2
    cv = Image.new('RGB', (len(strip) * (sw + 10), sh), (60, 60, 60))
    for i, im in enumerate(strip): cv.paste(im.resize((sw, sh), Image.LANCZOS), (i * (sw + 10), 0))
    cv.save(os.path.join(OUT, 'boot_strip.png')); print('saved boot_strip.png', [round(t - t_first, 2) for t in picks])

# reduced motion: no growing
rm = run(390, 844, True, reduce=True)
rcut = splash_window(rm)
rbx = [b for t, b in rm['boxes'] if b and t <= rcut]
check('reduced motion: the logo shows at 120px, no growing', rbx and all(115 <= b['w'] / ART <= 125 for b in rbx), [round(b['w'] / ART, 1) for b in rbx][:6])
# a computer: no opening screen
dk = run(1500, 900, False)
check('computer: no opening screen', not [b for t, b in dk['boxes'] if b and b['w'] > 40 and abs(b['cx'] - 750) < 10 and abs(b['cy'] - 450) < 20] and all(v.get('gone') for t, v in dk['polls'] if v.get('ds') != 'loading'), [v for t, v in dk['polls']][:3])
bad = [o for o in out if not o[1]]
print('\n%d checks, %d failed' % (len(out), len(bad)))
sys.exit(1 if bad else 0)
