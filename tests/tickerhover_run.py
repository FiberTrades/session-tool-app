# A real mouse on TradingView's logo (Nestor, 4 Nov 2026: "when hovering over the tradingview logo can it expand and say ticker? when the ticker is on and also off?")
#   python tests/tickerhover_run.py [shots_dir]
# Signed out, headless Edge at idle, nothing live touched. Exits 1 if any check fails.
import base64, functools, http.server, io, json, os, shutil, sys, tempfile, threading, time, urllib.request
os.environ['E2E_TIMEOUT'] = '420'
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import browser_test as bt
from PIL import Image

SHOTS = sys.argv[1] if len(sys.argv) > 1 else None
bad = 0
def check(name, cond, got=None):
    global bad
    print(('PASS  ' if cond else 'FAIL  ') + name + ('' if cond else '   got: ' + json.dumps(got)[:300]))
    if not cond: bad += 1

Q = """(function(id){var b=document.getElementById(id),p=b.querySelector('.tk-pill'),t=b.querySelector('.tk-pill-t'),m=b.querySelector('svg'),R=function(e){var q=e.getBoundingClientRect();return {l:q.left,t:q.top,r:q.right,b:q.bottom,w:q.width,h:q.height}};
  var bb=document.getElementById('econ-bloomberg-btn');
  return {hover:b.matches(':hover'),pill:R(p),word:R(t),mark:R(m),op:getComputedStyle(p).opacity,wop:getComputedStyle(t).opacity,txt:t.textContent,bb:bb.hidden?null:R(bb),vw:document.documentElement.clientWidth};})"""

edge = next(p for p in bt.EDGE_PATHS if os.path.exists(p))
web = bt.free_port()
httpd = http.server.ThreadingHTTPServer(('127.0.0.1', web), functools.partial(bt.Quiet, directory=ROOT))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
for W, H in [(1500, 940), (1100, 800), (1024, 800)]:
    tag = '%d: ' % W
    port = bt.free_port()
    prof = tempfile.mkdtemp(prefix='edgeprof_tkhover_')
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
        def mouse(x, y): c.call('Input.dispatchMouseEvent', type='mouseMoved', x=x, y=y); time.sleep(.7)
        def shot(name):
            d = base64.b64decode(c.call('Page.captureScreenshot', format='png')['data'])
            im = Image.open(io.BytesIO(d)).convert('RGB')
            if SHOTS: im.crop((W - 300, 0, W, 70)).resize((900, 210)).save(os.path.join(SHOTS, 'tkh_%d_%s.png' % (W, name)))
            return im
        def whites(im):   # where the mark's white pixels are, in the logo's corner
            ps = [(x, y) for x in range(W - 28, W) for y in range(2, 32) if im.getpixel((x, y))[0] > 170]
            return [min(p[0] for p in ps), max(p[0] for p in ps), min(p[1] for p in ps), max(p[1] for p in ps)] if ps else None

        # ---- ticker off
        c.eval("(function(){document.querySelectorAll('.stc-gate').forEach(function(g){g.classList.remove('open');});data.settings.tickerEnabled=false;applyTickerBarState();window.scrollTo(0,0);})()")
        time.sleep(.3); mouse(W // 2, H - 100)
        a = c.eval(Q + "('ticker-logo')"); shot('off_rest')
        check(tag + 'off, at rest: the mark alone', a['word']['w'] == 0 and a['pill']['w'] <= 30, a)
        mouse(W - 14, a['pill']['t'] + 10)
        b = c.eval(Q + "('ticker-logo')"); shot('off_hover')
        check(tag + 'off, mouse on it: it grows and says Ticker', b['hover'] and b['word']['w'] > 30 and b['txt'] == 'Ticker' and b['wop'] == '1', b)
        check(tag + '...to the left, the mark stays put', abs(b['mark']['r'] - a['mark']['r']) <= 1 and abs(b['pill']['r'] - a['pill']['r']) <= 1 and b['pill']['l'] < a['pill']['l'] - 30, [a['mark'], b['mark']])
        check(tag + '...the word is not cut', c.eval("(function(){var t=document.querySelector('#ticker-logo .tk-pill-t');return t.scrollWidth<=t.clientWidth+1;})()"))
        if b['bb']:
            hit = not (b['pill']['r'] <= b['bb']['l'] or b['bb']['r'] <= b['pill']['l'] or b['pill']['b'] <= b['bb']['t'] or b['bb']['b'] <= b['pill']['t'])
            check(tag + '...clear of the Bloomberg button', not hit, [b['pill'], b['bb']])
        mouse(b['pill']['l'] + 6, b['pill']['t'] + 10)
        d = c.eval(Q + "('ticker-logo')")
        check(tag + '...stays open with the mouse on the word', d['hover'] and d['word']['w'] > 30, d)
        c.call('Input.dispatchMouseEvent', type='mousePressed', x=b['pill']['l'] + 6, y=b['pill']['t'] + 10, button='left', clickCount=1); c.call('Input.dispatchMouseEvent', type='mouseReleased', x=b['pill']['l'] + 6, y=b['pill']['t'] + 10, button='left', clickCount=1); time.sleep(.3)
        check(tag + '...and pressing the word opens the settings', c.eval("document.getElementById('ticker-settings-bg').classList.contains('show')"))
        c.eval("document.getElementById('ticker-settings-bg').classList.remove('show')")
        mouse(W // 2, H - 100)
        check(tag + 'mouse away: back to the mark', c.eval(Q + "('ticker-logo')")['word']['w'] == 0)

        # ---- ticker on
        c.eval("""(async function(){data.settings.tickerEnabled=true;applyTickerBarState();window.scrollTo(0,0);for(var i=0;i<150&&!document.querySelector('#ticker-widget-host iframe');i++)await new Promise(function(r){setTimeout(r,100)});await new Promise(function(r){setTimeout(r,5000)});return 1})()""")
        a = c.eval(Q + "('ticker-open')"); real = whites(shot('on_rest'))
        check(tag + 'on, at rest: our copy is invisible', a['op'] == '0' and a['word']['w'] == 0, a)
        mouse(W - 14, 17)
        b = c.eval(Q + "('ticker-open')"); im = shot('on_hover'); ours = whites(im)
        check(tag + 'on, mouse on it: it grows and says Ticker', b['hover'] and b['op'] == '1' and b['word']['w'] > 30 and b['wop'] == '1', b)
        check(tag + '...drawn, not clipped (the word\'s pixels show)', any(im.getpixel((x, 17))[0] > 150 for x in range(int(b['word']['l']), int(b['word']['r']))), b['word'])
        check(tag + '...the copy\'s mark lands on the real one', real and ours and all(abs(p - q) <= 1 for p, q in zip(real, ours)), [real, ours])
        mouse(b['pill']['l'] + 6, 17)
        check(tag + '...stays open with the mouse on the word', c.eval(Q + "('ticker-open')")['word']['w'] > 30)
        mouse(W // 2, H - 100)
        d = c.eval(Q + "('ticker-open')")
        check(tag + 'mouse away: the copy goes, the real logo shows', d['op'] == '0' and d['word']['w'] == 0, d)
        check(tag + 'no sideways scroll', c.eval("document.documentElement.scrollWidth<=innerWidth"))
    finally:
        bt.subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=bt.subprocess.DEVNULL, stderr=bt.subprocess.DEVNULL)
        bt.kill_profile(prof); shutil.rmtree(prof, ignore_errors=True)
httpd.shutdown()
print('\n%d failed' % bad)
sys.exit(1 if bad else 0)
