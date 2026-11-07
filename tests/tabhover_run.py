# A real mouse on the main tabs (Nestor, 7 Nov 2026: "add a bit of pink highlight behind the tab being hovered over"; a Mac-Dock grow tried
# first was "terrible" and taken out): a soft pink behind the tab under the mouse, nothing grows, nothing moves.
#   python tests/tabhover_run.py [shots_dir]
# Signed out, headless Edge at idle, nothing live touched. Exits 1 if any check fails.
import base64, functools, http.server, io, json, os, shutil, sys, tempfile, threading, time, urllib.request
os.environ['E2E_TIMEOUT'] = '300'
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import browser_test as bt
from PIL import Image

SHOTS = sys.argv[1] if len(sys.argv) > 1 else None
bad = 0
def check(name, cond, got=None):
    global bad
    print(('PASS  ' if cond else 'FAIL  ') + name + ('' if cond else '   got: ' + json.dumps(got)[:400]))
    if not cond: bad += 1

# every shown tab: its background, its transform, its place in the layout and on screen, hovered
Q = """(function(){return [].slice.call(document.querySelectorAll('.container > .tabs .tab')).filter(function(t){return t.offsetWidth>0;}).map(function(t){
  var c=getComputedStyle(t), r=t.getBoundingClientRect();
  return {p:t.getAttribute('data-page'), bg:c.backgroundColor, tf:c.transform, sh:c.boxShadow, x:Math.round(r.left*10)/10, w:Math.round(r.width*10)/10, cx:r.left+r.width/2, cy:r.top+r.height/2, hov:t.matches(':hover')};});})()"""

edge = next(p for p in bt.EDGE_PATHS if os.path.exists(p))
web = bt.free_port()
httpd = http.server.ThreadingHTTPServer(('127.0.0.1', web), functools.partial(bt.Quiet, directory=ROOT))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
W, H = 1500, 940
port = bt.free_port()
prof = tempfile.mkdtemp(prefix='edgeprof_tabhover_')
proc = bt.edge_popen([edge, '--headless=new', '--remote-debugging-port=%d' % port, '--user-data-dir=' + prof, '--no-first-run', '--no-default-browser-check',
                      '--window-size=1500,940', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
                      '--disable-features=CalculateNativeWinOcclusion', 'about:blank'])
try:
    for _ in range(80):
        try:
            pages = [t for t in json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % port, timeout=2).read()) if t.get('type') == 'page']
            if pages: break
        except Exception: pass
        time.sleep(0.25)
    c = bt.CDP(pages[0]['webSocketDebuggerUrl'])
    c.call('Page.enable'); c.call('Runtime.enable'); c.call('Page.bringToFront'); c.call('Emulation.setFocusEmulationEnabled', enabled=True)
    c.call('Emulation.setDeviceMetricsOverride', width=W, height=H, deviceScaleFactor=1, mobile=False)
    c.call('Page.navigate', url='http://127.0.0.1:%d/app.html?e2e=1' % web)
    time.sleep(2); c.eval(bt.PRELUDE)
    # signed out: whatever covers the tabs (the gate, the sign-in screen) put aside, so the mouse reaches them
    c.eval("""(function(){document.querySelectorAll('.stc-gate').forEach(function(g){g.classList.remove('open');}); window.scrollTo(0,0);
      var t=document.querySelector('.container > .tabs .tab'); for (var k=0;k<15;k++){ var r=t.getBoundingClientRect(), e=document.elementFromPoint(r.left+r.width/2, r.top+r.height/2);
        if (!e || t.contains(e)) break; var x=e; while (x.parentElement && x.parentElement!==document.body) x=x.parentElement; if (x.contains(t)) e.style.visibility='hidden'; else x.style.display='none'; }})()""")
    time.sleep(.4)
    def mouse(x, y): c.call('Input.dispatchMouseEvent', type='mouseMoved', x=x, y=y); time.sleep(.7)
    def shot(name):
        d = base64.b64decode(c.call('Page.captureScreenshot', format='png')['data'])
        im = Image.open(io.BytesIO(d)).convert('RGB')
        if SHOTS: im.save(os.path.join(SHOTS, 'tabhover_%s.png' % name))
        return im
    PINK = 'rgba(244, 114, 182, 0.09)'
    mouse(W // 2, H - 60)
    a = c.eval(Q)
    check('at rest: no tab pink', len(a) >= 6 and all(t['bg'] != PINK for t in a), [t['bg'] for t in a])
    i = 2; tgt = a[i]
    mouse(int(tgt['cx']), int(tgt['cy']))
    b = c.eval(Q); im = shot('hover')
    check('the mouse on %s: a soft pink behind it' % tgt['p'], b[i]['hov'] and b[i]['bg'] == PINK, b[i])
    px = im.getpixel((int(tgt['cx']) - int(tgt['w'] / 2) + 6, int(tgt['cy']) - 10))
    check('...it shows on screen: pinker than it is grey', px[0] > px[1] + 3 and px[2] > px[1] + 2, px)
    check('...flat, no glow', b[i]['sh'] in ('none', ''), b[i]['sh'])
    check('...only that tab', all(t['bg'] != PINK for k, t in enumerate(b) if k != i), [t['bg'] for t in b])
    check('nothing grows (the Dock zoom is gone)', all(t['tf'] in ('none', '') for t in b), [t['tf'] for t in b])
    check('...and nothing moves: every tab in the same place and size', all(p['x'] == q['x'] and p['w'] == q['w'] for p, q in zip(a, b)), [[p['x'], q['x'], p['w'], q['w']] for p, q in zip(a, b)])
    mouse(int(a[0]['cx']), int(a[0]['cy']))
    e = c.eval(Q)
    check('the open tab under the mouse: pink too, its glow as before', e[0]['bg'] == PINK, e[0])
    mouse(W // 2, H - 60)
    d = c.eval(Q)
    check('mouse away: no pink', all(t['bg'] != PINK for t in d), [t['bg'] for t in d])
finally:
    bt.subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=bt.subprocess.DEVNULL, stderr=bt.subprocess.DEVNULL)
    bt.kill_profile(prof); shutil.rmtree(prof, ignore_errors=True)
httpd.shutdown()
print('\n%d failed' % bad)
sys.exit(1 if bad else 0)
