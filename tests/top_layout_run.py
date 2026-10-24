# The top of the app with Bloomberg TV on and off (Nestor, 24 Oct 2026: "yes to build the Session Bias top (TV on, plus your TV-off idea)").
#   python tests/top_layout_run.py [shots_dir]
# Computer widths: 1920, 1500, 1280, 1100 (the TV in its slot beside the title) and 1024 (docked under the header).
# Phones (375, 390): the top must be exactly where it was - compared against origin/main's app.html, served as _top_old.html.
# Headless Edge, a throwaway profile, nothing live touched. Exits 1 if any check fails.
import base64, functools, http.server, json, os, subprocess, sys, tempfile, threading, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import browser_test as bt
import faulthandler
faulthandler.cancel_dump_traceback_later(); faulthandler.dump_traceback_later(900, exit=True)   # seven app starts: longer than the runner's 240 s
SHOTS = sys.argv[1] if len(sys.argv) > 1 else None
OLD = os.path.join(ROOT, '_top_old.html')
open(OLD, 'wb').write(subprocess.run(['git', 'show', 'origin/main:app.html'], cwd=ROOT, capture_output=True).stdout)

GEO = """(function(){
  var r=function(e){if(!e)return null;var b=e.getBoundingClientRect();return {l:Math.round(b.left),t:Math.round(b.top+scrollY),r:Math.round(b.right),b:Math.round(b.bottom+scrollY),w:Math.round(b.width),h:Math.round(b.height)};};
  var f=document.getElementById('bloomberg-floater'), hd=document.querySelector('.header'), meta=document.querySelector('.meta');
  var cells=[].slice.call(document.querySelectorAll('.meta .meta-cell')).map(function(c){var v=c.querySelector('.meta-value'),l=c.querySelector('.meta-label');return {c:r(c),v:r(v),lab:r(l)};});
  return {h1:r(document.querySelector('.header h1')), tabs:r(document.querySelector('.tabs')), meta:r(meta), metaInHeader: !!(meta&&hd&&hd.contains(meta)),
          tv: f&&!f.hidden&&f.offsetParent ? r(f) : null, tvIn: f&&hd&&hd.contains(f)?'header':(f&&f.parentNode&&f.parentNode.className||''), tvOn: hd.classList.contains('tv-on'),
          news: r(document.getElementById('bias-news-sec')), cells: cells, sx: document.documentElement.scrollWidth, vw: innerWidth};
})()"""
OPEN_TV = "(function(){document.querySelectorAll('.stc-gate').forEach(function(g){g.classList.remove('open');});var f=document.getElementById('bloomberg-floater');if(f.hidden)document.getElementById('econ-bloomberg-btn').click();return !f.hidden;})()"
SIZE_JS = """(async function(){var W=function(ms){return new Promise(function(r){setTimeout(r,ms);});};
  var sm=document.getElementById('bloomberg-floater-smaller'), bg=document.getElementById('bloomberg-floater-bigger'), f=document.getElementById('bloomberg-floater');
  var geo=function(){var b=f.getBoundingClientRect(),t=document.querySelector('.tabs').getBoundingClientRect(),h=document.querySelector('.header h1').getBoundingClientRect();
    var cs=[].slice.call(document.querySelectorAll('.header .meta .meta-cell')).map(function(c){return Math.round(c.getBoundingClientRect().top);});
    return {w:Math.round(b.width),bottom:Math.round(b.bottom),tabsTop:Math.round(t.top),h1h:Math.round(h.height),rows:cs.filter(function(v,i,a){return a.indexOf(v)===i;}).length,smD:sm.disabled,bgD:bg.disabled,vis:getComputedStyle(sm).display!=='none'&&getComputedStyle(bg).display!=='none'};};
  var out={down:null,up:[]};
  for(var i=0;i<6&&!sm.disabled;i++){sm.click();await W(150);} out.down=geo();
  for(var j=0;j<6&&!bg.disabled;j++){bg.click();await W(150);out.up.push(geo());}
  return out;})()"""
