# The chart windows' start-up setup checklist (Nestor, 21 Oct 2026: "that was a nightmare to set up, you need to make this way
# simpler"). Run: python tests/charts_startup_setup_run.py allowed   (or blocked: pop-ups blocked)
# ticked -> it opens; Copy copies; the pop-ups check says blocked / goes green when allowed.
#   python wsr_setup_test.py blocked|allowed
import base64, functools, http.server, json, os, random, shutil, subprocess, sys, tempfile, threading, time, urllib.request
REPO = r'C:\Users\Nestor\OneDrive\Documents\Claude Code chats\session-tool-app'
SP = tempfile.gettempdir()
sys.path.insert(0, os.path.join(REPO, 'tests'))
import browser_test as bt
import faulthandler; faulthandler.cancel_dump_traceback_later()
mode = sys.argv[1]
edge = next(p for p in bt.EDGE_PATHS if os.path.exists(p))
wp = bt.free_port()
httpd = http.server.ThreadingHTTPServer(('127.0.0.1', wp), functools.partial(bt.Quiet, directory=REPO))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
dp = bt.free_port(); prof = tempfile.mkdtemp(prefix='edgeprof_wst_')
args = [edge, '--headless=new', '--remote-debugging-port=%d' % dp, '--user-data-dir=' + prof, '--no-first-run', '--no-default-browser-check', '--window-size=1500,950', 'about:blank']
if mode == 'allowed': args.insert(2, '--disable-popup-blocking')
proc = bt.edge_popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
res = []
def ok(name, cond, got=None):
    res.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '   got: ' + str(got)[:400]), flush=True)
def ev(c, js, gesture=True):
    r = c.call('Runtime.evaluate', expression=js, awaitPromise=True, returnByValue=True, userGesture=gesture)
    if 'exceptionDetails' in r: return 'EXC ' + json.dumps(r['exceptionDetails'])[:300]
    return (r.get('result') or {}).get('value')
