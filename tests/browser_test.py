# -*- coding: utf-8 -*-
"""Run a browser test file against the real app.html in headless Edge.

    python tests/browser_test.py tests/copier_e2e.js

Everything runs on this PC and touches nothing live:
- the repo folder is served on a free local port;
- Edge runs headless with a brand-new throwaway profile, so nobody is signed in and the journal starts empty;
- the test swaps the cloud calls it needs (the MT5 inbox, Community posting) for stand-ins.

The test file is one JavaScript expression that resolves to a JSON list of
{name, ok, got}. This prints PASS / FAIL per check and exits 1 if any failed.
Edge is always closed at the end, whole process tree included, so no headless browser is left running.
Needs only Python's standard library and Microsoft Edge.
"""
import base64
import faulthandler
import functools
import http.server
import json
import os
import random
import shutil
import socket
import struct
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request

faulthandler.dump_traceback_later(240, exit=True)   # a hang says where it is instead of running forever

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EDGE_PATHS = [r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
              r'C:\Program Files\Microsoft\Edge\Application\msedge.exe']


def free_port():
    s = socket.socket()
    s.bind(('127.0.0.1', 0))
    p = s.getsockname()[1]
    s.close()
    return p


def kill_profile(prof):
    """Close every Edge process started with this throwaway profile folder (its name is unique to the run)."""
    tag = os.path.basename(prof.rstrip('\\/'))
    if not tag:
        return
    ps = ("Get-CimInstance Win32_Process -Filter \"Name='msedge.exe'\" | Where-Object { $_.CommandLine -like '*" + tag + "*' } | "
          "ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }")
    try:
        subprocess.run(['powershell', '-NoProfile', '-Command', ps], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=30)
    except Exception:
        pass


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


class CDP:
    """A minimal DevTools-protocol client over a stdlib websocket."""

    def __init__(self, url):
        host, rest = url[len('ws://'):].split('/', 1)
        h, p = host.split(':')
        self.s = socket.create_connection((h, int(p)))
        key = base64.b64encode(os.urandom(16)).decode()
        self.s.sendall(('GET /%s HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n'
                        'Sec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n' % (rest, host, key)).encode())
        buf = b''
        while b'\r\n\r\n' not in buf:
            buf += self.s.recv(4096)
        self.buf = buf.split(b'\r\n\r\n', 1)[1]
        self.id = 0

    def _read(self, n):
        while len(self.buf) < n:
            c = self.s.recv(1 << 20)
            if not c:
                raise EOFError('DevTools connection closed')
            self.buf += c
        d, self.buf = self.buf[:n], self.buf[n:]
        return d

    def _send(self, obj):
        data = json.dumps(obj).encode()
        hdr = bytearray([0x81])
        n = len(data)
        if n < 126:
            hdr.append(0x80 | n)
        elif n < 65536:
            hdr.append(0x80 | 126)
            hdr += struct.pack('>H', n)
        else:
            hdr.append(0x80 | 127)
            hdr += struct.pack('>Q', n)
        mask = os.urandom(4)
        self.s.sendall(bytes(hdr) + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))

    def _recv(self):
        msg = b''
        while True:
            b1, b2 = self._read(2)
            n = b2 & 0x7f
            if n == 126:
                n = struct.unpack('>H', self._read(2))[0]
            elif n == 127:
                n = struct.unpack('>Q', self._read(8))[0]
            msg += self._read(n)
            if b1 & 0x80:
                return json.loads(msg.decode('utf-8', 'replace'))

    def call(self, method, **params):
        self.id += 1
        me = self.id
        self._send({'id': me, 'method': method, 'params': params})
        while True:
            m = self._recv()
            if m.get('id') == me:
                if 'error' in m:
                    raise RuntimeError('%s: %s' % (method, m['error']))
                return m.get('result', {})

    def eval(self, js):
        r = self.call('Runtime.evaluate', expression=js, awaitPromise=True, returnByValue=True)
        if 'exceptionDetails' in r:
            ex = r['exceptionDetails']
            raise RuntimeError((ex.get('exception') or {}).get('description') or ex.get('text'))
        return r.get('result', {}).get('value')


