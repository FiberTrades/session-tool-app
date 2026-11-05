# Runs replaywin_e2e.js (3 Nov 2026): Live Charts' own window and two chart windows turn into Replay where they are and back; real windows, a stand-in EA
# through a local relay; nothing live is touched.
#   python tests/replaywin_run.py [screenshot folder]
#   E2E_APP=old.html python tests/replaywin_run.py      (another copy of the app, to see the old behaviour)
import base64, calendar, functools, http.server, json, os, random, shutil, socket, subprocess, sys, tempfile, threading, time, urllib.request
os.environ.setdefault('E2E_TIMEOUT', '800')
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import browser_test as bt
T0 = calendar.timegm((2026, 10, 14, 8, 30, 0))
TOK = 'st-test-replaywin'
SHOTS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(tempfile.gettempdir(), 'st_replaywin')
os.makedirs(SHOTS, exist_ok=True)
SESS = {}


def targets(dbg):
    return [t for t in json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dbg, timeout=5).read()) if t.get('type') == 'page']


def shot(dbg, part, name):
    for t in targets(dbg):
        if part in t.get('url', ''):
            c = SESS.get(t['id']) or bt.CDP(t['webSocketDebuggerUrl'])
            out = os.path.join(SHOTS, name); open(out, 'wb').write(base64.b64decode(c.call('Page.captureScreenshot', format='png')['data'])); print('screenshot', out)
            return


def size_popups(dbg, stop):
    done = set()
    while not stop.is_set():
        try:
            for t in targets(dbg):
                u = t.get('url', '')
                if t['id'] in done or not ('livecharts.html' in u or 'chart.html' in u): continue
                c = bt.CDP(t['webSocketDebuggerUrl'])
                w, h = (1440, 940) if 'livecharts.html' in u else (1100, 680)
                c.call('Emulation.setDeviceMetricsOverride', width=w, height=h, deviceScaleFactor=1, mobile=False)
                done.add(t['id']); SESS[t['id']] = c
        except Exception:
            pass
        time.sleep(0.3)