CLOSE_TV = "(function(){var f=document.getElementById('bloomberg-floater');if(!f.hidden)document.getElementById('bloomberg-floater-close').click();return f.hidden;})()"

out = []
def check(name, ok, got=None):
    out.append((name, bool(ok), got)); print('%s  %s%s' % ('PASS' if ok else 'FAIL', name, '' if ok else '   got: ' + json.dumps(got)[:400]))


def session(W, H, mob, page, fn):
    edge = next(p for p in bt.EDGE_PATHS if os.path.exists(p))
    wp = bt.free_port(); httpd = http.server.ThreadingHTTPServer(('127.0.0.1', wp), functools.partial(bt.Quiet, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    dp = bt.free_port(); prof = tempfile.mkdtemp(prefix='edgeprof_top_')
    proc = subprocess.Popen([edge, '--headless=new', '--remote-debugging-port=%d' % dp, '--user-data-dir=' + prof, '--no-first-run', '--hide-scrollbars',
                             '--window-size=%d,%d' % (max(W, 800), max(H, 800)), '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
                             '--disable-features=CalculateNativeWinOcclusion', '--autoplay-policy=no-user-gesture-required', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        pages = []
        for _ in range(80):
            try:
                pages = [t for t in json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dp, timeout=2).read()) if t.get('type') == 'page']
                if pages: break
            except Exception: pass
            time.sleep(0.25)
        c = bt.CDP(pages[0]['webSocketDebuggerUrl']); c.call('Page.enable'); c.call('Runtime.enable')
        c.call('Emulation.setDeviceMetricsOverride', width=W, height=H, deviceScaleFactor=2 if mob else 1, mobile=mob)
        if mob: c.call('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
        c.call('Page.navigate', url='http://127.0.0.1:%d/%s?e2e=top' % (wp, page)); time.sleep(2)
        c.eval(bt.PRELUDE); time.sleep(3); c.eval(bt.PRELUDE)
        c.eval("(function(){document.querySelectorAll('[class^=\"st-tour\"], .st-greet-pop').forEach(function(e){e.remove();});window.scrollTo(0,0);return 1;})()")
        return fn(c)
    finally:
        try: subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception: proc.kill()
        bt.kill_profile(prof); httpd.shutdown()


def snap(c, name):
    if not SHOTS: return
    c.eval("(function(){window.scrollTo(0,0);return 1;})()"); time.sleep(0.4)
    open(os.path.join(SHOTS, 'top_%s.png' % name), 'wb').write(base64.b64decode(c.call('Page.captureScreenshot', format='png')['data']))


def desk(W, H):
    def run(c):
        res = {}
        c.eval(OPEN_TV); time.sleep(3); res['on'] = c.eval(GEO); snap(c, '%d_on' % W)
        c.eval(CLOSE_TV); time.sleep(1); res['off'] = c.eval(GEO); snap(c, '%d_off' % W)
        c.eval(OPEN_TV); time.sleep(2); res['on2'] = c.eval(GEO)
        res['size'] = c.eval(SIZE_JS)   # − to the smallest, then + to the biggest this screen allows
        c.call('Page.reload'); time.sleep(2); c.eval(bt.PRELUDE); time.sleep(3); c.eval(bt.PRELUDE); c.eval(OPEN_TV); time.sleep(2)
        res['kept'] = c.eval(GEO); snap(c, '%d_big' % W)
        return res
    g = session(W, H, False, 'app.html', run)
    on, off = g['on'], g['off']
    tag = '%d: ' % W
    sz = g['size']   # − / + size buttons (24 Oct 2026: "zoom in/out +- buttons on the tv")
    ws = [sz['down']['w']] + [u['w'] for u in sz['up']]
    check(tag + 'TV size: − down to 320px, then + in steps of 80px, the ends disabled', sz['down']['vis'] and sz['down']['w'] == 320 and sz['down']['smD']
          and all(b - a == 80 for a, b in zip(ws, ws[1:])) and (not sz['up'] or sz['up'][-1]['bgD']) and len(ws) >= (2 if W >= 1100 else 4), ws)
    check(tag + 'TV size: at every size the TV stays above the tabs' + (', the title on one line, the info in one row' if W >= 1100 else ''),
          all(u['bottom'] <= u['tabsTop'] and (W < 1100 or (u['h1h'] <= 100 and u['rows'] == 1)) for u in [sz['down']] + sz['up']), [sz['down']] + sz['up'])
    check(tag + 'TV size: remembered on this device after a reload', g['kept']['tv'] and g['kept']['tv']['w'] == ws[-1], [g['kept']['tv'], ws[-1]])
    check(tag + 'no sideways scroll', on['sx'] <= on['vw'] and off['sx'] <= off['vw'], [on['sx'], off['sx'], on['vw']])
    check(tag + 'title 76px tall line', on['h1'] and 60 <= on['h1']['h'] <= 100, on['h1'])
    if W >= 1100:
        tv = on['tv']
        check(tag + 'TV on: in its slot in the header, header says tv-on', tv and on['tvIn'] == 'header' and on['tvOn'], [on['tvIn'], on['tvOn'], tv])
        check(tag + 'TV on: about 400px wide, right of the title and the info', tv and 390 <= tv['w'] <= 410 and tv['l'] > on['h1']['r'] and tv['l'] > on['meta']['r'], [tv, on['h1'], on['meta']])
        check(tag + 'TV on: never over the tabs', tv and tv['b'] <= on['tabs']['t'], [tv, on['tabs']])
        check(tag + 'TV on: the info sits under the title, left-aligned with it', on['meta']['t'] >= on['h1']['b'] and abs(on['meta']['l'] - on['h1']['l']) <= 4 and on['metaInHeader'], [on['h1'], on['meta']])
        check(tag + 'TV on: the four cells in one row', len(set(x['c']['t'] for x in on['cells'])) == 1, [x['c'] for x in on['cells']])
        # "spread these right a bit more": first cell on the title's left edge, the last ending about 40px short of the TV, text left-aligned in each
        cs = on['cells']
        gaps = [cs[i + 1]['c']['l'] - cs[i]['c']['r'] for i in range(len(cs) - 1)]
        want = min(72, round(0.046 * W))
        check(tag + 'TV on: from the title, about 72px between the cells, ending well short of the TV ("compact this a little more")',
              tv and abs(cs[0]['c']['l'] - on['h1']['l']) <= 3 and all(abs(g - want) <= 2 for g in gaps) and tv['l'] - cs[-1]['c']['r'] >= 60,
              {'gaps': gaps, 'want': want, 'to_tv': tv and tv['l'] - cs[-1]['c']['r'], 'first': cs[0]['c'], 'h1': on['h1']})
        check(tag + 'TV on: text left-aligned in each cell', all(abs(x['v']['l'] - x['c']['l']) <= 2 and abs(x['lab']['l'] - x['c']['l']) <= 2 for x in cs), [[x['c']['l'], x['v']['l'], x['lab']['l']] for x in cs])
        check(tag + 'TV off: no TV, header without tv-on', off['tv'] is None and not off['tvOn'], [off['tv'], off['tvOn']])
        check(tag + 'TV off: the info beside the title', off['meta']['l'] > off['h1']['r'], [off['h1'], off['meta']])
        ws = [x['c']['w'] for x in off['cells']]
        check(tag + 'TV off: four equal cells', len(ws) == 4 and max(ws) - min(ws) <= 2, ws)
        cen = [abs((x['v']['l'] + x['v']['r']) / 2 - (x['c']['l'] + x['c']['r']) / 2) for x in off['cells']] + [abs((x['lab']['l'] + x['lab']['r']) / 2 - (x['c']['l'] + x['c']['r']) / 2) for x in off['cells']]
        check(tag + 'TV off: each cell centred', max(cen) <= 3, cen)
        mid = abs((off['meta']['t'] + off['meta']['b']) / 2 - (off['h1']['t'] + off['h1']['b']) / 2)
        check(tag + 'TV off: the info centred on the title', mid <= 16, [off['meta'], off['h1']])
        check(tag + 'TV off: the cells end inside the page', off['meta']['r'] <= off['tabs']['r'] + 1, [off['meta'], off['tabs']])
        check(tag + 'TV off: the page below moves up by the header only', off['tabs']['t'] < on['tabs']['t'] and (on['news']['t'] - off['news']['t']) == (on['tabs']['t'] - off['tabs']['t']), [on['tabs'], off['tabs'], on['news'], off['news']])
        check(tag + 'TV on again: back in its slot', g['on2']['tv'] and g['on2']['tvOn'] and g['on2']['tabs']['t'] == on['tabs']['t'], [g['on2']['tv'], g['on2']['tabs']])
        if W == 1500:
            check('1500: Session News about 613px with the TV on', abs(on['news']['t'] - 613) <= 24, on['news'])
            check('1500: Session News about 479px with the TV off', abs(off['news']['t'] - 479) <= 24, off['news'])
    else:
        tv = on['tv']
        check(tag + 'TV docked under the header, above the tabs', tv and on['tvIn'].find('container') >= 0 and tv['t'] >= on['meta']['b'] and tv['b'] <= on['tabs']['t'], [on['tvIn'], tv, on['meta'], on['tabs']])
        check(tag + 'the info under the title in the header', on['metaInHeader'] and on['meta']['t'] >= on['h1']['b'], [on['h1'], on['meta']])
        check(tag + 'no tv-on layout at this width', not on['tvOn'], on['tvOn'])
    return g


def phone(W, H):
    def run(c):
        res = {'off': c.eval(GEO)}
        c.eval(OPEN_TV); time.sleep(3); res['on'] = c.eval(GEO); snap(c, 'ph%d_on' % W)
        res['btns'] = c.eval("(function(){var b=document.getElementById('bloomberg-floater-bigger');return !!(b&&b.offsetWidth>0);})()")
        return res
    new = session(W, H, True, 'app.html', run)
    old = session(W, H, True, '_top_old.html', run)
    keys = ('h1', 'tabs', 'meta')
    for st in ('off', 'on'):
        diff = {k: [old[st][k], new[st][k]] for k in keys if old[st][k] != new[st][k]}
        # Session News sits under the assistant's greeting, whose words change with the minute: a few px either way is the greeting, not the top
        if abs(old[st]['news']['t'] - new[st]['news']['t']) > 6: diff['news'] = [old[st]['news'], new[st]['news']]
        check('%d phone, TV %s: top exactly as before' % (W, st), not diff, diff)
    check('%d phone: the TV docked where it was' % W, old['on']['tv'] == new['on']['tv'] and new['on']['tv'] is not None, [old['on']['tv'], new['on']['tv']])
    check('%d phone: no size buttons on the full-width docked TV' % W, not new['btns'], new['btns'])


try:
    ONLY = os.environ.get('TOP_ONLY', '')   # 'desk' or 'phone' runs just that half
    if ONLY != 'phone':
        for W, H in ((1920, 1080), (1500, 940), (1280, 900), (1100, 860), (1024, 768)):
            desk(W, H)
    if ONLY != 'desk':
        for W in (375, 390):
            phone(W, 844)
finally:
    try: os.remove(OLD)
    except Exception: pass
bad = [o for o in out if not o[1]]
print('\n%d checks, %d failed' % (len(out), len(bad)))
sys.exit(1 if bad or not out else 0)
