# Runs dmdelete_e2e.js (27 Oct 2026): a deleted DM conversation stays deleted - phase A in one page load, phase B after a reload as
# another device. The app in headless Edge, the DMs on an in-memory database the test keeps in localStorage.
#   python tests/dmdelete_run.py
import functools, http.server, json, os, random, shutil, subprocess, sys, tempfile, threading, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
os.environ.setdefault('E2E_TIMEOUT', '600')
import browser_test as bt
SRC = open(os.path.join(HERE, 'dmdelete_e2e.js'), encoding='utf-8').read()
fails = 0
edge = next(p for p in bt.EDGE_PATHS if os.path.exists(p))
wp = bt.free_port(); httpd = http.server.ThreadingHTTPServer(('127.0.0.1', wp), functools.partial(bt.Quiet, directory=ROOT))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
dp = bt.free_port(); prof = tempfile.mkdtemp(prefix='edgeprof_dmdel_')
proc = bt.edge_popen([edge, '--headless=new', '--remote-debugging-port=%d' % dp, '--user-data-dir=' + prof, '--no-first-run', '--hide-scrollbars',
                         '--window-size=1400,1000', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    pages = []
    for _ in range(80):
        try:
            pages = [t for t in json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dp, timeout=2).read()) if t.get('type') == 'page']
            if pages: break
        except Exception: pass
        time.sleep(0.25)
    c = bt.CDP(pages[0]['webSocketDebuggerUrl']); c.call('Page.enable'); c.call('Runtime.enable')
    c.call('Emulation.setDeviceMetricsOverride', width=1400, height=1000, deviceScaleFactor=1, mobile=False)
    url = 'http://127.0.0.1:%d/app.html?e2e=%d' % (wp, random.randint(1, 10 ** 9))
    for ph in ('A', 'B'):
        c.call('Page.navigate', url=url); time.sleep(2.5)   # each phase a page load of its own
        c.eval(bt.PRELUDE)
        raw = c.eval(SRC.replace('__PHASE__', ph))
        res = json.loads(raw) if isinstance(raw, str) else (raw or [])
        print('-- phase %s --' % ph)
        for r in res:
            print('%s  %s%s' % ('PASS' if r.get('ok') else 'FAIL', r['name'], '' if r.get('ok') else '   got: ' + json.dumps(r.get('got'), ensure_ascii=False)[:400]))
        fails += len([r for r in res if not r.get('ok')])
finally:
    try: subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception: proc.kill()
    bt.kill_profile(prof)
    httpd.shutdown(); shutil.rmtree(prof, ignore_errors=True)
print('\n%d failed' % fails)
sys.exit(1 if fails else 0)
