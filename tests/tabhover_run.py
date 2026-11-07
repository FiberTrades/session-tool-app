# A real mouse on the main tabs (Nestor, 7 Nov 2026: "when i hover over the main tabs should the tab i am hovering over zoom in a little,
# as in get slightly larger? you know like in a mac book"): the tab under the mouse grows, its neighbours a touch, nothing moves.
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

# every visible tab: its scale (from the computed transform), its place in the layout (offsetLeft/Top, which a transform never changes), hovered
Q = """(function(){return [].slice.call(document.querySelectorAll('.container > .tabs .tab')).filter(function(t){return t.offsetWidth>0;}).map(function(t){
  var m=getComputedStyle(t).transform, s=1; if (m && m!=='none') s=+m.slice(7).split(',')[0]; var r=t.getBoundingClientRect();
  return {p:t.getAttribute('data-page'), s:Math.round(s*1000)/1000, x:t.offsetLeft, y:t.offsetTop, w:t.offsetWidth, cx:r.left+r.width/2, cy:r.top+r.height/2, hov:t.matches(':hover'), z:getComputedStyle(t).zIndex};});})()"""

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
    mouse(W // 2, H - 60)
    a = c.eval(Q)
    check('at rest: every tab its own size', len(a) >= 6 and all(t['s'] == 1 for t in a), a)
    i = 2; tgt = a[i]
    mouse(int(tgt['cx']), int(tgt['cy']))
    b = c.eval(Q); shot('hover')
    check('the mouse on %s: it grows (6%%) and sits on top' % tgt['p'], b[i]['hov'] and b[i]['s'] == 1.06 and b[i]['z'] == '2', b[i])
    check('...its two neighbours a touch (2.5%)', b[i - 1]['s'] == 1.025 and b[i + 1]['s'] == 1.025, [b[i - 1], b[i + 1]])
    check('...the rest stay their size', all(t['s'] == 1 for k, t in enumerate(b) if abs(k - i) > 1), [t['s'] for t in b])
    check('...and nothing moves: every tab in the same place', all(p['x'] == q['x'] and p['y'] == q['y'] and p['w'] == q['w'] for p, q in zip(a, b)), [[p['x'], q['x']] for p, q in zip(a, b)])
    # the first tab: one neighbour only
    mouse(int(a[0]['cx']), int(a[0]['cy']))
    e = c.eval(Q)
    check('the first tab: it grows, the second a touch', e[0]['s'] == 1.06 and e[1]['s'] == 1.025 and all(t['s'] == 1 for t in e[2:]), [t['s'] for t in e])
    mouse(W // 2, H - 60)
    d = c.eval(Q)
    check('mouse away: all back to their size', all(t['s'] == 1 for t in d), [t['s'] for t in d])
    check('no sideways scroll', c.eval("document.documentElement.scrollWidth<=innerWidth"))
    # less motion asked for: they stay still
    c.call('Emulation.setEmulatedMedia', features=[{'name': 'prefers-reduced-motion', 'value': 'reduce'}])
    mouse(int(tgt['cx']), int(tgt['cy']))
    f = c.eval(Q)
    check('less motion asked for: no growing', all(t['s'] == 1 for t in f), [t['s'] for t in f])
finally:
    bt.subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=bt.subprocess.DEVNULL, stderr=bt.subprocess.DEVNULL)
    bt.kill_profile(prof); shutil.rmtree(prof, ignore_errors=True)
httpd.shutdown()
print('\n%d failed' % bad)
sys.exit(1 if bad else 0)
