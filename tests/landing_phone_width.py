# The landing page (index.html) must never be wider than the phone, in English or Spanish.
# 20 Oct 2026: in Spanish the savings bill's last line ("Session Terminal £35 o £30 con el plan anual") could not wrap, so the
# page was 423px wide on a 375px phone and scrolled sideways. This loads index.html at 375, 360 and 320px in both languages and
# lists anything that sticks out past the screen (ignoring things inside their own sideways-scrolling box).
# Run: python tests/landing_phone_width.py
import functools, http.server, json, os, random, shutil, subprocess, sys, tempfile, threading, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import browser_test as bt

JS = r"""(function(){ var W = document.documentElement.clientWidth, out = [];
  document.querySelectorAll('body *').forEach(function(e){ var r = e.getBoundingClientRect(); if (r.width && r.right > W + 1) {
    var p = e.parentElement, inside = false; while (p && p !== document.body) { var cs = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(cs.overflowX)) { var pr = p.getBoundingClientRect(); if (pr.right <= W + 1) { inside = true; break; } } p = p.parentElement; }
    if (!inside) out.push((e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).join('.') : '')).slice(0, 60) + ' right=' + Math.round(r.right)); } });
  return JSON.stringify({W: W, sw: document.documentElement.scrollWidth, items: out.slice(0, 8)}); })()"""

def main():
    edge = next(p for p in bt.EDGE_PATHS if os.path.exists(p))
    wp = bt.free_port()
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', wp), functools.partial(bt.Quiet, directory=REPO))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    dp = bt.free_port()
    prof = tempfile.mkdtemp(prefix='edgeprof_lpw_')
    proc = bt.edge_popen([edge, '--headless=new', '--remote-debugging-port=%d' % dp, '--user-data-dir=' + prof, '--no-first-run', '--no-default-browser-check',
                             '--window-size=375,812', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    fails = 0
    try:
        pages = []
        for _ in range(80):
            try:
                pages = [t for t in json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dp, timeout=2).read()) if t.get('type') == 'page']
                if pages: break
            except Exception: pass
            time.sleep(0.25)
        cdp = bt.CDP(pages[0]['webSocketDebuggerUrl'])
        cdp.call('Page.enable'); cdp.call('Runtime.enable')
        for w in (375, 360, 320):
            cdp.call('Emulation.setDeviceMetricsOverride', width=w, height=812, deviceScaleFactor=2, mobile=True)
            for lang in ('en', 'es'):
                cdp.call('Page.navigate', url='http://127.0.0.1:%d/index.html?x=%d' % (wp, random.randint(1, 10**9)))
                time.sleep(3)
                cdp.eval("(function(){ var b = document.querySelector('.lang-sq[data-lang=\"%s\"]'); if (b) b.click(); return 1; })()" % lang); time.sleep(0.6)
                cdp.eval("document.querySelectorAll('.reveal').forEach(function(x){ x.classList.add('in','visible','show'); }); 1"); time.sleep(0.6)
                r = json.loads(cdp.eval(JS))
                ok = r['sw'] <= r['W'] and not r['items']
                fails += 0 if ok else 1
                print('%s  %dpx %s: page %dpx wide%s' % ('PASS' if ok else 'FAIL', w, lang.upper(), r['sw'], '' if ok else ' - ' + '; '.join(r['items'])))
    finally:
        subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try: bt.kill_profile(prof)
        except Exception: pass
        httpd.shutdown(); time.sleep(0.5); shutil.rmtree(prof, ignore_errors=True)
    print('%d failed' % fails)
    return 1 if fails else 0

if __name__ == '__main__':
    sys.exit(main())
