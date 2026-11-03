# The Calendar under a real mouse (Nestor, 3 Nov 2026: "the buttons from calendar still flicker when hovering over them and i have to click a few time on a day or week for it to open as it seems it doesnt register the click").
# Repaints with nothing changed touch nothing, and a press and release always opens the day or week, even with a real change landing between them. Run: python tests/calclick_run.py
import json, os, sys, time, functools, http.server, threading, tempfile, subprocess, urllib.request, random, shutil
import browser_test as bt
faulthandler_on = __import__('faulthandler'); faulthandler_on.dump_traceback_later(170, exit=True)
edge = next(p for p in bt.EDGE_PATHS if os.path.exists(p)); web = bt.free_port(); width = 1400; fails = 0
app = os.environ.get('E2E_APP', 'app.html')
httpd = http.server.ThreadingHTTPServer(('127.0.0.1', web), functools.partial(bt.Quiet, directory=bt.ROOT)); threading.Thread(target=httpd.serve_forever, daemon=True).start()
dbg = bt.free_port(); prof = tempfile.mkdtemp(prefix='edgeprof_calclick_')
proc = bt.edge_popen([edge, '--headless=new', '--remote-debugging-port=%d' % dbg, '--user-data-dir=' + prof, '--no-first-run', '--window-size=%d,1000' % width, '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank'])
def ok(name, cond, got=None):
    global fails
    fails += 0 if cond else 1
    print('%s  %s%s' % ('PASS' if cond else 'FAIL', name, '' if got is None else '  ' + json.dumps(got)))
