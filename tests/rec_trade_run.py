# Recording Trade Replay (Nestor, 3 Nov 2026: "ok yes add it"): headless Edge on a 1920 x 1080 screen, this tab's capture accepted without its prompt, a made-up trade over the stand-in
# candles, the real Record button and the real Start click, then the saved MP4 read back: its size per format and its name. No camera or microphone asked for here (tests/rec_run.py covers those). Nothing live is touched.
#   python tests/rec_trade_run.py [out_dir]
import base64, functools, http.server, json, os, random, shutil, struct, sys, tempfile, threading, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import lowprio  # noqa: F401
import browser_test as bt
OUT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else tempfile.mkdtemp(prefix='st_rectr_')
os.makedirs(OUT, exist_ok=True)

def mp4_size(path):
    b = open(path, 'rb').read(); i = b.find(b'tkhd')
    if i < 0: return None
    v = b[i + 4]; off = i + 4 + (4 + 8 + 8 + 4 + 4 + 8 if v == 1 else 4 + 4 + 4 + 4 + 4 + 4) + 8 + 2 + 2 + 2 + 2 + 36
    w, h = struct.unpack('>II', b[off:off + 8]); return (w >> 16, h >> 16)

web_port = bt.free_port()
httpd = http.server.ThreadingHTTPServer(('127.0.0.1', web_port), functools.partial(bt.Quiet, directory=os.path.dirname(HERE)))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
edge = next((p for p in bt.EDGE_PATHS if os.path.exists(p)), None)
dbg = bt.free_port(); prof = tempfile.mkdtemp(prefix='edgeprof_rectr_'); dl = tempfile.mkdtemp(prefix='st_rectr_dl_')
import subprocess
proc = bt.edge_popen([edge, '--headless=new', '--remote-debugging-port=%d' % dbg, '--user-data-dir=' + prof, '--no-first-run', '--no-default-browser-check', '--window-size=1920,1080', '--screen-info={1920x1080}',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-popup-blocking', '--autoplay-policy=no-user-gesture-required', '--auto-accept-this-tab-capture', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
fails = 0
def chk(name, ok, got=None):
    global fails
    if not ok: fails += 1
    print('%s  %s%s' % ('PASS' if ok else 'FAIL', name, '' if ok else '   got: ' + json.dumps(got, ensure_ascii=False)[:400]), flush=True)
def ev(c, js):
    r = c.call('Runtime.evaluate', expression=js, awaitPromise=True, returnByValue=True)
    if 'exceptionDetails' in r:
        ex = r['exceptionDetails']; raise RuntimeError((ex.get('exception') or {}).get('description') or ex.get('text'))
    return r.get('result', {}).get('value')
def rclick(c, sel):
    p = ev(c, "(function(){var e=document.querySelector(%s); if(!e) return null; var b=e.getBoundingClientRect(); if(!b.width) return null; return [b.left+b.width/2,b.top+b.height/2];})()" % json.dumps(sel))
    if not p: return False
    c.call('Input.dispatchMouseEvent', type='mouseMoved', x=p[0], y=p[1]); c.call('Input.dispatchMouseEvent', type='mousePressed', x=p[0], y=p[1], button='left', buttons=1, clickCount=1); c.call('Input.dispatchMouseEvent', type='mouseReleased', x=p[0], y=p[1], button='left', buttons=0, clickCount=1); time.sleep(0.2)
    return True
def wait(c, js, secs=25):
    for _ in range(int(secs / 0.25)):
        if ev(c, js): return True
        time.sleep(0.25)
    return False
try:
    pages = []
    for _ in range(80):
        try:
            pages = [t for t in json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dbg, timeout=2).read()) if t.get('type') == 'page']
            if pages: break
        except Exception: pass
        time.sleep(0.25)
    c = bt.CDP(pages[0]['webSocketDebuggerUrl']); c.call('Page.enable'); c.call('Runtime.enable')
    try: c.call('Page.bringToFront'); c.call('Emulation.setFocusEmulationEnabled', enabled=True)
    except Exception: pass
    try: c.call('Browser.setDownloadBehavior', behavior='allow', downloadPath=dl)
    except Exception: c.call('Page.setDownloadBehavior', behavior='allow', downloadPath=dl)
    c.call('Page.navigate', url='http://127.0.0.1:%d/app.html?e2e=%d' % (web_port, random.randint(1, 10 ** 9))); time.sleep(2)
    if not ev(c, bt.PRELUDE): raise RuntimeError('The app did not load')
    ev(c, """(async function(){ var W=function(ms){return new Promise(function(r){setTimeout(r,ms);});}; for(var i=0;i<200&&!(window.__stReplay&&window.__stRec&&window.__stPractice);i++) await W(100); await W(800);
      document.querySelectorAll('.stc-gate.open').forEach(function(e){e.classList.remove('open');}); document.querySelectorAll('.modal-bg.show').forEach(function(e){e.classList.remove('show');});
      var css=document.createElement('style'); css.textContent='.st-tour-ov, .st-welcome, .stc-gate, #lp-front, #st-demo-bar, #onboarding-modal-bg, [class^="st-tour"] { display: none !important; }'; document.head.appendChild(css);
      window.__stPlatOff=false; localStorage.removeItem('st_rec'); var C=window.__stRec._cfg(); C.cam=false; C.mic=false; C.fs=false;
      window.__stReplay.open({ mt5Ticket: 999999940, symbol: 'EURUSD', side: 'short', entryPrice: 1.13215, closePrice: 1.13105, openTime: '2026-10-01T09:00:00Z', closeTime: '2026-10-01T10:00:00Z', slPips: 10, pnl: 112.5 });
      for(var k=0;k<150&&!(window.__stReplay._s()&&window.__stReplay._s().chart&&window.__stReplay._s().bars&&window.__stReplay._s().bars.length);k++) await W(100); await W(1200); return true; })()""")
    chk('Trade Replay: the Record button, red dot, between news and the snapshot', ev(c, "(function(){var b=document.getElementById('strp-rec'),r=b&&b.getBoundingClientRect(),L=function(i){return document.getElementById(i).getBoundingClientRect().left;}; return !!b&&r.width===34&&!!b.querySelector('.rd')&&L('strp-newsbtn')<r.left&&r.left<L('strp-snapbtn')&&getComputedStyle(b.querySelector('.rd')).fill==='rgb(242, 54, 69)';})()"), ev(c, "document.getElementById('strp-rec')&&document.getElementById('strp-rec').outerHTML.slice(0,120)"))
    for fmt, fit, W, H in (('yt', None, 1920, 1080), ('reel', 'fill', 1080, 1920)):
        rclick(c, '#strp-rec')
        chk(fmt + ': the set-up opens, over Trade Replay', wait(c, "!!document.getElementById('st-rec-bg')", 6) and ev(c, "(function(){var g=document.querySelector('#st-rec-bg [data-r=\"go\"]'),b=g&&g.getBoundingClientRect(); return !!b&&g.contains(document.elementFromPoint(b.left+b.width/2,b.top+b.height/2));})()"))
        ev(c, "(function(){var C=window.__stRec._cfg(); C.fmt=%s; if(%s) C.fit=%s; C.cam=false; C.mic=false; C.fs=false; var q=document.querySelector('#st-rec-bg [data-rf=%s]'); if(q) q.click();})()" % (json.dumps(fmt), 'true' if fit else 'false', json.dumps(fit or ''), json.dumps(fmt)))
        time.sleep(0.3)
        rclick(c, '#st-rec-bg [data-r="go"]')
        chk(fmt + ': it records', wait(c, "window.__stRec.state().st==='rec'", 30), ev(c, "JSON.stringify(window.__stRec.state())"))
        info = json.loads(ev(c, """JSON.stringify((function(){ var r=window.__stRec._r(), card=document.querySelector('#strp-modal-bg .strp-card'), cb=card.getBoundingClientRect(), hp=document.querySelector('#strp-hp .pl-mny'), lv=document.querySelector('#strp-live .pl-mny');
          return { tr: window.__stRec._tr(), mode: r.mode, tgt: !!r.tgt&&r.tgt===card, sm: document.body.classList.contains('st-rec-sm'), w: Math.round(cb.width), h: Math.round(cb.height), hpBlur: hp?getComputedStyle(hp).filter:'', lvBlur: lv?getComputedStyle(lv).filter:'', recHid: getComputedStyle(document.getElementById('strp-rec')).display, sym: r.sym, over: Array.prototype.filter.call(document.querySelectorAll('#strp-tb > *'),function(e){var x=e.getBoundingClientRect();return x.width&&x.right>cb.right+1;}).length, ctl: !!document.getElementById('st-rec-ctl') }; })())"""))
        chk(fmt + ': on Trade Replay\'s window, Streamer mode on, its symbol, the control there', info['tr'] and info['sm'] and info['sym'] == 'EURUSD' and info['ctl'] and info['recHid'] == 'none', info)
        chk(fmt + ': captured by the element or cropped to it', info['mode'] in ('el', 'crop', 'canvas'), info)
        chk(fmt + ': money blurred', 'blur' in (info['lvBlur'] or info['hpBlur']), info)
        if fmt == 'reel': chk('reel: the window takes the format\'s shape, nothing past its top bar', abs(info['w'] / max(1, info['h']) - 1080 / 1920) < 0.03 and info['over'] == 0, info)
        try: open(os.path.join(OUT, 'during_%s.png' % fmt), 'wb').write(base64.b64decode(c.call('Page.captureScreenshot', format='png')['data']))
        except Exception as e: print('no picture', e)
        time.sleep(3)
        rclick(c, '#st-rec-ctl [data-rc="stop"]')
        wait(c, "!window.__stRec._r()", 15)
        f = None
        for _ in range(60):
            nf = [x for x in os.listdir(dl) if not x.endswith('.crdownload') and not x.endswith('.tmp')]
            if nf: f = nf[0]; break
            time.sleep(0.25)
        chk(fmt + ': the file saved, named for the symbol', bool(f) and 'EURUSD' in f, f)
        if f:
            sz = mp4_size(os.path.join(dl, f)) if f.endswith('.mp4') else None
            chk(fmt + ': its picture %d x %d' % (W, H), f.endswith('.webm') or sz == (W, H), [f, sz])
            shutil.move(os.path.join(dl, f), os.path.join(OUT, fmt + '_' + f))
        chk(fmt + ': Trade Replay back as it was', ev(c, "(function(){var m=document.getElementById('strp-modal-bg'); return m.classList.contains('show')&&!document.body.classList.contains('st-rec-on')&&!document.body.classList.contains('st-rec-tall');})()"))
        chk(fmt + ': the preview shows it', ev(c, "!!document.getElementById('st-rec-pv')"))
        ev(c, "document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))")
        wait(c, "!document.getElementById('st-rec-pv')", 4)
        time.sleep(0.5)
    # Trade Replay closed while it records: the video ends there
    rclick(c, '#strp-rec'); wait(c, "!!document.getElementById('st-rec-bg')", 6); rclick(c, '#st-rec-bg [data-r="go"]'); wait(c, "window.__stRec.state().st==='rec'", 30)
    ev(c, "document.getElementById('strp-close').click()")
    chk('Trade Replay closed mid-recording: the video ends, nothing left over', wait(c, "!window.__stRec._r()", 12), ev(c, "JSON.stringify(window.__stRec.state())"))
    print('%d failed; files in %s' % (fails, OUT))
finally:
    try: proc.kill()
    except Exception: pass
    httpd.shutdown()
sys.exit(1 if fails else 0)