# Signed out, a fresh profile shows the sign-in screen, the first-run setup window and the tour on top of the app.
# They are hidden (never filled in) so the test can reach the app underneath.
PRELUDE = r"""(async () => {
  for (let i = 0; i < 100 && (typeof data === 'undefined' || !document.getElementById('mt5-import-btn')); i++)
    await new Promise(r => setTimeout(r, 100));
  try { if (window.STCloud && STCloud.getData) STCloud.getData()._tourDoneV1 = true; } catch (e) {}
  if (window.__stPlatOff === undefined) window.__stPlatOff = true;   // the Charts window as it was (24 Oct 2026: the platform has its own test, platform_e2e.js)
  document.querySelectorAll('.stc-gate, #onboarding-modal-bg, .onboarding-modal-bg, #lp-front, [class^="st-tour"]')
    .forEach(e => e.style.setProperty('display', 'none', 'important'));
  return typeof data !== 'undefined';
})()"""


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    test_js = open(sys.argv[1], encoding='utf-8').read()
    edge = next((p for p in EDGE_PATHS if os.path.exists(p)), None)
    if not edge:
        print('Microsoft Edge not found')
        return 2

    web_port = free_port()
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', web_port), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()

    dbg_port = free_port()
    prof = tempfile.mkdtemp(prefix='edgeprof_e2e_')
    proc = subprocess.Popen([edge, '--headless=new', '--remote-debugging-port=%d' % dbg_port, '--user-data-dir=' + prof,
                             '--no-first-run', '--no-default-browser-check', '--window-size=1280,1000',
                             # a headless page counts as backgrounded and gets a few frames a second; the charts apply a new view only on a
                             # frame, so view checks failed at random (15 Oct 2026: 3 frames a second measured)
                             '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
                             # Windows marked the headless window hidden ~11 s in (17 Oct 2026), and a hidden page draws no frames
                             '--disable-features=CalculateNativeWinOcclusion',
                             # a chart opened in a window of its own (Practice Replay) is a script's window.open: allowed here
                             '--disable-popup-blocking',
                             'about:blank'],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    failed = 1
    try:
        pages = []
        for _ in range(80):
            try:
                tabs = json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dbg_port, timeout=2).read())
                pages = [t for t in tabs if t.get('type') == 'page']
                if pages:
                    break
            except Exception:
                pass
            time.sleep(0.25)
        if not pages:
            print('Edge did not start')
            return 2
        cdp = CDP(pages[0]['webSocketDebuggerUrl'])
        cdp.call('Page.enable')
        cdp.call('Runtime.enable')
        # keep the page the focused, visible one: otherwise it turns hidden ~10 s in and draws no frames (17 Oct 2026)
        try:
            cdp.call('Page.bringToFront'); cdp.call('Emulation.setFocusEmulationEnabled', enabled=True)
        except Exception:
            pass
        # the clipboard, so a test can copy an image and read it back (the snapshot's Copy image, 17 Oct 2026)
        try:
            cdp.call('Browser.grantPermissions', permissions=['clipboardReadWrite', 'clipboardSanitizedWrite'], origin='http://127.0.0.1:%d' % web_port)
        except Exception:
            pass
        mob = os.environ.get('E2E_MOBILE', '')   # e.g. 375x812: a phone's screen, with touch (22 Oct 2026)
        if not mob:
            # the window's size set here, not left to the desktop: with the monitor off Windows shrank the headless window to 500 x 320
            # (23 Oct 2026, a night run) and every layout check failed
            try: cdp.call('Emulation.setDeviceMetricsOverride', width=1280, height=1000, deviceScaleFactor=1, mobile=False)
            except Exception: pass
        if mob:
            try:
                mw, mh = [int(v) for v in mob.lower().split('x')]
                cdp.call('Emulation.setDeviceMetricsOverride', width=mw, height=mh, deviceScaleFactor=2, mobile=True)
                cdp.call('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
            except Exception:
                pass
        app = os.environ.get('E2E_APP', 'app.html')   # another file name runs the same test against an older copy
        cdp.call('Page.navigate', url='http://127.0.0.1:%d/%s?e2e=%d' % (web_port, app, random.randint(1, 10 ** 9)))
        time.sleep(2)
        if not cdp.eval(PRELUDE):
            print('The app did not load')
            return 2
        raw = cdp.eval(test_js)
        results = json.loads(raw) if isinstance(raw, str) else (raw or [])
        width = max([len(r['name']) for r in results] + [10])
        for r in results:
            got = '' if r.get('ok') else '   got: ' + json.dumps(r.get('got'), ensure_ascii=False)[:400]
            print('%s  %s%s' % ('PASS' if r.get('ok') else 'FAIL', r['name'].ljust(width), got))
        bad = [r for r in results if not r.get('ok')]
        print('\n%d checks, %d failed' % (len(results), len(bad)))
        failed = 1 if (bad or not results) else 0
        return failed
    finally:
        # Close Edge with its whole process tree, then the web server, then the profile.
        try:
            subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            proc.kill()
        # The tree kill does not always reach the browser: 30 headless Edges from earlier runs were still open on 17 Oct
        # 2026, still running their test pages. Close anything that uses this run's own throwaway profile.
        kill_profile(prof)
        httpd.shutdown()
        time.sleep(0.5)
        shutil.rmtree(prof, ignore_errors=True)


if __name__ == '__main__':
    sys.exit(main())
