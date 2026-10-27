# The phone's opening screen (26 Oct 2026; smooth since 27 Oct). Loads the app on a 390px phone with the CPU throttled 4x and records it
# frame by frame (DevTools screencast). Checks: the logo holds STILL at the launch screen's size (~56px) while the page loads; it grows to
# 120px only once the app is ready, in at least 12 evenly spaced frames with no jump; the screen fades on a finished page (no layout shift
# after the fade starts). Two openings: signed out (the sign-in card) and the app itself (Session Bias, the card held back as for a member).
# Then reduced motion (no growing) and a computer (no opening screen).
#   python tests/boot_splash_run.py [frames_dir]
import base64, functools, http.server, io, json, os, queue, subprocess, sys, tempfile, threading, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import browser_test as bt
import faulthandler
faulthandler.cancel_dump_traceback_later(); faulthandler.dump_traceback_later(900, exit=True)
from PIL import Image
OUT = sys.argv[1] if len(sys.argv) > 1 else None
PINK = (0xfc, 0x52, 0xab)
ART = 256 / 264.0   # the pink artwork spans 256 of the mark's 264 viewBox units
# as a signed-in member sees it: no sign-in card, the landing frame kept hidden the way the app hides it (visibility)
AS_MEMBER = "document.addEventListener('DOMContentLoaded',function(){var s=document.createElement('style');s.textContent='.stc-gate{display:none!important}#lp-front{visibility:hidden!important}';document.head.appendChild(s);});"
SHIFTS = """new Promise(function(r){var got=[];try{var o=new PerformanceObserver(function(l){l.getEntries().forEach(function(e){got.push([Math.round(e.startTime),e.value]);});});
  o.observe({type:'layout-shift',buffered:true});setTimeout(function(){o.disconnect();r(got);},400);}catch(e){r(got);}})"""
out = []
def check(name, ok, got=None):
    out.append((name, bool(ok))); print('%s  %s%s' % ('PASS' if ok else 'FAIL', name, '' if ok else '   got: ' + json.dumps(got)[:600]))


def logo_w(jpg):
    im = Image.open(io.BytesIO(jpg)).convert('RGB'); w, h = im.size; px = im.load(); xs = []
    for y in range(int(h * 0.35), int(h * 0.65), 2):
        for x in range(int(w * 0.2), int(w * 0.8)):
            r, g, b = px[x, y]
            if abs(r - PINK[0]) < 40 and abs(g - PINK[1]) < 45 and abs(b - PINK[2]) < 45: xs.append(x)
    return round((max(xs) - min(xs) + 1) * (390.0 / w) / ART, 1) if xs else 0


