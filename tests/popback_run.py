# A chart in a window of its own (29 Oct 2026, Nestor: "on an external window chart can't this live here instead next to the fullscreen
# button?"): no tile on the chart; "Back to the main window" in its top bar, right before full screen, in the bar's icon style; the bar
# still fits at 1366 wide. Several charts in the app's window: a chart's own tile only while it is hovered. And the news flags at the
# bottom right of that window at his size (1550 wide, 1h, many releases at the latest candles): none over Spread, the » chip or the
# logo. A stand-in EA 9.03 through the relay on this machine, the candle stand-in; nothing live is touched.
#   python tests/popback_run.py [screenshot folder]
import base64, calendar, functools, http.server, json, os, random, socket, subprocess, sys, tempfile, threading, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import lowprio  # noqa: F401
import browser_test as bt
T0 = calendar.timegm((2026, 10, 14, 8, 30, 0))
TOK = 'st-test-popback-%d' % os.getpid()
SHOTS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(tempfile.gettempdir(), 'st_popback')
os.makedirs(SHOTS, exist_ok=True)
RES = []
def ok(name, cond, got=None):
    RES.append((name, bool(cond), got)); print('%s  %s%s' % ('PASS' if cond else 'FAIL', name, '' if cond else '   got: ' + json.dumps(got, ensure_ascii=False)[:500])); sys.stdout.flush()

def stored_close(sym, dflt):
    try:
        req = urllib.request.Request('https://figozyxoyobixadhqewr.supabase.co/rest/v1/rpc/st_candles', method='POST',   # answered by the candle stand-in
            data=json.dumps({'p_symbol': sym, 'p_tf': 1, 'p_from': T0 - 3600, 'p_to': T0}).encode(), headers={'apikey': 'x', 'Content-Type': 'application/json'})
        rows = json.loads(urllib.request.urlopen(req, timeout=15).read())
        if rows: return float(rows[-1]['c'])
    except Exception: pass
    return dflt

