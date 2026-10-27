# The mouse wheel over the Charts platform's panels (Nestor, 26 Oct 2026: "the mouse wheel doesn't scroll the Trade Manager", More settings
# open): a REAL wheel (CDP Input.dispatchMouseEvent, type mouseWheel) over the Trade Manager's rows scrolls them, and never the page behind.
# A stand-in EA 9.03 on a throwaway channel through the relay on this machine, the app in headless Edge at 1366x768. Nothing live is touched.
#   python tests/platform_wheel_run.py
import calendar, functools, http.server, json, os, socket, subprocess, sys, tempfile, threading, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import browser_test as bt

TOK = 'st-test-wheel-%d' % os.getpid()
T0 = calendar.timegm((2026, 10, 14, 8, 30, 0))
s = socket.socket(); s.bind(('127.0.0.1', 0)); RPORT = s.getsockname()[1]; s.close()
relay = subprocess.Popen([sys.executable, os.path.join(ROOT, 'relay', 'server.py')], env=dict(os.environ, PORT=str(RPORT)), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(50):
    try: socket.create_connection(('127.0.0.1', RPORT), 0.5).close(); break
    except OSError: time.sleep(0.15)
out = os.path.join(tempfile.gettempdir(), 'st_wheel_ea_%d.json' % os.getpid())
ea = subprocess.Popen([sys.executable, os.path.join(HERE, 'fake_ea_livecharts.py'), TOK, '300', out, 'EURUSD', str(T0), '1.1640', '5', '90001234'],
                      env=dict(os.environ, ST_RELAY='127.0.0.1:%d' % RPORT, ST_FAKE_V='9.03'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
APP_RELAY = 'ws://127.0.0.1:%d/realtime/v1/websocket?vsn=1.0.0' % RPORT
SETUP = r"""(async function(){
  var W = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  for (var i = 0; i < 200 && !(window.__stPractice && window.__stLC && window.__stLiveLine && window.__stSB); i++) await W(100);
  await W(800);
  try { Object.defineProperty(document, 'hidden', { configurable: true, get: function(){ return false; } }); } catch (e) {}
  var P = window.__stPractice, LC = window.__stLC;
  P._lvClock(%d * 1000 - Date.now()); window.isSessionLive = function(){ return true; };
  window.__stPlatOff = false; window.__stLcForce = true; await W(1200);
  window.STCloud.syncToken = '%s'; window.__stRelayURL = '%s';
  try { var C = P._cfg(); C.layout = 1; C.lv = {}; C.tfs = [15, 1, 60, 240]; C.syms = []; C.mini = false; C.resume = null; } catch (e) {}
  try { localStorage.removeItem('st_plat'); } catch (e) {}
  var acc0 = (data.accounts || [])[0] || {};
  data.accounts.push(Object.assign(JSON.parse(JSON.stringify(acc0)), { id: 'acc-wheel', name: 'FTMO 70K', kind: 'challenge', status: 'active', separate: false, startingBalance: 70000, balanceAtSetup: 70000 }));
  data.mt5LoginMap = Object.assign({}, data.mt5LoginMap || {}, { '90001234': 'acc-wheel' });
  document.querySelectorAll('[class^="st-tour"], .st-greet-pop').forEach(function(e){ e.remove(); });
  document.querySelectorAll('.stc-gate.open').forEach(function(e){ e.classList.remove('open'); }); document.querySelectorAll('.modal-bg.show').forEach(function(e){ e.classList.remove('show'); });
  document.querySelector('.tab[data-page="livecharts"]').click();
  for (var k = 0; k < 120 && !(P._s() && P._s().live && LC.state().fresh); k++) await W(250);
  await W(2000);
  var mo = document.querySelector('#stpr-mm [data-mm="plmore"]'); if (mo && mo.getAttribute('aria-expanded') !== 'true') mo.click(); await W(600);
  return JSON.stringify({ live: !!(P._s() && P._s().live), plat: document.getElementById('stpr-win').classList.contains('plat') });
})()""" % (T0, TOK, APP_RELAY)
PANEL = r"""(function(sel){ var b = document.querySelector(sel); if (!b) return null; var r = b.getBoundingClientRect();
  return { top: b.scrollTop, sh: b.scrollHeight, ch: b.clientHeight, x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, 160), page: window.scrollY, at: (document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 160)) || {}).className }; })(%s)"""
results = []
def check(name, ok, got=None): results.append((name, bool(ok), got))

edge = next(p for p in bt.EDGE_PATHS if os.path.exists(p))
wp = bt.free_port(); httpd = http.server.ThreadingHTTPServer(('127.0.0.1', wp), functools.partial(bt.Quiet, directory=ROOT))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
dp = bt.free_port(); prof = tempfile.mkdtemp(prefix='edgeprof_wheel_')
proc = bt.edge_popen([edge, '--headless=new', '--remote-debugging-port=%d' % dp, '--user-data-dir=' + prof, '--no-first-run', '--hide-scrollbars', '--window-size=1366,768',
                         '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
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
    c.call('Emulation.setDeviceMetricsOverride', width=1366, height=768, deviceScaleFactor=1, mobile=False)
    c.call('Page.navigate', url='http://127.0.0.1:%d/app.html?e2e=wheel' % wp); time.sleep(2)
    c.eval(bt.PRELUDE)
    st = json.loads(c.eval(SETUP)); check('Live Charts on the platform, More settings open', st.get('live') and st.get('plat'), st)

    def wheel(sel, dy):
        p0 = json.loads(json.dumps(c.eval(PANEL % json.dumps(sel))))
        c.call('Input.dispatchMouseEvent', type='mouseMoved', x=p0['x'], y=p0['y']); time.sleep(0.15)
        c.call('Input.dispatchMouseEvent', type='mouseWheel', x=p0['x'], y=p0['y'], deltaX=0, deltaY=dy); time.sleep(0.6)
        return p0, c.eval(PANEL % json.dumps(sel))

    a0, a1 = wheel('#stpr-mm .pl-mb', 240)
    check('the Trade Manager\'s rows overflow (More settings open, 768 px tall)', a0 and a0['sh'] > a0['ch'] + 40, a0)
    check('a real wheel down over them scrolls them', a1 and a1['top'] > a0['top'] + 30, [a0 and a0['top'], a1 and a1['top'], a0 and a0['at']])
    check('...and not the page behind', a1 and a1['page'] == a0['page'], [a0 and a0['page'], a1 and a1['page']])
    b0, b1 = wheel('#stpr-mm .pl-mb', -480)
    check('a wheel up: back to the top', b1 and b1['top'] == 0 and b0['top'] > 0, [b0 and b0['top'], b1 and b1['top']])
    e0, e1 = wheel('#stpr-mm .pl-mb', -240)
    check('at the top already: the page stays where it is (the wheel is the panel\'s)', e1 and e1['page'] == e0['page'] and e1['top'] == 0, [e0 and e0['page'], e1 and e1['page']])
finally:
    try: subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception: proc.kill()
    bt.kill_profile(prof)
    httpd.shutdown(); relay.terminate(); ea.terminate()
bad = 0
for n, ok, got in results:
    print(('PASS  ' if ok else 'FAIL  ') + n + ('' if ok else '   got: ' + json.dumps(got)[:300]))
    bad += 0 if ok else 1
print('\n%d checks, %d failed' % (len(results), bad))
sys.exit(1 if bad else 0)
