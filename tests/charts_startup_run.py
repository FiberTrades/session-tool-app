# Chart windows back on start (Nestor, 21 Oct 2026, for Aurora: "turning her computer on and tradingview opening all the charts in
# her multiple screens"). Run: python tests/charts_startup_run.py   (HEADED=1 shows a real browser for ~30 s: headless windows ignore
# their position, so the "same place and size" check needs it).
# (1) remembered while open + moved, forgotten when brought back / closed by hand; (2) a fresh start
# with the switch on: the app opens Charts and puts the window back at its place; (3) the layout menu's section.
import base64, functools, http.server, json, os, random, shutil, subprocess, sys, tempfile, threading, time, urllib.request
REPO = r'C:\Users\Nestor\OneDrive\Documents\Claude Code chats\session-tool-app'
SP = tempfile.gettempdir()
sys.path.insert(0, os.path.join(REPO, 'tests'))
import browser_test as bt
import faulthandler; faulthandler.cancel_dump_traceback_later()
edge = next(p for p in bt.EDGE_PATHS if os.path.exists(p))
wp = bt.free_port()
httpd = http.server.ThreadingHTTPServer(('127.0.0.1', wp), functools.partial(bt.Quiet, directory=REPO))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
dp = bt.free_port()
prof = tempfile.mkdtemp(prefix='edgeprof_wsr_')
proc = subprocess.Popen([edge, *([] if os.environ.get('HEADED') else ['--headless=new']), '--window-position=40,40', '--remote-debugging-port=%d' % dp, '--user-data-dir=' + prof, '--no-first-run', '--no-default-browser-check',
                         '--disable-popup-blocking', '--window-size=1500,950', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
res = []
def ok(name, cond, got=None):
    res.append((name, bool(cond), got)); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '   got: ' + str(got)[:300]), flush=True)
def lst():
    return [t for t in json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dp, timeout=2).read()) if t.get('type') == 'page']
def ev(c, js):
    r = c.call('Runtime.evaluate', expression=js, awaitPromise=True, returnByValue=True, userGesture=True)
    if 'exceptionDetails' in r: return 'EXC ' + json.dumps(r['exceptionDetails'])[:300]
    return (r.get('result') or {}).get('value')
WAIT = r"""(async function(){ var W = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }; var P = window.__stPractice;
  for (var k = 0; k < 300 && !(P && P._s() && P._panes().length === 3 && P._panes().every(function(p){ return p.n > 0; })); k++) { await W(100); P = window.__stPractice; }
  document.querySelectorAll('.stc-gate, #onboarding-modal-bg, .onboarding-modal-bg, #lp-front, [class^="st-tour"]').forEach(function(e){ e.style.setProperty('display', 'none', 'important'); });
  return !!(P && P._s() && P._panes().length === 3); })()"""