SETUP = r"""(async function(){
  var W = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  for (var i = 0; i < 200 && !(window.__stPractice && window.__stLC && window.__stLiveLine && window.__stSB); i++) await W(100);
  await W(800);
  try { Object.defineProperty(document, 'hidden', { configurable: true, get: function(){ return false; } }); } catch (e) {}
  var P = window.__stPractice, LC = window.__stLC; P._lvClock(%d * 1000 - Date.now());
  window.isSessionLive = function(){ return true; }; window.__stPlatOff = false; window.__stLcForce = true; window.__stKeepOff = true; await W(1200);
  try { STCloud.getData()._tourDoneV1 = true; } catch (e) {}
  window.STCloud.syncToken = '%s'; window.__stRelayURL = '%s';
  try { var C = P._cfg(); C.layout = 2; C.lv = {}; C.tfs = [15, 60, 5, 240]; C.syms = []; C.mini = false; C.resume = null; } catch (e) {}
  document.querySelectorAll('[class^="st-tour"], .st-greet-pop').forEach(function(e){ e.remove(); });
  document.querySelectorAll('.stc-gate.open').forEach(function(e){ e.classList.remove('open'); }); document.querySelectorAll('.modal-bg.show').forEach(function(e){ e.classList.remove('show'); });
  document.querySelector('.tab[data-page="livecharts"]').click();
  for (var k = 0; k < 160 && !(P._s() && P._s().live && LC.state().fresh && P._panes().length === 2 && P._panes()[1].n > 30); k++) await W(250);
  await W(2500);
  var b0 = P._panes()[0].el.querySelector('.stpr-popc'), b1 = P._panes()[1].el.querySelector('.stpr-popc'), r1 = P._panes()[1].el.getBoundingClientRect();
  return JSON.stringify({ live: !!(P._s() && P._s().live), n: P._panes().length, b0: !!b0, b1: !!b1, op1: b1 ? getComputedStyle(b1).opacity : null, pane1: [r1.left, r1.top, r1.width, r1.height] });
})()"""
OPACITY = "(function(){ var b = window.__stPractice._panes()[1].el.querySelector('.stpr-popc'); return b ? getComputedStyle(b).opacity + '|' + getComputedStyle(b).pointerEvents : null; })()"
# the window's state, read from the app's engine (it draws that window)
POPSTATE = r"""(async function(){
  var W = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }, P = window.__stPractice;
  for (var k = 0; k < 120 && !(P._panes()[1] && P._panes()[1].el.ownerDocument !== document && P._panes()[1].n > 30); k++) await W(250);
  await W(1500);
  var p = P._panes()[1], d = p.el.ownerDocument, w = d.defaultView, tb = d.getElementById('stpr-tb2'), q = function(s){ return tb.querySelector(s); };
  var vis = function(e){ return !!(e && e.getClientRects().length && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden'); };
  var rr = function(e){ if (!vis(e)) return null; var r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; };
  var items = Array.prototype.filter.call(tb.querySelectorAll(':scope > *, :scope > .stpr-tbm > *'), vis).map(function(e){ return { k: e.getAttribute('data-plback') ? 'back' : (e.getAttribute('data-plfull') ? 'full' : (e.getAttribute('data-pltheme') ? 'theme' : (e.id || e.className.split(' ')[0]))), r: rr(e) }; }).filter(function(o){ return o.r && o.r[2] > o.r[0]; }).sort(function(a, b){ return a.r[0] - b.r[0]; });
  var tr = tb.getBoundingClientRect(), padR = parseFloat(getComputedStyle(tb).paddingRight) || 0;
  return JSON.stringify({ w: w.innerWidth, h: w.innerHeight, tile: vis(p.el.querySelector('.stpr-popc')), back: rr(q('[data-plback]')), full: rr(q('[data-plfull]')), theme: rr(q('[data-pltheme]')),
    backSvg: !!q('[data-plback] svg'), backTitle: (q('[data-plback]') || {}).title, order: items.map(function(o){ return o.k; }).slice(-4),
    fits: tb.scrollWidth <= tb.clientWidth + 1 && items.every(function(o){ return o.r[2] <= tr.right - padR + 0.5; }), maxRight: Math.max.apply(null, items.map(function(o){ return o.r[2]; })), barRight: Math.round(tr.right - padR),
    gap: (q('[data-plback]') && q('[data-plfull]')) ? Math.round(q('[data-plfull]').getBoundingClientRect().left - q('[data-plback]').getBoundingClientRect().right) : null });
})()"""
# many releases at the window's latest candles; then where every flag sits against Spread, the » chip and the logo
FLAGS = r"""(async function(){
  var W = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }, P = window.__stPractice, p = P._panes()[1], B = p.bars, n = B.length;
  while (n > 1 && !(B[n - 1] && B[n - 1].close != null)) n--;
  var at = function(i){ return new Date(B[n - i].time * 1000).toISOString(); }, E = function(i, c, imp, t){ return { at: at(i), currency: c, title: t, impact: imp, forecast: '0.3%%', previous: '0.2%%', actual: '0.4%%' }; }, ev = [];
  [[1, 'USD', 'High'], [1, 'EUR', 'High'], [2, 'USD', 'High'], [3, 'USD', 'High'], [3, 'GBP', 'Medium'], [3, 'USD', 'High'], [3, 'EUR', 'High'], [4, 'EUR', 'High'], [5, 'USD', 'High'], [6, 'USD', 'Medium'], [8, 'EUR', 'High'], [9, 'USD', 'High'], [11, 'JPY', 'Low'], [13, 'USD', 'High']]
    .forEach(function(a, i){ ev.push(E(a[0], a[1], a[2], 'Release ' + i)); });
  P._news(ev); await W(400);
  if (%d) { P._zoom(1, { from: n - 1 - 90 + 4, to: n - 1 - 4 }); var hk = setInterval(function(){ p.handAt = Date.now(); }, 40); await W(600); clearInterval(hk); }
  try { P._drawOv(1); } catch (e) {} await W(500);
  var pr = p.el.getBoundingClientRect(), box = function(e){ if (!e || !e.isConnected || e.hidden || !e.getClientRects().length || getComputedStyle(e).display === 'none' || getComputedStyle(e).visibility === 'hidden') return null; var r = e.getBoundingClientRect(); return [r.left - pr.left, r.top - pr.top, r.right - pr.left, r.bottom - pr.top]; };
  var sp = box(p.cdb), rt = box(p._rt && p._rt.classList.contains('on') ? p._rt : null), lo = box(p.el.querySelector('#tv-attr-logo')), hits = [], flags = 0, minGap = 1e9;
  (p._news || []).forEach(function(h){ (h.spots || []).forEach(function(s){ flags++; var f = [s.x - h.r, h.y - h.r, s.x + h.r, h.y + h.r];
    [['Spread', sp], ['chip', rt], ['logo', lo]].forEach(function(o){ var b = o[1]; if (!b) return; var dx = Math.max(b[0] - f[2], f[0] - b[2]), dy = Math.max(b[1] - f[3], f[1] - b[3]);
      if (dx < 0 && dy < 0) hits.push([o[0], Math.round(s.x), Math.round(h.y)]); else if (dy < 0) minGap = Math.min(minGap, dx); }); }); });
  return JSON.stringify({ flags: flags, groups: (p._news || []).length, spread: sp && sp.map(Math.round), chip: rt && rt.map(Math.round), logo: lo && lo.map(Math.round), hits: hits, minGap: minGap === 1e9 ? null : Math.round(minGap), pw: Math.round(pr.width), corner: [Math.round(pr.right - 150), Math.round(pr.bottom - 70)] });
})()"""

