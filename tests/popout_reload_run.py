"""Live Charts' and Back Testing's own windows come back after a reload (Nestor, 19 Oct 2026: "on an external new window of
charts if i reload that window the charts disapear and the normal app appears with all the main tabs etc. i just wanted to
reload the tabs and see them back").

Each window's address is opened in a headless Edge (throwaway profile, signed out, nothing live), checked, reloaded with
the browser's own reload, and checked again.
    python tests/popout_reload_run.py
"""
import functools, http.server, json, os, shutil, subprocess, sys, tempfile, threading, time, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import browser_test as bt
import faulthandler
faulthandler.cancel_dump_traceback_later(); faulthandler.dump_traceback_later(420, exit=True)   # two app loads per window, each waiting on its candles

STATE = """(function () { try { var lp = document.getElementById('lp-front'); if (lp) lp.style.display = 'none';   // signed out the landing page is on top; a member never has it
  Array.prototype.forEach.call(document.querySelectorAll('[class^="st-tour"]'), function (e) { e.style.display = 'none'; });   // nor a fresh profile's first-run tour
  var bg = document.getElementById('stpr-bg'), P = window.__stPractice, s = P && P._s && P._s();
  return JSON.stringify({ search: location.search, mask: document.documentElement.className, bg: bg ? bg.className : '', title: document.title,
    S: !!s, live: !!(s && s.live), covers: [[0.5, 0.5], [0.1, 0.1], [0.9, 0.9]].every(function (q) { var e = document.elementFromPoint(innerWidth * q[0], innerHeight * q[1]); return !!(e && e.closest && e.closest('#stpr-bg')); }),
    top: (function () { var e = document.elementFromPoint(innerWidth / 2, innerHeight / 2); return e ? (e.id || e.className || e.tagName) + ' < ' + (e.parentNode && (e.parentNode.id || e.parentNode.className)) : ''; })() }); }
  catch (e) { return JSON.stringify({ err: String(e) }); } })()"""


def wait_shown(cdp, live, secs=80):
    st = {}
    end = time.time() + secs
    while time.time() < end:
        time.sleep(0.5)
        try:
            st = json.loads(cdp.eval(STATE) or '{}')
        except Exception:
            continue
        if 'show' in st.get('bg', '') and 'popped' in st.get('bg', '') and st.get('S') and (not live or st.get('live')):
            return True, st
    return False, st


def main():
    edge = next((p for p in bt.EDGE_PATHS if os.path.exists(p)), None)
    web_port = bt.free_port()
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', web_port), functools.partial(bt.Quiet, directory=bt.ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    dbg_port = bt.free_port()
    prof = tempfile.mkdtemp(prefix='edgeprof_e2e_')
    proc = bt.edge_popen([edge, '--headless=new', '--remote-debugging-port=%d' % dbg_port, '--user-data-dir=' + prof,
                             '--no-first-run', '--no-default-browser-check', '--window-size=1280,1000',
                             '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
                             '--disable-features=CalculateNativeWinOcclusion', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    results = []
    T0 = time.time()
    def check(name, ok, got):
        results.append((name, ok, got)); print('...', round(time.time() - T0), 'ok' if ok else 'not yet', name, '' if ok else json.dumps(got)[:300], flush=True)
    try:
        pages = []
        for _ in range(80):
            try:
                pages = [t for t in json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dbg_port, timeout=2).read()) if t.get('type') == 'page']
                if pages: break
            except Exception: pass
            time.sleep(0.25)
        cdp = bt.CDP(pages[0]['webSocketDebuggerUrl'])
        cdp.call('Page.enable'); cdp.call('Runtime.enable')
        try: cdp.call('Page.bringToFront'); cdp.call('Emulation.setFocusEmulationEnabled', enabled=True)
        except Exception: pass
        # the owner-only gate of Live Charts, as livecharts_e2e sets it - on every page this tab loads, reloads included
        cdp.call('Page.addScriptToEvaluateOnNewDocument', source='window.__stLcForce = true;')
        base = 'http://127.0.0.1:%d/app.html' % web_port

        cdp.call('Page.navigate', url=base + '?practice=1&sym=EURUSD&day=2026-10-01')
        ok, st = wait_shown(cdp, False)
        check("Back Testing's window fills the window and its address keeps ?practice=1", ok and st.get('search') == '?practice=1' and st.get('covers'), st)
        cdp.call('Page.reload'); time.sleep(1.5)
        ok, st = wait_shown(cdp, False)
        check('...reloaded: Back Testing again (where it was), not the app with its tabs', ok and st.get('search') == '?practice=1' and st.get('covers'), st)

        cdp.call('Page.navigate', url=base + '?livecharts=1&sym=EURUSD')
        ok, st = wait_shown(cdp, True)
        check("Live Charts' window fills the window and its address keeps ?livecharts=1", ok and st.get('search') == '?livecharts=1' and 'Live Charts' in st.get('title', '') and st.get('covers'), st)
        cdp.call('Page.reload'); time.sleep(1.5)
        ok, st = wait_shown(cdp, True)
        check('...reloaded: Live Charts again, not the app with its tabs', ok and st.get('search') == '?livecharts=1' and 'Live Charts' in st.get('title', '') and st.get('covers'), st)
    finally:
        try: subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception: proc.kill()
        bt.kill_profile(prof)
        httpd.shutdown(); time.sleep(0.5); shutil.rmtree(prof, ignore_errors=True)
    w = max(len(r[0]) for r in results) if results else 10
    for name, ok, got in results:
        print('%s  %s%s' % ('PASS' if ok else 'FAIL', name.ljust(w), '' if ok else '   got: ' + json.dumps(got, ensure_ascii=False)[:400]))
    bad = [r for r in results if not r[1]]
    print('\n%d checks, %d failed' % (len(results), len(bad)))
    return 1 if bad or not results else 0


if __name__ == '__main__':
    sys.exit(main())