def main():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); rport = s.getsockname()[1]; s.close()
    relay = subprocess.Popen([sys.executable, os.path.join(HERE, '..', 'relay', 'server.py')], env=dict(os.environ, PORT=str(rport)), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    out = os.path.join(tempfile.gettempdir(), 'st_fake_ea_replaywin.json')
    ea = subprocess.Popen([sys.executable, os.path.join(HERE, 'fake_ea_livecharts.py'), TOK, '800', out, 'EURUSD', str(T0), '1.1640', '5', '90001234'],
                          env=dict(os.environ, ST_RELAY='127.0.0.1:%d' % rport, ST_FAKE_V='9.03'), stdout=subprocess.DEVNULL)
    time.sleep(2)
    src = open(os.path.join(HERE, 'replaywin_e2e.js'), encoding='utf-8').read().replace('__RELAY__', 'ws://127.0.0.1:%d/realtime/v1/websocket?vsn=1.0.0' % rport).replace('__TOK__', TOK)
    edge = next(p for p in bt.EDGE_PATHS if os.path.exists(p))
    wp = bt.free_port()
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', wp), functools.partial(bt.Quiet, directory=bt.ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    dbg = bt.free_port(); prof = tempfile.mkdtemp(prefix='edgeprof_rw_')
    proc = bt.edge_popen([edge, '--headless=new', '--remote-debugging-port=%d' % dbg, '--user-data-dir=' + prof, '--no-first-run', '--no-default-browser-check', '--window-size=1280,1000',
                          '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion', '--disable-popup-blocking', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    results = []
    try:
        pages = []
        for _ in range(80):
            try:
                pages = targets(dbg)
                if pages: break
            except Exception: pass
            time.sleep(0.25)
        cdp = bt.CDP(pages[0]['webSocketDebuggerUrl']); cdp.call('Page.enable'); cdp.call('Runtime.enable')
        try: cdp.call('Page.bringToFront'); cdp.call('Emulation.setFocusEmulationEnabled', enabled=True)
        except Exception: pass
        cdp.call('Emulation.setDeviceMetricsOverride', width=1600, height=960, deviceScaleFactor=1, mobile=False)
        cdp.call('Page.navigate', url='http://127.0.0.1:%d/%s?e2e=%d' % (wp, os.environ.get('E2E_APP', 'app.html'), random.randint(1, 10 ** 9)))
        time.sleep(2)
        cdp.eval('window.__stPlatOff = false; 1')
        if not cdp.eval(bt.PRELUDE):
            print('The app did not load'); return 2
        stop = threading.Event(); threading.Thread(target=size_popups, args=(dbg, stop), daemon=True).start()

        def part(name):
            if os.environ.get('RW_SEQ') and name not in os.environ['RW_SEQ'].split(','): return   # only these parts, in their usual order
            raw = cdp.eval('window.__RW.' + name + '()')
            r = json.loads(raw) if isinstance(raw, str) else (raw or [])
            results.extend(r)
            for x in r:
                print('%s  %s%s' % ('PASS' if x.get('ok') else 'FAIL', x['name'], '' if x.get('ok') else '   got: ' + json.dumps(x.get('got'), ensure_ascii=False)[:500]), flush=True)

        def close_app_with_stage():
            # the app window closed during Replay: Live Charts' window becomes the app, Live, with the chart windows
            st = next((t for t in targets(dbg) if 'livecharts.html' in t.get('url', '')), None)
            L = bt.CDP(st['webSocketDebuggerUrl']); L.call('Page.enable'); L.call('Runtime.enable')
            L.call('Page.addScriptToEvaluateOnNewDocument', source='window.__stLcForce = true; window.__stPlatOff = false;')
            charts0 = sorted(t['id'] for t in targets(dbg) if 'chart.html' in t.get('url', ''))
            app_id = next(t['id'] for t in targets(dbg) if '/app.html' in t.get('url', '') and 'livecharts=1' not in t.get('url', ''))
            urllib.request.urlopen('http://127.0.0.1:%d/json/close/%s' % (dbg, app_id), timeout=5).read()
            for _ in range(40):
                if not any(t['id'] == app_id for t in targets(dbg)): break
                try: cdp.call('Page.handleJavaScriptDialog', accept=True)
                except Exception: pass
                time.sleep(.25)
            live = None
            for _ in range(240):
                try:
                    live = L.eval("(function(){ var P = window.__stPractice, s = P && P._s && P._s(); return JSON.stringify({ url: location.search, live: !!(s && s.live), solo: !!(P && P._lv && P._lv().solo), n: P && P._panes ? P._panes().length : 0, here: P && P._panes ? P._panes().filter(function(p){ return p.el.ownerDocument === document; }).length : 0, drawn: P && P._panes ? P._panes().filter(function(p){ return p.n > 0; }).length : 0, pops: P && P._pops ? Object.keys(P._pops()).filter(function(k){ return P._pops()[k].ready; }).length : 0 }); })()")
                    o = json.loads(live)
                    if o['live'] and o['solo'] and o['here'] == 1 and o['pops'] == 2 and o['drawn'] == 3: break
                except Exception: pass
                time.sleep(.5)
            o = json.loads(live or '{}')
            ok = bool(o.get('live') and o.get('solo') and o.get('here') == 1 and o.get('pops') == 2 and o.get('drawn') == 3 and 'livecharts=1' in o.get('url', ''))
            results.append({'name': "the app window closed during Replay: Live Charts' window becomes the app, Live, chart 1 there, the chart windows still theirs", 'ok': ok, 'got': o})
            print('PASS ' if ok else 'FAIL ', results[-1]['name'], '' if ok else o, flush=True)
            now = sorted(t['id'] for t in targets(dbg) if 'chart.html' in t.get('url', ''))
            ok = now == charts0
            results.append({'name': '...the same chart windows, none closed or reopened', 'ok': ok, 'got': [charts0, now]})
            print('PASS ' if ok else 'FAIL ', results[-1]['name'], '' if ok else [charts0, now], flush=True)
            return L

        cdp.eval(src)
        if os.environ.get('RW_CLOSE_STAGE'):   # only this: Live Charts' own window and two chart windows, the app window closed (RW_CLOSE_STAGE=replay: during Replay; =live: in Live)
            part('setup')
            if os.environ['RW_CLOSE_STAGE'] == 'replay': part('toReplay')
            close_app_with_stage()
            return 0 if all(x.get('ok') for x in results) else 1
        part('setup')
        if os.environ.get('RW_PRESS'):   # his report, 4 Nov 2026: Replay in Live Charts' window can't be pressed, in a chart window it can. A REAL mouse press, the favourite bar off, floating, up in the top bar
            stop.set(); time.sleep(.5)
            st = next(t for t in targets(dbg) if 'livecharts.html' in t.get('url', ''))
            L = SESS.get(st['id']) or bt.CDP(st['webSocketDebuggerUrl']); L.call('Page.enable'); L.call('Runtime.enable'); L.call('Page.bringToFront')
            try: L.call('Emulation.setFocusEmulationEnabled', enabled=True)
            except Exception: pass
            L.call('Emulation.setDeviceMetricsOverride', width=1960, height=940, deviceScaleFactor=1, mobile=False); time.sleep(1.5)
            L.eval("""(function(){ window.__L=[]; var d=function(t){ if(!t) return null; return t.tagName+'#'+(t.id||'')+'.'+String(t.className&&t.className.baseVal===undefined?t.className:'').slice(0,40); };
              ['pointerdown','mousedown','pointerup','mouseup','click'].forEach(function(n){ window.addEventListener(n,function(e){ window.__L.push('cap '+n+' '+d(e.target)); },true); window.addEventListener(n,function(e){ window.__L.push('end '+n+' prevented='+e.defaultPrevented); }); }); return 1; })()""")
            def press(what):
                g = json.loads(L.eval("""(function(){ var b=document.querySelector('.plat-top [data-plrp]'), q=b.getBoundingClientRect(), x=q.left+q.width/2, y=q.top+q.height/2, top=document.elementFromPoint(x,y), up=document.querySelector('.stpr-favbar.up'), fl=document.querySelector('.stpr-favbar.show:not(.up)'), R=function(e){ if(!e) return null; var r=e.getBoundingClientRect(); return [Math.round(r.left),Math.round(r.top),Math.round(r.right),Math.round(r.bottom)]; };
                   window.__L.length=0; return JSON.stringify({x:x,y:y,btn:R(b),top:top&&(top.tagName+'#'+top.id+'.'+String(top.className).slice(0,40)),inBtn:b.contains(top),up:up&&up.classList.contains('show')?R(up):null,fl:R(fl)}); })()"""))
                for ty, kw in (('mouseMoved', {}), ('mousePressed', {'button': 'left', 'clickCount': 1}), ('mouseReleased', {'button': 'left', 'clickCount': 1})):
                    L.call('Input.dispatchMouseEvent', type=ty, x=g['x'], y=g['y'], **kw); time.sleep(.12)
                time.sleep(.5)
                r = json.loads(L.eval("""JSON.stringify({asked:!!document.getElementById('lc-ask-bg'),log:window.__L.slice(0,12)})"""))
                app = cdp.eval("!!document.getElementById('lc-ask-bg')")
                print(('PASS ' if r['asked'] else 'FAIL '), what, json.dumps(g)[:260], 'asked here', r['asked'], 'asked in app', app, flush=True); print('    ', r['log'], flush=True)
                L.eval("(function(){ var a=document.getElementById('lc-ask-bg'); if(a) a.querySelector('[data-lca=\"0\"]').click(); return 1; })()"); cdp.eval("(function(){ var a=document.getElementById('lc-ask-bg'); if(a) a.remove(); return 1; })()"); time.sleep(.4)
                return r['asked']
            ok = press('bar off')
            L.eval("document.getElementById('stpr-favbtn').click(); 1"); time.sleep(1); ok = press('bar floating') and ok
            cdp.eval("(function(){ var C=window.__stPractice._cfg(); C.fav=['trend','hline','hray','ray','rect','text','brush','note']; C.favDockW={m:{x:0}}; return 1; })()"); L.eval("document.getElementById('stpr-favbtn').click(); 1"); time.sleep(.5); L.eval("document.getElementById('stpr-favbtn').click(); 1"); time.sleep(1); ok = press('bar up in the top bar') and ok
            # as his screen: Check my bias showing, the last chart touched in a chart window, the app's window not the one in front
            cdp.eval("window.__stPlanCheck = window.__stPlanCheck || function(){ return true; }; 1"); time.sleep(1.5); ok = press('Check my bias showing') and ok
            ct = next(t for t in targets(dbg) if 'chart.html?slot=1' in t.get('url', ''))
            C1 = SESS.get(ct['id']) or bt.CDP(ct['webSocketDebuggerUrl']); C1.call('Runtime.enable'); C1.call('Page.bringToFront')
            for ty, kw in (('mouseMoved', {}), ('mousePressed', {'button': 'left', 'clickCount': 1}), ('mouseReleased', {'button': 'left', 'clickCount': 1})):
                C1.call('Input.dispatchMouseEvent', type=ty, x=500, y=350, **kw); time.sleep(.1)
            time.sleep(1); L.call('Page.bringToFront'); time.sleep(.5); ok = press('after a click in the chart window') and ok
            ok = press('...pressed again') and ok
            q = C1.eval("(function(){ var b=document.querySelector('#stpr-tb2 [data-plrp], [data-plrp]'); if(!b) return 'none'; var r=b.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2,top:!!b.closest('.plat-top'),cls:b.className}); })()")
            print('     chart window button', q, flush=True)
            shot(dbg, 'livecharts.html', 'rw_press.png')
            return 0 if ok else 1
        if os.environ.get('RW_CLOSE_NOSTAGE'):   # the app window closed during Replay with no Live Charts' window: nothing is left to draw the chart windows
            part('appReplay')
            before = [t['id'] for t in targets(dbg) if 'chart.html' in t.get('url', '')]
            app_id = next(t['id'] for t in targets(dbg) if '/app.html' in t.get('url', ''))
            urllib.request.urlopen('http://127.0.0.1:%d/json/close/%s' % (dbg, app_id), timeout=5).read()
            for _ in range(40):
                if not any(t['id'] == app_id for t in targets(dbg)): break
                try: cdp.call('Page.handleJavaScriptDialog', accept=True)
                except Exception: pass
                time.sleep(.25)
            t0 = time.time(); left = before
            while left and time.time() - t0 < 20:
                time.sleep(.5); left = [t['id'] for t in targets(dbg) if 'chart.html' in t.get('url', '')]
            ok = len(before) == 2 and not left
            print('PASS ' if ok else 'FAIL ', 'no Live Charts window, the app window closed during Replay: the chart windows close with it, %.1f s later' % (time.time() - t0), '' if ok else [before, left], flush=True)
            return 0 if ok else 1
        part('toReplay')
        shot(dbg, 'livecharts.html', 'rw_stage_replay.png'); shot(dbg, 'chart.html?slot=1', 'rw_chart_replay.png')
        part('stageControls'); part('chartWinControls')
        t = [x for x in targets(dbg) if 'chart.html?slot=1' in x.get('url', '')]
        if t:
            c = SESS.get(t[0]['id']) or bt.CDP(t[0]['webSocketDebuggerUrl'])
            c.call('Emulation.setDeviceMetricsOverride', width=760, height=500, deviceScaleFactor=1, mobile=False); time.sleep(.8)
            part('narrowChartWin'); shot(dbg, 'chart.html?slot=1', 'rw_chart_narrow.png')
            c.call('Emulation.setDeviceMetricsOverride', width=1100, height=680, deviceScaleFactor=1, mobile=False); time.sleep(.5)
        part('noLive'); part('toLive')
        shot(dbg, 'livecharts.html', 'rw_stage_live_again.png'); shot(dbg, 'chart.html?slot=1', 'rw_chart_live_again.png')

        def reload_app():
            ids0 = sorted(t['id'] for t in targets(dbg) if 'chart.html' in t.get('url', '') or 'livecharts' in t.get('url', ''))
            cdp.call('Page.addScriptToEvaluateOnNewDocument', source="window.__stLcForce = true; window.__stPlatOff = false; window.__stRelayURL = 'ws://127.0.0.1:%d/realtime/v1/websocket?vsn=1.0.0';" % rport)
            cdp.call('Page.reload'); time.sleep(2)
            if not cdp.eval(bt.PRELUDE): print('The app did not come back'); return ids0
            cdp.eval(src); part('rewire')
            return ids0

        def same_windows(ids0, what):
            time.sleep(1)
            now = sorted(t['id'] for t in targets(dbg) if 'chart.html' in t.get('url', '') or 'livecharts' in t.get('url', ''))
            ok = now == ids0
            results.append({'name': what, 'ok': ok, 'got': [ids0, now]})
            print('PASS ' if ok else 'FAIL ', what, '' if ok else [ids0, now], flush=True)

        part('appReplay')
        part('popFromReplay')
        shot(dbg, 'livecharts.html', 'rw_pop_from_replay.png')
        ids = reload_app(); part('afterReloadStage'); same_windows(ids, 'reloaded with Live Charts\' window: the same windows, none closed or reopened')
        part('pressAfterReload')
        part('noStageReplay')
        ids = reload_app(); part('afterReloadApp'); same_windows(ids, 'reloaded with Replay in the app: the same chart windows, none closed or reopened')
        part('stageReplayAgain')
        L = close_app_with_stage()
        # Replay pressed in that window, now the app itself (his report, 4 Nov 2026)
        press = L.eval("""(async function(){ var W=function(ms){return new Promise(function(r){setTimeout(r,ms)})}, P=window.__stPractice, b=document.querySelector('[data-plrp]');
          if(!b) return JSON.stringify({btn:false}); var q=b.getBoundingClientRect(), top=document.elementFromPoint(q.left+q.width/2,q.top+q.height/2), shown=q.width>0; b.click(); await W(400);
          var bg=document.getElementById('lc-ask-bg'); if(!bg) return JSON.stringify({btn:true,shown:shown,top:top&&(top.id||top.className),asked:false,plon:P._plat&&P._plat().on});
          bg.querySelector('[data-lca=\"1\"]').click(); for(var k=0;k<160&&!(P._s()&&!P._s().live&&P._panes().length&&P._panes()[0].n>0);k++) await W(150);
          return JSON.stringify({btn:true,shown:shown,asked:true,live:!!(P._s()&&P._s().live),day:P._s()&&P._s().day}); })()""")
        o = json.loads(press or '{}'); ok = bool(o.get('asked') and o.get('live') is False)
        results.append({'name': "...Replay pressed there: it asks, then turns into Replay", 'ok': ok, 'got': o})
        print('PASS ' if ok else 'FAIL ', results[-1]['name'], '' if ok else o, flush=True)
        stop.set()
        bad = [r for r in results if not r.get('ok')]
        print('\n%d checks, %d failed' % (len(results), len(bad)))
        return 1 if (bad or not results) else 0
    finally:
        try: subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception: proc.kill()
        bt.kill_profile(prof); httpd.shutdown(); relay.terminate(); ea.terminate(); time.sleep(.5); shutil.rmtree(prof, ignore_errors=True)


if __name__ == '__main__':
    sys.exit(main())