def main():
    p0 = stored_close('EURUSD', 1.1640)
    s = socket.socket(); s.bind(('127.0.0.1', 0)); rport = s.getsockname()[1]; s.close()
    relay = subprocess.Popen([sys.executable, os.path.join(HERE, '..', 'relay', 'server.py')], env=dict(os.environ, PORT=str(rport)), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    out = os.path.join(tempfile.gettempdir(), 'st_fake_ea_popback_%d.json' % os.getpid())
    ea = subprocess.Popen([sys.executable, os.path.join(HERE, 'fake_ea_livecharts.py'), TOK, '420', out, 'EURUSD', str(T0), str(p0), '5', '90001234'],
                          env=dict(os.environ, ST_RELAY='127.0.0.1:%d' % rport, ST_FAKE_V='9.03'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2)
    edge = next((p for p in bt.EDGE_PATHS if os.path.exists(p)), None)
    web_port = bt.free_port(); httpd = http.server.ThreadingHTTPServer(('127.0.0.1', web_port), functools.partial(bt.Quiet, directory=bt.ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    dbg_port = bt.free_port(); prof = tempfile.mkdtemp(prefix='edgeprof_popback_')
    proc = bt.edge_popen([edge, '--headless=new', '--remote-debugging-port=%d' % dbg_port, '--user-data-dir=' + prof, '--no-first-run', '--no-default-browser-check', '--window-size=1600,1000',
                          '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion',
                          '--disable-popup-blocking', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    pop = {}
    def target(part):
        for t in json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dbg_port, timeout=5).read()):
            if t.get('type') == 'page' and part in t.get('url', ''): return t
    def shot(c, name, clip=None):
        kw = {'format': 'png'}
        if clip: kw['clip'] = dict(x=clip[0], y=clip[1], width=clip[2], height=clip[3], scale=1)
        fn = os.path.join(SHOTS, name); open(fn, 'wb').write(base64.b64decode(c.call('Page.captureScreenshot', **kw)['data'])); print('screenshot', fn); return fn
    try:
        pages = []
        for _ in range(80):
            try:
                pages = [t for t in json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dbg_port, timeout=2).read()) if t.get('type') == 'page']
                if pages: break
            except Exception: pass
            time.sleep(0.25)
        M = bt.CDP(pages[0]['webSocketDebuggerUrl']); M.call('Page.enable'); M.call('Runtime.enable')
        try: M.call('Page.bringToFront'); M.call('Emulation.setFocusEmulationEnabled', enabled=True)
        except Exception: pass
        M.call('Emulation.setDeviceMetricsOverride', width=1600, height=960, deviceScaleFactor=1, mobile=False)
        M.call('Page.navigate', url='http://127.0.0.1:%d/%s?e2e=%d' % (web_port, os.environ.get('E2E_APP', 'app.html'), random.randint(1, 10 ** 9))); time.sleep(2)
        M.eval('window.__stPlatOff = false; 1'); M.eval(bt.PRELUDE)
        st = json.loads(M.eval(SETUP % (T0, TOK, 'ws://127.0.0.1:%d/realtime/v1/websocket?vsn=1.0.0' % rport)))
        ok('two charts live in the app\'s window; chart 2 has its tile, chart 1 none', st['live'] and st['n'] == 2 and st['b1'] and not st['b0'], st)
        # several charts: chart 2's tile only while chart 2 is hovered (a real mouse: :hover)
        M.call('Input.dispatchMouseEvent', type='mouseMoved', x=5, y=5); time.sleep(0.4); off = M.eval(OPACITY)
        x1, y1 = st['pane1'][0] + st['pane1'][2] / 2, st['pane1'][1] + st['pane1'][3] / 2
        M.call('Input.dispatchMouseEvent', type='mouseMoved', x=x1, y=y1); time.sleep(0.4); on = M.eval(OPACITY)
        ok('several charts: chart 2\'s "Open in a new window" tile hidden until chart 2 is hovered, then shown and pressable', off == '0|none' and on == '1|auto', [off, on])
        M.call('Input.dispatchMouseEvent', type='mouseMoved', x=5, y=5)
        # chart 2 in a window of its own, at his size
        M.eval("window.__stPractice._pop(1); 1")
        for _ in range(60):
            t = target('chart.html')
            if t: break
            time.sleep(0.25)
        C = bt.CDP(t['webSocketDebuggerUrl']); C.call('Page.enable'); C.call('Runtime.enable')
        C.call('Emulation.setDeviceMetricsOverride', width=1550, height=1000, deviceScaleFactor=1, mobile=False)
        ps = json.loads(M.eval(POPSTATE))
        ok('its window (1550 wide): no tile on the chart', not ps['tile'], ps)
        ok('..."Back to the main window" in its top bar, the bar\'s icon style, right before full screen', ps['back'] and ps['full'] and ps['backSvg'] and ps['backTitle'] == 'Back to the main window' and ps['order'][-2:] == ['back', 'full'] and ps['back'][1] == ps['full'][1] and ps['back'][3] == ps['full'][3] and 0 <= ps['gap'] <= 8, ps)
        ok('...the bar fits (every button inside it)', ps['fits'], [ps['maxRight'], ps['barRight']])
        for scrolled in (0, 1):
            fl = json.loads(M.eval(FLAGS % scrolled))
            ok('news flags at the latest candles (%s): %d flags in %d groups, none over Spread, the » chip or the logo' % ('scrolled back 4 candles' if scrolled else 'at the latest candle', fl['flags'], fl['groups']),
               fl['flags'] >= (5 if scrolled else 10) and not fl['hits'] and fl['spread'], fl)
            if scrolled:
                C.call('Input.dispatchMouseEvent', type='mouseMoved', x=fl['corner'][0], y=fl['corner'][1]); time.sleep(0.6); fl = json.loads(M.eval(FLAGS % 1))
                ok('...the mouse at the bottom right, the » chip on: still none over it', not fl['hits'] and fl['chip'], fl)
            shot(C, 'popback_1550_%s.png' % ('scrolled' if scrolled else 'latest'))
        shot(C, 'popback_1550_topright.png', (1550 - 520, 0, 520, 140))
        C.call('Emulation.setDeviceMetricsOverride', width=1366, height=900, deviceScaleFactor=1, mobile=False); time.sleep(1.2)
        ps2 = json.loads(M.eval(POPSTATE))
        ok('at 1366 wide: the bar still fits, Back before full screen', ps2['fits'] and ps2['order'][-2:] == ['back', 'full'], ps2)
        shot(C, 'popback_1366_top.png', (0, 0, 1366, 60))
        # pressed: chart 2 back in the app's window, its window closed
        C.eval("(function(){ document.querySelector('#stpr-tb2 [data-plback]').click(); return 1; })()")
        back = None
        for _ in range(40):
            time.sleep(0.25)
            try: back = M.eval("(function(){ var P = window.__stPractice; return P._panes().length === 2 && P._panes()[1].el.ownerDocument === document; })()")
            except Exception: back = None
            if back: break
        ok('Back to the main window: chart 2 is back beside chart 1', back is True, back)
    finally:
        try: subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception: proc.kill()
        bt.kill_profile(prof); httpd.shutdown(); relay.terminate(); ea.terminate()
    bad = [r for r in RES if not r[1]]
    print('\n%d checks, %d failed' % (len(RES), len(bad)))
    return 1 if (bad or not RES) else 0

if __name__ == '__main__':
    sys.exit(main())
