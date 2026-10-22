"""The Minimalist's session times in each member's own time (Nestor, 22 Oct 2026, of Aurora in Spain: "can you make sure these times
adapt to the individuals timezone? so for aurora this should say for london 8-11am").

A London session saved as 07:00-10:00 with the old setting (GMT+1, London's summer time), opened by a browser in Madrid and one in
London: Madrid shows 08:00-11:00, London 07:00-10:00, and the box sits on the 07:00 London candle for both. Typed in Madrid, 09:00 is
kept as 08:00 London. In winter (January) the box stays on 07:00 London (a fixed GMT+1 would have moved it to 06:00).
    python tests/mini_sestz_run.py
"""
import functools, http.server, json, os, random, shutil, subprocess, sys, tempfile, threading, time, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import browser_test as bt

PAGE = os.environ.get('E2E_APP', 'app.html')
OPEN = r"""(async function(day){ var W = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  for (var i = 0; i < 200 && !window.__stPractice; i++) await W(100); await W(600);
  document.querySelectorAll('.stc-gate, #onboarding-modal-bg, .onboarding-modal-bg, #lp-front, [class^="st-tour"]').forEach(function(e){ e.style.setProperty('display', 'none', 'important'); });
  var P = window.__stPractice, C = P._cfg(); C.layout = 1; C.tfs = [15, 60, 240, 5]; C.max = true; C.resume = null; C.mini = true; C.miniOff = {}; C.miniPer = {}; C.miniOffPer = {};
  C.miniS = { tz: 1, ses: [{ on: true, name: 'LND', a: '07:00', b: '10:00' }, { on: false }, { on: false }, { on: false }] };   // as saved before (GMT+1)
  await P.open({ symbol: 'EURUSD', day: day }); for (var k = 0; k < 100 && !(P._s() && P._panes().length && P._panes()[0].n); k++) await W(100);
  P._goto && P._goto('16:00'); P._render(); await W(800); return 1; })"""
STARTS = r"""(function(){ var P = window.__stPractice, p = P._panes()[0], M = P._mini(0), f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return JSON.stringify(M.ses.filter(function(x){ return x.k === 0; }).slice(-3).map(function(x){ return f.format(new Date(p.bars[x.i0].time * 1000)); })); })()"""
DLG = r"""(async function(){ var W = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }, P = window.__stPractice; P._miniDialog(); await W(150);
  var a = document.querySelector('.stpr-dlg [data-k="s0.a"]'), b = document.querySelector('.stpr-dlg [data-k="s0.b"]'), tz = document.querySelector('.stpr-dlg .stpr-dtz');
  return JSON.stringify({ a: a && a.value, b: b && b.value, tz: tz && tz.textContent, picker: !!document.querySelector('.stpr-dlg [data-k="tz"]') }); })()"""
TYPE = r"""(async function(){ var W = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }, P = window.__stPractice;
  var a = document.querySelector('.stpr-dlg [data-k="s0.a"]'); a.value = '09:00'; a.dispatchEvent(new Event('input', { bubbles: true })); await W(100);
  document.querySelector('.stpr-dlg [data-dok]').click(); await W(300); P._render(); await W(400);
  return JSON.stringify({ stored: P._cfg().miniS.ses[0].a, tz: P._cfg().miniS.tz }); })()"""


def main():
    edge = next((p for p in bt.EDGE_PATHS if os.path.exists(p)), None)
    web_port = bt.free_port()
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', web_port), functools.partial(bt.Quiet, directory=bt.ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    results = []
    def check(name, ok, got=None):
        results.append((name, bool(ok), got)); print(('ok ' if ok else 'NO ') + name, '' if ok else json.dumps(got)[:300], flush=True)
    def run(zone, day, body):
        dbg_port = bt.free_port(); prof = tempfile.mkdtemp(prefix='edgeprof_stz_')
        proc = subprocess.Popen([edge, '--headless=new', '--remote-debugging-port=%d' % dbg_port, '--user-data-dir=' + prof, '--no-first-run', '--no-default-browser-check', '--window-size=1400,900', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            pages = []
            for _ in range(80):
                try:
                    pages = [t for t in json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dbg_port, timeout=2).read()) if t.get('type') == 'page']
                    if pages: break
                except Exception: pass
                time.sleep(0.25)
            c = bt.CDP(pages[0]['webSocketDebuggerUrl']); c.call('Page.enable'); c.call('Runtime.enable')
            c.call('Emulation.setTimezoneOverride', timezoneId=zone)
            c.call('Page.navigate', url='http://127.0.0.1:%d/%s?x=%d' % (web_port, PAGE, random.randint(1, 10**9))); time.sleep(3)
            ev = lambda js: c.call('Runtime.evaluate', expression=js, awaitPromise=True, returnByValue=True)['result'].get('value')
            ev(OPEN + '(%s)' % json.dumps(day))
            body(ev)
        finally:
            subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            try: bt.kill_profile(prof)
            except Exception: pass
            shutil.rmtree(prof, ignore_errors=True)
    try:
        def madrid(ev):
            st = json.loads(ev(STARTS)); check('Madrid: the London box starts on the 07:00 London candle', st and all(x == '07:00' for x in st), st)
            d = json.loads(ev(DLG)); check('Madrid: the settings show 08:00 - 11:00 (her time), "Your time (Madrid, GMT+2)", no GMT picker', d['a'] == '08:00' and d['b'] == '11:00' and 'Madrid, GMT+2' in (d['tz'] or '') and not d['picker'], d)
            t = json.loads(ev(TYPE)); check('Madrid: 09:00 typed is kept as 08:00 London', t['stored'] == '08:00', t)
            st = json.loads(ev(STARTS)); check('...and the box now starts on the 08:00 London candle', st and all(x == '08:00' for x in st), st)
        run('Europe/Madrid', '2026-10-01', madrid)
        def london(ev):
            d = json.loads(ev(DLG)); check('London: the same session shows 07:00 - 10:00, "Your time (London, GMT+1)"', d['a'] == '07:00' and d['b'] == '10:00' and 'London, GMT+1' in (d['tz'] or ''), d)
            st = json.loads(ev(STARTS)); check('London: the box on the 07:00 London candle', st and all(x == '07:00' for x in st), st)
        run('Europe/London', '2026-10-01', london)
        def winter(ev):
            st = json.loads(ev(STARTS)); check('January (London on GMT): the box stays on 07:00 London, not 06:00', st and all(x == '07:00' for x in st), st)
        run('Europe/London', '2026-01-15', winter)
    finally:
        httpd.shutdown(); time.sleep(0.3)
    for name, ok, got in results:
        print('%s  %s%s' % ('PASS' if ok else 'FAIL', name, '' if ok else '   got: ' + json.dumps(got)[:300]))
    bad = [r for r in results if not r[1]]
    print('\n%d checks, %d failed' % (len(results), len(bad)))
    return 1 if bad or not results else 0


if __name__ == '__main__':
    sys.exit(main())