def run(W, H, mob, throttle=4, reduce=False, member=False):
    edge = next(p for p in bt.EDGE_PATHS if os.path.exists(p))
    wp = bt.free_port(); httpd = http.server.ThreadingHTTPServer(('127.0.0.1', wp), functools.partial(bt.Quiet, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    dp = bt.free_port(); prof = tempfile.mkdtemp(prefix='edgeprof_boot_')
    proc = bt.edge_popen([edge, '--headless=new', '--remote-debugging-port=%d' % dp, '--user-data-dir=' + prof, '--no-first-run', '--hide-scrollbars', '--window-size=1600,1000',
                             '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-features=CalculateNativeWinOcclusion', 'about:blank'],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    frames, res = [], {}
    try:
        pages = []
        for _ in range(80):
            try:
                pages = [t for t in json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dp, timeout=2).read()) if t.get('type') == 'page']
                if pages: break
            except Exception: pass
            time.sleep(0.25)
        c = bt.CDP(pages[0]['webSocketDebuggerUrl'])
        c.call('Page.enable'); c.call('Runtime.enable')
        c.call('Emulation.setDeviceMetricsOverride', width=W, height=H, deviceScaleFactor=2 if mob else 1, mobile=mob)
        if mob: c.call('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
        if reduce: c.call('Emulation.setEmulatedMedia', features=[{'name': 'prefers-reduced-motion', 'value': 'reduce'}])
        if member: c.call('Page.addScriptToEvaluateOnNewDocument', source=AS_MEMBER)
        c.call('Emulation.setCPUThrottlingRate', rate=throttle)
        q = queue.Queue()
        def reader():
            while True:
                try: q.put(c._recv())
                except Exception: break
        threading.Thread(target=reader, daemon=True).start()
        nid = [1000]
        def send(method, **params):
            nid[0] += 1; c._send({'id': nid[0], 'method': method, 'params': params}); return nid[0]
        def take(m):
            if m and m.get('method') == 'Page.screencastFrame':
                p = m['params']; frames.append((p['metadata']['timestamp'] * 1000.0, base64.b64decode(p['data']))); send('Page.screencastFrameAck', sessionId=p['sessionId'])
        def ask(expr, wait=6):
            i = send('Runtime.evaluate', expression=expr, returnByValue=True, awaitPromise=True); end = time.time() + wait
            while time.time() < end:
                try: m = q.get(timeout=0.05)
                except queue.Empty: continue
                if m.get('id') == i: return ((m.get('result') or {}).get('result') or {}).get('value')
                take(m)
            return None
        send('Page.startScreencast', format='jpeg', quality=70, maxWidth=390, maxHeight=844, everyNthFrame=1)
        t0 = time.time(); send('Page.navigate', url='http://127.0.0.1:%d/app.html?e2e=boot' % wp)
        last_ask = 0; log = None
        while time.time() - t0 < 32:
            try: take(q.get(timeout=0.01))
            except queue.Empty: pass
            if time.time() - last_ask > 0.5:
                last_ask = time.time(); got = ask('JSON.stringify(Object.assign({o:performance.timeOrigin,gone:!document.getElementById("st-boot")},window.__stBootLog||{}))', 3)
                if got: log = got
                lj = json.loads(log) if log else {}
                # done once the screen has run its course, or (a computer) the page is up and never had one
                if lj.get('end') or (lj.get('gone') and not lj.get('start') and time.time() - t0 > 6 and ask('document.readyState', 2) == 'complete'): break
        end = time.time() + 0.6   # a few frames after it is gone
        while time.time() < end:
            try: take(q.get(timeout=0.02))
            except queue.Empty: pass
        res['log'] = json.loads(log) if log else {}
        res['shifts'] = ask(SHIFTS, 3) or []
        res['state'] = ask("JSON.stringify({rs:document.readyState,fonts:document.fonts.status,view:(document.querySelector('.stc-gate.open')?'gate':(document.querySelector('.page.active')||{}).id)})", 3)
        send('Page.stopScreencast')
    finally:
        try: subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception: proc.kill()
        bt.kill_profile(prof); httpd.shutdown()
    o = res['log'].get('o', 0)
    res['frames'] = [(t - o, f) for t, f in frames]   # frame times on the page's own clock (performance.now)
    return res


def phase(r):
    lg = r['log']; fr = r['frames']
    hold = [(t, logo_w(f)) for t, f in fr if lg.get('go') and t < lg['go'] - 30]
    grow = [(t, logo_w(f)) for t, f in fr if lg.get('go') and lg['go'] <= t <= lg['go'] + 320]
    return hold, grow


def strip(r, name, picks_ms):
    if not OUT: return
    from PIL import ImageDraw, ImageFont
    fr = r['frames']; lg = r['log']; ims = []
    for label, want in picks_ms:
        if want is None or not fr: continue
        t, f = min(fr, key=lambda tf: abs(tf[0] - want))
        ims.append((label, Image.open(io.BytesIO(f)).convert('RGB')))
    if not ims: return
    F = ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf', 13)
    w, h = ims[0][1].size
    cv = Image.new('RGB', (len(ims) * (w + 8), h + 22), (40, 40, 44)); d = ImageDraw.Draw(cv)
    for i, (label, im) in enumerate(ims):
        cv.paste(im, (i * (w + 8), 22)); d.text((i * (w + 8) + 4, 3), label, font=F, fill=(230, 232, 238))
    cv.save(os.path.join(OUT, name)); print('saved', name)


ONLY_TIMING = os.environ.get('BOOT_TIMING')
if ONLY_TIMING:
    for th in [float(x) for x in os.environ.get('BOOT_TIMING').split(',')] if os.environ.get('BOOT_TIMING') not in ('1',) else (1, 2, 4):
        for member in (False, True):
            r = run(390, 844, True, throttle=th, member=member); lg = r['log']
            print('throttle %.0fx %s: view %s at %s, ready %s, grow %s (%s), gone %s' % (th, 'app ' if member else 'gate', lg.get('view'), lg.get('viewAt'), lg.get('readyAt'), lg.get('go'), lg.get('why'), lg.get('end')))
    sys.exit(0)
PATHS = {'gate': (False,), 'app': (True,)}.get(os.environ.get('BOOT_ONLY', ''), (False, True))
for member in PATHS:
    who = 'the app (Session Bias)' if member else 'signed out (sign-in card)'
    r = run(390, 844, True, throttle=4, member=member)
    lg = r['log']
    hold, grow = phase(r)
    lastw = logo_w(r['frames'][-1][1]) if r['frames'] else -1
    check('%s, 4x CPU: it ran its course on readiness (%s), the last frame shows the page and no logo' % (who, lg.get('why')),
          lg.get('fade') and lg.get('why') not in ('18s',) and lastw == 0, {'log': lg, 'last frame logo px': lastw})
    print('   screen removed: %s' % ('yes' if lg.get('end') else 'not seen (the page stopped answering the test after the fade)'))
    print('   timings (ms from navigation): view %s, ready %s, grow %s, fade %s, gone %s; quiet wait %s; %d frames recorded; last tick %s, frame gaps %s' % (
        lg.get('viewAt'), lg.get('readyAt'), lg.get('go'), lg.get('fade'), lg.get('end'), lg.get('quiet'), len(r['frames']), lg.get('hb'), lg.get('gaps')))
    fts = [t for t, f in r['frames']]
    print('   frames span %s..%s ms (page clock); %d in the hold window, %d in the grow window' % (round(min(fts)) if fts else None, round(max(fts)) if fts else None, len(hold), len(grow)))
    if not lg.get('go'): continue
    hw = [w for t, w in hold if w]
    check(who + ': the logo holds still at the launch screen\'s size while the page loads', hw and all(53 <= w <= 59 for w in hw), sorted(set(hw))[:12])
    gt = [t for t, w in grow]; gw = [w for t, w in grow]
    iv = [round(b - a, 1) for a, b in zip(gt, gt[1:])]
    check(who + ': the growing shows at least 12 frames', len(grow) >= 12, {'frames': len(grow), 'widths': gw})
    missed = len([g for g in iv if g > 25])
    check(who + ': ...evenly spaced (one missed frame at most, never two in a row; %d missed)' % missed, iv and missed <= 1 and max(iv) <= 34, iv)
    steps = [round(b - a, 1) for a, b in zip(gw, gw[1:])]
    check(who + ': ...growing every frame, no jump (no step over 20% of the growth)', gw and all(s >= -1 for s in steps) and max(steps or [0]) <= 0.2 * 64 + 1 and gw[-1] >= 112, {'widths': gw, 'steps': steps})
    late = [v for t, v in r['shifts'] if t >= lg.get('fade', 1e9) - 20]
    check(who + ': it fades on a finished page (no layout shift once the fade starts)', sum(late) < 0.01, {'after_fade': late, 'state': r['state']})
    strip(r, 'boot_strip_%s.png' % ('app' if member else 'gate'),
          [('holding', lg['go'] - 200), ('grow 0 ms', lg['go'] + 8)] + [('%d ms' % k, lg['go'] + k) for k in (50, 100, 150, 200, 300)]
          + [('fading', lg.get('fade', 0) + 110), ('after', lg.get('end', 0) + 80)])

rm = run(390, 844, True, throttle=4, reduce=True)
hold, grow = phase(rm)
ws = [w for t, w in hold + grow if w]
check('reduced motion: no growing, it holds then fades', rm['log'].get('end') and ws and all(53 <= w <= 59 for w in ws), {'widths': sorted(set(ws)), 'log': rm['log']})
dk = run(1500, 900, False, throttle=1)
check('computer: no opening screen', not dk['log'].get('go'), dk['log'])
bad = [o for o in out if not o[1]]
print('\n%d checks, %d failed' % (len(out), len(bad)))
sys.exit(1 if bad else 0)