try:
    pages = []
    for _ in range(80):
        try:
            pages = [t for t in json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dbg, timeout=2).read()) if t.get('type') == 'page']
            if pages: break
        except Exception: pass
        time.sleep(0.25)
    c = bt.CDP(pages[0]['webSocketDebuggerUrl']); c.call('Page.enable'); c.call('Runtime.enable'); c.call('Page.bringToFront'); c.call('Emulation.setFocusEmulationEnabled', enabled=True)
    c.call('Emulation.setDeviceMetricsOverride', width=width, height=1000, deviceScaleFactor=1, mobile=False)
    c.call('Page.navigate', url='http://127.0.0.1:%d/%s?e2e=%d' % (web, app, random.randint(1, 10 ** 9))); time.sleep(2); c.eval(bt.PRELUDE); time.sleep(5)
    c.eval("""(function () {
      var css = document.createElement('style'); css.textContent = '.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
      document.querySelector('.tab[data-page="tradeview"]').click(); return 1; })()"""); time.sleep(2)
    # a day with a trade, today, so a real change has something to change
    c.eval("""(function () { var A = newAccountBlank('FTMO 70K', 70000, 'challenge'); A.kind = 'challenge'; data.accounts = [A]; data.activeAccountId = A.id; data.viewScope = 'lifetime'; var d = new Date(); d.setHours(9, 5, 0, 0);
      data.currentSeries = [{ id: 'cc1', accountId: A.id, symbol: 'EUR/USD', date: d.toISOString(), dayOfWeek: d.getDay(), result: 'Win', r: 2, risk: 100, actualGross: 200, costs: 0 }]; rebuildSeriesByDate(); renderTradeView(); return 1; })()"""); time.sleep(.5)
    r = json.loads(c.eval("""JSON.stringify((function(){ var e = document.querySelector('#cal-grid .cal-day[data-date]:not(.cal-day-noclick)'); e.scrollIntoView({block:'center'}); var t = e.getBoundingClientRect(); var w = document.querySelector('#cal-grid .cal-week-summary.clickable').getBoundingClientRect(); return { x: t.left + t.width / 2, y: t.top + t.height / 2, wx: w.left + w.width / 2, wy: w.top + w.height / 2 }; })())"""))
    time.sleep(.5)
    c.call('Input.dispatchMouseEvent', type='mouseMoved', x=r['x'], y=r['y']); time.sleep(.5)
    got = json.loads(c.eval(r"""(async function () {
      var g = document.getElementById('cal-grid'), muts = 0, mo = new MutationObserver(function (m) { muts += m.length; });
      mo.observe(g, { subtree: true, childList: true, characterData: true }); mo.observe(document.getElementById('cal-month-summary'), { subtree: true, childList: true, characterData: true });
      var el = document.querySelector('.cal-day[data-date]:hover');
      for (var i = 0; i < 20; i++) { renderCalendar(); await new Promise(function (r) { setTimeout(r, 50); }); }
      mo.disconnect();
      return JSON.stringify({ muts: muts, sameCell: !!el && el.isConnected && el === document.querySelector('.cal-day[data-date]:hover') });
    })()"""))
    ok('20 repaints with nothing changed: the calendar is not touched, the same cell stays under the mouse', got['muts'] == 0 and got['sameCell'], got)
    op = "JSON.stringify(['day-modal-bg', 'review-modal-bg'].filter(function (i) { var m = document.getElementById(i); return m && m.classList.contains('show'); }))"
    close = "['day-modal-bg', 'review-modal-bg'].forEach(function (i) { var m = document.getElementById(i); if (m) m.classList.remove('show'); }); 1"
    def press(x, y):
        c.call('Input.dispatchMouseEvent', type='mouseMoved', x=x, y=y); time.sleep(.1)
        c.call('Input.dispatchMouseEvent', type='mousePressed', x=x, y=y, button='left', clickCount=1); time.sleep(.05)
    def release(x, y):
        c.call('Input.dispatchMouseEvent', type='mouseReleased', x=x, y=y, button='left', clickCount=1); time.sleep(.5)
    for nm, x, y, want in (('a day', r['x'], r['y'], 'day-modal-bg'), ('a week', r['wx'], r['wy'], 'review-modal-bg')):
        hit = 0
        for i in range(5):
            press(x, y); release(x, y)
            hit += 1 if json.loads(c.eval(op)) == [want] else 0
            c.eval(close); time.sleep(.15)
        ok('%s: 5 clicks, 5 opens' % nm, hit == 5, hit)
        press(x, y); c.eval('renderCalendar(); 1'); release(x, y)
        o = json.loads(c.eval(op)); c.eval(close); time.sleep(.15)
        ok('%s: a repaint with nothing changed between press and release: it opens' % nm, o == [want], o)
        press(x, y)
        c.eval("(function () { data.currentSeries[0].actualGross += 50; data.currentSeries[0]._c = Date.now(); rebuildSeriesByDate(); renderCalendar(); return 1; })()")
        release(x, y)
        o = json.loads(c.eval(op)); c.eval(close); time.sleep(.15)
        ok('%s: a real change between press and release (every cell replaced): it still opens, once' % nm, o == [want], o)
    got = json.loads(c.eval("""JSON.stringify((function () { var w = document.querySelector('#cal-grid .cal-day.cal-c1'), d = document.querySelector('#cal-grid .cal-day[data-date]:not(.cal-day-noclick)'); return { weekendNoClick: !!w && w.classList.contains('cal-day-noclick'), tagged: !!d && /cal-c[2-6]/.test(d.className) }; })())"""))
    ok('weekends stay unclickable, cells keep their column tags', got['weekendNoClick'] and got['tagged'], got)
    w = json.loads(c.eval("""JSON.stringify((function () { var e = document.querySelector('#cal-grid .cal-day.cal-c1'); e.scrollIntoView({block:'center'}); var t = e.getBoundingClientRect(); return { x: t.left + t.width / 2, y: t.top + t.height / 2 }; })())""")); time.sleep(.3)
    press(w['x'], w['y']); release(w['x'], w['y'])
    o = json.loads(c.eval(op)); c.eval(close)
    ok('clicking a weekend opens nothing', o == [], o)
    t0 = c.eval("document.getElementById('cal-month-title').textContent")
    c.eval("document.getElementById('cal-prev').click(); 1"); time.sleep(.2)
    t1 = c.eval("document.getElementById('cal-month-title').textContent")
    c.eval("document.getElementById('cal-next').click(); 1"); time.sleep(.2)
    ok('month arrows still change the month and come back', t0 != t1 and c.eval("document.getElementById('cal-month-title').textContent") == t0, [t0, t1])
finally:
    subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); bt.kill_profile(prof); httpd.shutdown(); time.sleep(.3); shutil.rmtree(prof, ignore_errors=True)
print('\n%d failed' % fails)
sys.exit(1 if fails else 0)
