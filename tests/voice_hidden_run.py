# The session voice when the app window has been minimised for a long time (2 Nov 2026, Nestor: "i want to make sure that if the app is minimized but the
# main chart is opened in an external window users still hear the session live and session end chime"). A real minimised window, the browser's own throttling
# on: after 5 minutes hidden its timers fire once a MINUTE. The session opens 5.5+ minutes after the window is minimised; this measures how late the voice is,
# and that it is heard once. Network to the database is blocked (the claim answers "unavailable", which speaks by design). Takes about 7 minutes.
#   python tests/voice_hidden_run.py
#   E2E_APP=old.html python tests/voice_hidden_run.py      (another copy of the app, to see the old behaviour)
import functools, http.server, json, os, random, shutil, subprocess, sys, tempfile, threading, time, urllib.request
os.environ.setdefault('E2E_TIMEOUT', '700')
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import browser_test as bt


def main():
    edge = next(p for p in bt.EDGE_PATHS if os.path.exists(p))
    wp = bt.free_port()
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', wp), functools.partial(bt.Quiet, directory=bt.ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    dp = bt.free_port(); prof = tempfile.mkdtemp(prefix='edgeprof_vh_')
    proc = bt.edge_popen([edge, '--headless=new', '--remote-debugging-port=%d' % dp, '--user-data-dir=' + prof, '--no-first-run', '--no-default-browser-check', '--window-size=1280,900', '--disable-popup-blocking', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        pages = []
        for _ in range(80):
            try:
                pages = [t for t in json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dp, timeout=2).read()) if t.get('type') == 'page']
                if pages: break
            except Exception: pass
            time.sleep(0.25)
        c = bt.CDP(pages[0]['webSocketDebuggerUrl']); c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.enable')
        c.call('Page.navigate', url='http://127.0.0.1:%d/%s?v=%d' % (wp, os.environ.get('E2E_APP', 'app.html'), random.randint(1, 10 ** 9)))
        time.sleep(2)
        if not c.eval(bt.PRELUDE): print('The app did not load'); return 2
        c.call('Network.setBlockedURLs', urls=['*supabase.co*'])
        for t in ('mousePressed', 'mouseReleased'): c.call('Input.dispatchMouseEvent', type=t, x=640, y=300, button='left', clickCount=1)   # a person has clicked in the app: it may make a sound
        time.sleep(.5)
        now = time.time(); start = int((now + 5.6 * 60) // 60 + 1) * 60
        js = """(function(){ var d = new Date(%d * 1000), p = function(n){ return String(n).padStart(2, '0'); }, e = new Date(d.getTime() + 600000);
          window.currentUser = { id: 'test-voice' }; window.__stIsTradingDay = function(){ return true; };
          window.__plays = []; var st = AudioBufferSourceNode.prototype.start, pl = HTMLMediaElement.prototype.play;
          AudioBufferSourceNode.prototype.start = function(){ window.__plays.push(Date.now()); };
          HTMLMediaElement.prototype.play = function(){ window.__plays.push(Date.now()); return Promise.resolve(); };
          data.settings.sessions = [{ name: 'Test', start: p(d.getHours()) + ':' + p(d.getMinutes()), end: p(e.getHours()) + ':' + p(e.getMinutes()) }]; saveData();
          window.__ctxS = function(){ try { return getAudioCtx().state; } catch (x) { return 'none'; } };
          return data.settings.sessions[0].start; })()""" % start
        print('session opens at', c.eval(js), 'audio', c.eval('__ctxS()'), flush=True)
        c.call('Emulation.setFocusEmulationEnabled', enabled=False)
        w = c.call('Browser.getWindowForTarget')
        c.call('Browser.setWindowBounds', windowId=w['windowId'], bounds={'windowState': 'minimized'}); time.sleep(1)
        print('app window', c.eval('document.visibilityState'), flush=True)
        while time.time() < start + 90:
            time.sleep(5)
            n = c.eval('window.__plays.length')
            if n: break
        time.sleep(4)
        plays = json.loads(c.eval('JSON.stringify(window.__plays)'))
        log = c.eval("localStorage.getItem('st_voicelog')")
        late = [round(x / 1000 - start, 1) for x in plays]
        print('played', len(plays), 'seconds after the session opened:', late, flush=True)
        ok = len(plays) == 1 and -1 <= late[0] <= 5
        print(('PASS' if ok else 'FAIL'), 'minimised for over 5 minutes: heard once, within 5 s of the session opening')
        if not ok: print((log or '')[-400:])
        return 0 if ok else 1
    finally:
        subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        bt.kill_profile(prof); httpd.shutdown(); time.sleep(.5); shutil.rmtree(prof, ignore_errors=True)


if __name__ == '__main__':
    sys.exit(main())
