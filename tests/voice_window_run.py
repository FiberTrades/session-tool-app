# The session voice with two app windows (Nestor, 22 Oct 2026: "i didnt hear the session live chime today!!"). Run: python tests/voice_window_run.py
# Two app windows in one browser: A opened first and never clicked in, B clicked in. The session voice must end up with B (the one
# that can make a sound), and only the voice window may take part in the session open / close.
import functools, http.server, json, os, random, shutil, subprocess, sys, tempfile, threading, time, urllib.request
REPO = r'C:\Users\Nestor\OneDrive\Documents\Claude Code chats\session-tool-app'
sys.path.insert(0, os.path.join(REPO, 'tests'))
import browser_test as bt
edge = next(p for p in bt.EDGE_PATHS if os.path.exists(p))
wp = bt.free_port()
httpd = http.server.ThreadingHTTPServer(('127.0.0.1', wp), functools.partial(bt.Quiet, directory=REPO))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
dp = bt.free_port(); prof = tempfile.mkdtemp(prefix='edgeprof_vc_')
proc = bt.edge_popen([edge, '--headless=new', '--remote-debugging-port=%d' % dp, '--user-data-dir=' + prof, '--no-first-run', '--no-default-browser-check', '--window-size=1200,800', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
res = []
def ok(name, cond, got=None):
    res.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '   got: ' + str(got)[:300]), flush=True)
def ev(c, js):
    r = c.call('Runtime.evaluate', expression=js, awaitPromise=True, returnByValue=True)
    return (r.get('result') or {}).get('value')
def lst():
    return [t for t in json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dp, timeout=2).read()) if t.get('type') == 'page']
try:
    pages = []
    for _ in range(80):
        try:
            pages = lst()
            if pages: break
        except Exception: pass
        time.sleep(0.25)
    url = 'http://127.0.0.1:%d/app.html' % wp
    A = bt.CDP(pages[0]['webSocketDebuggerUrl']); A.call('Page.enable'); A.call('Runtime.enable')
    A.call('Page.navigate', url=url + '?a=%d' % random.randint(1, 10**9)); time.sleep(4)
    print('A', ev(A, "JSON.stringify({ hv: window.__stHoldsVoice && window.__stHoldsVoice(), act: navigator.userActivation.hasBeenActive, rec: localStorage.getItem('st_voice_owner') })"))
    ver = json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/version' % dp, timeout=2).read()); br = bt.CDP(ver['webSocketDebuggerUrl'])
    tid = br.call('Target.createTarget', url=url + '?b=%d' % random.randint(1, 10**9))['targetId']; time.sleep(4)
    tb = [t for t in lst() if t['id'] == tid][0]; B = bt.CDP(tb['webSocketDebuggerUrl']); B.call('Page.enable'); B.call('Runtime.enable')
    b0 = json.loads(ev(B, "JSON.stringify({ hv: window.__stHoldsVoice(), act: navigator.userActivation.hasBeenActive })"))
    ok('B opened second, not clicked in: A keeps the voice (B does not hold it)', b0['hv'] is False and b0['act'] is False, b0)
    # a click in B (a real mouse press)
    for t in ('mousePressed', 'mouseReleased'): B.call('Input.dispatchMouseEvent', type=t, x=600, y=400, button='left', clickCount=1)
    time.sleep(0.3)
    b1 = json.loads(ev(B, "JSON.stringify({ hv: window.__stHoldsVoice(), act: navigator.userActivation.hasBeenActive, rec: JSON.parse(localStorage.getItem('st_voice_owner')) })"))
    ok('clicked in B: B can make a sound and takes the voice from A (which never could)', b1['act'] is True and b1['hv'] is True and b1['rec']['a'] is True, b1)
    time.sleep(10)   # claims settle within one 4 s refresh (separate test tabs see each other's write a moment late)
    a1 = json.loads(ev(A, "JSON.stringify({ hv: window.__stHoldsVoice(), rec: JSON.parse(localStorage.getItem('st_voice_owner')) })"))
    b2 = json.loads(ev(B, "JSON.stringify({ hv: window.__stHoldsVoice() })"))
    ok('...and keeps it: A (never clicked) does not take it back', a1['hv'] is False and b2['hv'] is True, [a1, b2])
    # A clicked too: both can sound - the voice stays where it is (no back and forth)
    for t in ('mousePressed', 'mouseReleased'): A.call('Input.dispatchMouseEvent', type=t, x=600, y=400, button='left', clickCount=1)
    time.sleep(5)
    a2 = json.loads(ev(A, "JSON.stringify({ hv: window.__stHoldsVoice() })")); b3 = json.loads(ev(B, "JSON.stringify({ hv: window.__stHoldsVoice() })"))
    ok('both clicked in: the voice stays with B, one window only', a2['hv'] is False and b3['hv'] is True, [a2, b3])
    # B closed: A takes over within the claim's life
    br.call('Target.closeTarget', targetId=tid); time.sleep(1)
    a3 = json.loads(ev(A, "JSON.stringify({ hv: window.__stHoldsVoice() })"))
    ok('B closed: A has the voice at once', a3['hv'] is True, a3)
finally:
    subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try: bt.kill_profile(prof)
    except Exception: pass
    httpd.shutdown(); time.sleep(0.5); shutil.rmtree(prof, ignore_errors=True)
print('%d checks, %d failed' % (len(res), len([r for r in res if not r])))