try:
    pages = []
    for _ in range(80):
        try:
            pages = [t for t in json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dp, timeout=2).read()) if t.get('type') == 'page']
            if pages: break
        except Exception: pass
        time.sleep(0.25)
    ver = json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/version' % dp, timeout=2).read()); br = bt.CDP(ver['webSocketDebuggerUrl'])
    origin = 'http://127.0.0.1:%d' % wp
    try: br.call('Browser.grantPermissions', origin=origin, permissions=['clipboardReadWrite', 'clipboardSanitizedWrite'])
    except Exception as e: print('grant failed', e)
    cdp = bt.CDP(pages[0]['webSocketDebuggerUrl']); cdp.call('Page.enable'); cdp.call('Runtime.enable')
    try: cdp.call('Emulation.setFocusEmulationEnabled', enabled=True)
    except Exception as e: print('focus emu failed', e)
    cdp.call('Page.addScriptToEvaluateOnNewDocument', source="window.__stLcForce = true; try { localStorage.removeItem('st_chartwins_v1'); } catch (e) {}")
    cdp.call('Page.navigate', url=origin + '/app.html?x=%d' % random.randint(1, 10**9)); time.sleep(3)
    print(ev(cdp, r"""(async function(){ var W = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
      for (var i = 0; i < 200 && !(window.__stPractice && window.__stLC); i++) await W(100); await W(800);
      document.querySelectorAll('.stc-gate, #onboarding-modal-bg, .onboarding-modal-bg, #lp-front, [class^="st-tour"]').forEach(function(e){ e.style.setProperty('display', 'none', 'important'); });
      var P = window.__stPractice, C = P._cfg(); C.layout = 3; C.tfs = [15, 60, 240, 5]; C.max = false;
      document.querySelector('.tab[data-page="livecharts"]').click();
      for (var k = 0; k < 300 && !(P._s() && P._panes().length === 3 && P._panes()[2].n); k++) await W(100);
      P._panes()[2].el.querySelector('[data-popc]').click(); for (k = 0; k < 150 && !(P._pops()[2] && P._pops()[2].ready); k++) await W(100); await W(2000);
      document.getElementById('stpr-laybtn').click(); await W(300);
      var bt = document.querySelector('#stpr-menu [data-wsrset]'); return JSON.stringify({ setBtn: bt && bt.textContent }); })()"""))
    st = json.loads(ev(cdp, r"""(async function(){ var W = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
      var cb = document.querySelector('#stpr-menu input[data-wsr]'); cb.click(); await W(500);
      var d = document.querySelector('.stpr-dlgbg.plain'); var rows = d ? Array.prototype.map.call(d.querySelectorAll('.stpr-wsrs'), function(r){ return (r.classList.contains('ok') ? 'OK ' : '.. ') + r.querySelector('b').textContent; }) : null;
      return JSON.stringify({ dialog: !!d, title: d && d.querySelector('.stpr-dlgh b').textContent, rows: rows, cancelHidden: d && getComputedStyle(d.querySelector('[data-dc]')).display === 'none', ok: d && d.querySelector('[data-dok]').textContent }); })()"""))
    ok('ticking the box opens the setup: "Open my charts when the computer starts"', st['dialog'] and st['title'] == 'Open my charts when the computer starts', st)
    ok('...the windows step is green at once (a chart is out, the box ticked); the others wait', st['rows'] and st['rows'][0].startswith('OK ') and all(r.startswith('.. ') for r in st['rows'][1:]), st['rows'])
    ok('...a plain box: no Cancel or Defaults, a Close button', st['cancelHidden'] and st['ok'] == 'Close', st)
    shot = cdp.call('Page.captureScreenshot', format='png'); open(os.path.join(SP, 'wsr_setup_%s.png' % mode), 'wb').write(base64.b64decode(shot['data']))
    cp = json.loads(ev(cdp, r"""(async function(){ var W = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
      window.prompt = function(m, v){ window.__prompted = v; return null; }; var b = document.querySelector('.stpr-dlgbg.plain [data-wscopy="apps"]'); b.click(); await W(400); var txt = ''; try { txt = await navigator.clipboard.readText(); } catch (e) { txt = 'read failed ' + e; }
      var b2 = document.querySelector('.stpr-dlgbg.plain [data-wscopy="apps"]'); return JSON.stringify({ clip: txt, label: b2 && b2.textContent, prompted: window.__prompted || null }); })()"""))
    ok('Copy puts chrome://apps (edge://apps in Edge) on the clipboard and says Copied', cp['clip'] in ('chrome://apps', 'edge://apps') and cp['label'] == 'Copied', cp)
    t0 = time.time()
    pc = json.loads(ev(cdp, r"""(async function(){ var W = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
      document.querySelector('.stpr-dlgbg.plain [data-wspc]').click(); await W(200); var lab = document.querySelector('.stpr-dlgbg.plain [data-wspc]').textContent;
      for (var k = 0; k < 120 && window.__stPractice._wsr.st().checking; k++) await W(100); await W(300);
      var d = document.querySelector('.stpr-dlgbg.plain'), rows = Array.prototype.map.call(d.querySelectorAll('.stpr-wsrs'), function(r){ return (r.classList.contains('ok') ? 'OK ' : '.. ') + r.querySelector('b').textContent; });
      return JSON.stringify({ during: lab, pop: window.__stPractice._wsr.get().pop, rows: rows, bad: !!d.querySelector('.stpr-wsrbad') }); })()"""))
    took = time.time() - t0
    ok('Check: it says Checking... while it waits', pc['during'].startswith('Checking'), pc)
    if mode == 'blocked':
        ok('pop-ups blocked: "Still blocked.", the step stays open (took %.1f s)' % took, pc['pop'] is False and pc['bad'], pc)
    else:
        ok('pop-ups allowed: the step turns green (took %.1f s)' % took, pc['pop'] is True and any(r.startswith('OK ') and 'open by themselves' in r for r in pc['rows']), pc)
    dn = json.loads(ev(cdp, r"""(async function(){ var W = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
      var cb = document.querySelector('.stpr-dlgbg.plain input[data-wsboot]'); cb.click(); await W(300);
      var d = document.querySelector('.stpr-dlgbg.plain'), rows = Array.prototype.map.call(d.querySelectorAll('.stpr-wsrs'), function(r){ return (r.classList.contains('ok') ? 'OK ' : '.. ') + r.querySelector('b').textContent; });
      d.querySelector('[data-dok]').click(); await W(200); document.getElementById('stpr-laybtn').click(); await W(300);
      var bt = document.querySelector('#stpr-menu [data-wsrset]'); return JSON.stringify({ rows: rows, menu: bt && bt.textContent, closed: !document.querySelector('.stpr-dlgbg.plain') }); })()"""))
    ok('"Done" on the start-with-the-computer step turns it green', any(r.startswith('OK ') and 'starts with your computer' in r for r in dn['rows']), dn)
    ok('Close shuts it; the layout menu shows how many steps are done', dn['closed'] and ('of' in (dn['menu'] or '') or 'all set' in (dn['menu'] or '')), dn)
    shot = cdp.call('Page.captureScreenshot', format='png'); open(os.path.join(SP, 'wsr_menu2_%s.png' % mode), 'wb').write(base64.b64decode(shot['data']))
finally:
    subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try: bt.kill_profile(prof)
    except Exception: pass
    httpd.shutdown(); time.sleep(0.5); shutil.rmtree(prof, ignore_errors=True)
print('%d checks, %d failed' % (len(res), len([r for r in res if not r])))