try:
    pages = []
    for _ in range(80):
        try:
            pages = lst()
            if pages: break
        except Exception: pass
        time.sleep(0.25)
    cdp = bt.CDP(pages[0]['webSocketDebuggerUrl'])
    cdp.call('Page.enable'); cdp.call('Runtime.enable')
    cdp.call('Page.addScriptToEvaluateOnNewDocument', source="window.__stLcForce = true; try { var c = JSON.parse(localStorage.getItem('st_practice_cfg_seed') || 'null'); } catch (e) {}")
    base = 'http://127.0.0.1:%d/app.html' % wp
    cdp.call('Page.navigate', url=base + '?x=%d' % random.randint(1, 10**9)); time.sleep(3)
    # set up: 3 charts in the Charts tab (Live, stored prices), nothing remembered
    print(ev(cdp, r"""(async function(){ var W = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
      for (var i = 0; i < 200 && !(window.__stPractice && window.__stLC); i++) await W(100); await W(800);
      localStorage.removeItem('st_chartwins_v1'); var P = window.__stPractice, C = P._cfg(); C.layout = 3; C.tfs = [15, 60, 240, 5]; C.max = false; P._cfgSave && P._cfgSave();
      document.querySelector('.tab[data-page="livecharts"]').click(); return 1; })()"""))
    ok('Charts tab: three live charts', ev(cdp, WAIT))
    # (1) open chart 3 in its window; it is remembered; moved: remembered at the new place
    ev(cdp, r"""(async function(){ var W = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }; var P = window.__stPractice;
      P._panes()[2].el.querySelector('[data-popc]').click(); for (var k = 0; k < 150 && !(P._pops()[2] && P._pops()[2].ready); k++) await W(100); await W(2200); return 1; })()""")
    rec = ev(cdp, "JSON.stringify(window.__stPractice._wsr.get())")
    o = json.loads(rec); g = o['slots'].get('2')
    ok('chart 3 out: remembered on this computer (slot 2, its place and size)', g and g['w'] > 200 and g['h'] > 150, rec)
    ver = json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/version' % dp, timeout=2).read()); br = bt.CDP(ver['webSocketDebuggerUrl'])
    ct = [t for t in lst() if 'chart.html' in t.get('url', '')][0]; wid = br.call('Browser.getWindowForTarget', targetId=ct['id'])['windowId']
    br.call('Browser.setWindowBounds', windowId=wid, bounds={'left': 333, 'top': 222, 'width': 1001, 'height': 640, 'windowState': 'normal'})   # moved and resized as a mouse would
    time.sleep(3.5)
    rec2 = json.loads(ev(cdp, "JSON.stringify(window.__stPractice._wsr.get())"))['slots'].get('2')
    ok('moved and resized: remembered at the new place', rec2 and rec2['x'] == 333 and rec2['y'] == 222 and rec2['w'] == 1001 and rec2['h'] == 640, rec2)
    # (2) the switch on, the app window closed and opened again (a new start): Charts, and the window back at 333,222 1001x640
    ev(cdp, "(function(){ var o = window.__stPractice._wsr.get(); o.on = true; window.__stPractice._wsr.set(o); return 1; })()")
    for t in lst():
        if 'chart.html' in t.get('url', ''): urllib.request.urlopen('http://127.0.0.1:%d/json/close/%s' % (dp, t['id']), timeout=5)
    cdp.call('Page.navigate', url=base + '?x=%d' % random.randint(1, 10**9)); time.sleep(2)
    # (the chart window, closed together with the app, stays remembered)
    st = ev(cdp, r"""(async function(){ var W = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
      for (var i = 0; i < 300; i++) { var P = window.__stPractice; if (P && P._pops && P._pops()[2] && P._pops()[2].ready) break; await W(100); }
      await W(1500); var P = window.__stPractice, o = P._pops()[2], w = o && o.w;
      return JSON.stringify({ tab: document.querySelector('.tab.active') && document.querySelector('.tab.active').getAttribute('data-page'), open: !!(o && o.ready), x: w && w.screenX, y: w && w.screenY, ow: w && w.outerWidth, oh: w && w.outerHeight, inWin: !!(w && P._panes()[2] && P._panes()[2].el.ownerDocument === w.document) }); })()""")
    try:
        ct2 = [t for t in lst() if 'chart.html' in t.get('url', '')][0]; b2 = br.call('Browser.getWindowBounds', windowId=br.call('Browser.getWindowForTarget', targetId=ct2['id'])['windowId'])['bounds']
        print('reopened window bounds (from the browser):', b2)
    except Exception as e: print('bounds read failed', e)
    s2 = json.loads(st) if st and st.startswith('{') else {}
    ok('a fresh start with the switch on: the app opens on Charts', s2.get('tab') == 'livecharts', st)
    ok('...and chart 3 opens in its window, its chart in it', s2.get('open') and s2.get('inWin'), st)
    ok('...at the same place and size (333,222 1001x640)', s2.get('x') == 333 and s2.get('y') == 222 and s2.get('ow') == 1001 and s2.get('oh') == 640, st)
    # (3) the layout menu's section
    menu = ev(cdp, r"""(async function(){ var W = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }; document.getElementById('stpr-laybtn').click(); await W(200);
      var m = document.getElementById('stpr-menu'), cb = m.querySelector('input[data-wsr]'); return JSON.stringify({ text: m.textContent.replace(/\s+/g, ' ').slice(-260), checked: cb && cb.checked }); })()""")
    mo = json.loads(menu)
    ok('the layout menu: Chart windows, the switch on, "Remembered on this computer: chart 3."', mo.get('checked') and 'Chart windows' in mo['text'] and 'Remembered on this computer: chart 3.' in mo['text'], mo)
    shot = cdp.call('Page.captureScreenshot', format='png'); open(os.path.join(SP, 'wsr_menu.png'), 'wb').write(base64.b64decode(shot['data']))
    ev(cdp, r"""(function(){ var cb = document.querySelector('#stpr-menu input[data-wsr]'); cb.click(); return 1; })()""")
    ok('unticked: the switch is off', json.loads(ev(cdp, "JSON.stringify(window.__stPractice._wsr.get())")).get('on') is False)
    # brought back into the app: forgotten
    ev(cdp, r"""(async function(){ var W = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }; window.__stPractice._unpop(2); await W(800); return 1; })()""")
    ok('chart 3 brought back into the app: forgotten', not json.loads(ev(cdp, "JSON.stringify(window.__stPractice._wsr.get())"))['slots'].get('2'))
    # out again, then its window closed by hand while the app carries on: forgotten after a few seconds
    ev(cdp, r"""(async function(){ var W = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }; var P = window.__stPractice;
      P._panes()[2].el.querySelector('[data-popc]').click(); for (var k = 0; k < 150 && !(P._pops()[2] && P._pops()[2].ready); k++) await W(100); await W(2000);
      P._pops()[2].w.close(); await W(6000); return 1; })()""")
    ok('out again, then its window closed by hand: forgotten', not json.loads(ev(cdp, "JSON.stringify(window.__stPractice._wsr.get())"))['slots'].get('2'))
finally:
    subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try: bt.kill_profile(prof)
    except Exception: pass
    httpd.shutdown(); time.sleep(0.5); shutil.rmtree(prof, ignore_errors=True)
print('%d checks, %d failed' % (len(res), len([r for r in res if not r[1]])))
