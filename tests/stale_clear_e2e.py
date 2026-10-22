# -*- coding: utf-8 -*-
"""A device closed for days must not put its old journal back over the cloud (Troy, 22 Oct 2026).

    python tests/stale_clear_e2e.py          (STALE_APP=<file> runs the same checks against another copy)

What happened: Troy's iPhone was last used on 19 Oct and its sign-in had run out. Opened on 22 Oct it showed the morning
"clear the bias and review from Monday?" on top of the sign-in screen, worked out from that 19-Oct copy (the question had
been raised above everything that morning, the sign-in screen included). He tapped Clear and signed in three seconds later,
and the sync's "the newest clear wins" uploaded the 19-Oct copy: three days of bias history ("showed up 1/4, should be 4"),
nudges, MT5 answers and settings gone from the cloud.

Fake cloud and a stand-in account (sync_e2e.py's), nothing live. Two "phones", each its own origin and storage, one after
the other:
- phone 1, the morning as it happened, the reload an expired sign-in makes included: no question while signed out or
  before the journal is in, none after it (the cloud has already cleared today), and the cloud keeps everything;
- phone 2, the question answered on the old copy anyway (as on a slow network) with no record of where that copy came
  from: the second clear of the day takes the cloud's copy instead of putting its own back;
- phone 3, an ordinary morning (signed in, the cloud last used yesterday): the question still comes, once the journal is
  in, and its Clear reaches the cloud with yesterday's history kept.
"""
import datetime
import functools
import http.server
import json
import os
import random
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import browser_test as bt   # noqa: E402
import sync_e2e as se       # noqa: E402  (the fake cloud, its client and the stand-in journal)

# Signed out until __e2eSignIn(): ?e2eout=1 starts the tab signed out (kept across its reloads), ?e2eso=1 adds the
# SIGNED_OUT a run-out sign-in sends once the page is up, which makes the app reload itself.
_AUTH_OLD = "try { localStorage.setItem('sb-figozyxoyobixadhqewr-auth-token', JSON.stringify(SESSION)); } catch (e) {}"
_AUTH_NEW = r"""var OUT = false, AUTHCB = [];
  try { var _o = sessionStorage.getItem('__e2eOut'); if (_o === null && /[?&]e2eout=1/.test(location.search)) { _o = '1'; sessionStorage.setItem('__e2eOut', '1'); } OUT = _o === '1'; } catch (e) {}
  try { if (OUT) localStorage.removeItem('sb-figozyxoyobixadhqewr-auth-token'); else localStorage.setItem('sb-figozyxoyobixadhqewr-auth-token', JSON.stringify(SESSION)); } catch (e) {}
  window.__e2eSignIn = function () { OUT = false; try { sessionStorage.setItem('__e2eOut', '0'); localStorage.setItem('sb-figozyxoyobixadhqewr-auth-token', JSON.stringify(SESSION)); } catch (e) {} AUTHCB.forEach(function (f) { try { f('SIGNED_IN', SESSION); } catch (e) {} }); return AUTHCB.length; };"""
_GS_OLD = "getSession: function () { return Promise.resolve({ data: { session: SESSION }, error: null }); },"
_GS_NEW = "getSession: function () { return Promise.resolve({ data: { session: OUT ? null : SESSION }, error: null }); },"
_CB_OLD = "onAuthStateChange: function (cb) { setTimeout(function () { try { cb('INITIAL_SESSION', SESSION); } catch (e) {} }, 30);"
_CB_NEW = r"""onAuthStateChange: function (cb) { AUTHCB.push(cb); setTimeout(function () { try { cb('INITIAL_SESSION', OUT ? null : SESSION); } catch (e) {} }, 30);
    try { if (OUT && /[?&]e2eso=1/.test(location.search) && !sessionStorage.getItem('__e2eSo')) { sessionStorage.setItem('__e2eSo', '1'); setTimeout(function () { try { cb('SIGNED_OUT', null); } catch (e) {} }, 2500); } } catch (e) {}"""
for _a, _b in ((_AUTH_OLD, _AUTH_NEW), (_GS_OLD, _GS_NEW), (_CB_OLD, _CB_NEW)):
    assert se.FAKE_JS.count(_a) == 1, _a[:60]
FAKE_JS = se.FAKE_JS.replace(_AUTH_OLD, _AUTH_NEW).replace(_GS_OLD, _GS_NEW).replace(_CB_OLD, _CB_NEW)
# ?e2eday=-3 runs the page three days ago (its clock moved back), so "last used on Monday" really happened on Monday.
SHIFT_JS = r"""(function () { var m = /[?&]e2eday=(-?\d+)/.exec(location.search); if (!m) return; var off = (+m[1]) * 86400000, D = Date;
  function SD() { if (!(this instanceof SD)) return new D(D.now() + off).toString(); var a = Array.prototype.slice.call(arguments);
    return a.length ? new (Function.prototype.bind.apply(D, [null].concat(a)))() : new D(D.now() + off); }
  SD.prototype = D.prototype; SD.now = function () { return D.now() + off; }; SD.parse = D.parse; SD.UTC = D.UTC; window.Date = SD; })();"""
FAKE_JS = SHIFT_JS + FAKE_JS
# Who moved the journal's day on (lastSessionDate), with the call that saved it - printed when a check fails.
TRACE_JS = r"""(function () { window.__e2eLsd = []; var set0 = Storage.prototype.setItem, last = null;
  Storage.prototype.setItem = function (k, v) { try { if (k === 'fiberTradesData_v3') { var d = JSON.parse(v); if (d && d.lastSessionDate !== last) { last = d.lastSessionDate;
    window.__e2eLsd.push(new Date().toISOString().slice(11, 23) + ' ' + last + ' pending=' + !!(window.__stNewDayPending && window.__stNewDayPending()) + ' pulled=' + !!window.__stJournalPulled + ' ' + String(new Error().stack).split(String.fromCharCode(10)).slice(2, 8).map(function (x) { return x.trim().replace(/^at /, '').replace(/ \(http[^)]*:(\d+):\d+\)/, ':$1'); }).join(' < ')); } } } catch (e) {}
    return set0.apply(this, arguments); }; })();"""
FAKE_JS = TRACE_JS + FAKE_JS
# Every uncaught error on the page, for the report when something fails.
FAKE_JS = "(function () { window.__e2eErrs = []; window.addEventListener('error', function (e) { try { window.__e2eErrs.push(String(e.message) + ' @' + e.lineno + ':' + e.colno + ' ' + String(e.error && e.error.stack || '').split(String.fromCharCode(10)).slice(1, 7).join(' | ')); } catch (_) {} }); })();" + FAKE_JS


def jday(d):
    return d.strftime('%a %b %d %Y')   # JavaScript's toDateString(), local time like the page


def iso(d):
    return d.astimezone(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')


def entry(d):
    return {'date': iso(d), 'dateKey': d.strftime('%Y-%m-%d'), 'symbol': 'EUR/USD', 'sessionName': 'London', 'mode': 'Trend',
            'structure': 'Bullish', 'direction': 'Long', 'copiedAt': iso(d), 'notes': '', 'tvLinks': []}


def slot(d, mode):
    return {'symbol': 'EUR/USD', 'sessionName': 'London', 'mode': mode, 'structure': 'Bullish', 'direction': 'Long', 'notes': '',
            'tvLinks': [], 'date': iso(d), 'copiedAt': iso(d), 'sessionDate': d.strftime('%Y-%m-%d')}


NOW = datetime.datetime.now().astimezone()
TODAY7 = NOW.replace(hour=7, minute=0, second=0, microsecond=0) if NOW.hour >= 8 else NOW - datetime.timedelta(minutes=50)
DAY = lambda n: (NOW - datetime.timedelta(days=n)).replace(hour=7, minute=0, second=0, microsecond=0)


def old_row():
    """What the phone last saw: Monday (3 days ago), its bias still in the slot, the day not cleared since."""
    d = json.loads(json.dumps(se.SEED))
    d.update({'biasHistory': [entry(DAY(7)), entry(DAY(6)), entry(DAY(3))], 'biasSlots': [slot(DAY(3), 'Range')], 'activeBiasSlot': 0,
              'lastSessionDate': jday(DAY(3)), '_newDayCleared': {'day': jday(DAY(3)), 'at': int(DAY(3).timestamp() * 1000)},
              'settings': {'e2eSeen': 'old'}})
    d['bias'] = d['biasSlots'][0]
    return d


def new_row():
    """The cloud since, from the PC: two more days and today's bias, today cleared at 7 am, a setting and a nudge."""
    d = old_row()
    d['biasHistory'] += [entry(DAY(2)), entry(DAY(1)), entry(TODAY7)]
    d['biasSlots'] = [slot(TODAY7, 'Trend')]
    d['bias'] = d['biasSlots'][0]
    d['lastSessionDate'] = jday(NOW)
    d['_newDayCleared'] = {'day': jday(NOW), 'at': int(TODAY7.timestamp() * 1000)}
    d['settings'] = {'e2eSeen': 'old', 'e2eFromPC': 'pc'}
    d['nudgeLog'] = {NOW.strftime('%Y-%m-%d'): {'clock': {'at': '07:52', 'rule': 'clock', 'text': 'e2e'}}}
    return d


def yesterday_row():
    """The cloud last used yesterday on the PC: two more days, yesterday's bias still in the slot, today not cleared."""
    d = old_row()
    d['biasHistory'] += [entry(DAY(2)), entry(DAY(1))]
    d['biasSlots'] = [slot(DAY(1), 'Trend')]
    d['bias'] = d['biasSlots'][0]
    d['lastSessionDate'] = jday(DAY(1))
    d['_newDayCleared'] = {'day': jday(DAY(1)), 'at': int(DAY(1).timestamp() * 1000)}
    d['settings'] = {'e2eSeen': 'old', 'e2eFromPC': 'pc'}
    return d


def cloud_peek():
    with se.LOCK:
        d = json.loads(json.dumps(se.STATE['row']['data']))
    s = (d.get('biasSlots') or [{}])[0]
    return {'history': len(d.get('biasHistory') or []), 'fromPC': (d.get('settings') or {}).get('e2eFromPC'),
            'nudges': bool(d.get('nudgeLog')), 'todayBias': s.get('mode'), 'day': d.get('lastSessionDate')}


def kept(p):
    return p['history'] == 6 and p['fromPC'] == 'pc' and p['nudges'] and p['todayBias'] == 'Trend'


PAGE_PEEK = r"""(() => { try { const s = (data.biasSlots || [{}])[0] || {}; return JSON.stringify({ history: (data.biasHistory || []).length,
  fromPC: (data.settings || {}).e2eFromPC, nudges: !!data.nudgeLog && Object.keys(data.nudgeLog).length > 0, todayBias: s.mode || null, day: data.lastSessionDate }); }
  catch (e) { return JSON.stringify({ err: String(e) }); } })()"""
# The question is on screen and on top (what a tap in the middle of the screen would reach).
ASKED = r"""(() => { const m = document.getElementById('new-session-modal-bg'); if (!m || !m.classList.contains('show') || getComputedStyle(m).display === 'none') return false;
  const b = document.getElementById('new-session-confirm'); if (!b) return false; const r = b.getBoundingClientRect();
  const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!(at && at.closest && at.closest('#new-session-modal-bg')); })()"""
GATE = "(() => { const g = document.querySelector('.stc-gate'); return !!(g && g.classList.contains('open')); })()"
LOADED = "document.readyState === 'complete' && !!(window.STCloud && typeof STCloud.cloudBase === 'function')"   # every script of the page has run


def main():
    edge = next((p for p in bt.EDGE_PATHS if os.path.exists(p)), None)
    if not edge:
        print('Microsoft Edge not found')
        return 2
    servers, ports = [], []
    for _ in range(3):
        port = bt.free_port()
        httpd = http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(se.Fake, directory=bt.ROOT))
        threading.Thread(target=httpd.serve_forever, daemon=True).start()
        servers.append(httpd)
        ports.append(port)
    dbg = bt.free_port()
    prof = tempfile.mkdtemp(prefix='edgeprof_stale_')
    proc = subprocess.Popen([edge, '--headless=new', '--remote-debugging-port=%d' % dbg, '--user-data-dir=' + prof,
                             '--no-first-run', '--no-default-browser-check', '--window-size=1280,1000',
                             '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank'],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    results, pages = [], []

    def check(name, ok, got=None):
        results.append({'name': name, 'ok': bool(ok), 'got': got})

    try:
        first = None
        for _ in range(80):
            try:
                tabs = json.loads(urllib.request.urlopen('http://127.0.0.1:%d/json/list' % dbg, timeout=2).read())
                ps = [t for t in tabs if t.get('type') == 'page']
                if ps:
                    first = ps[0]
                    break
            except Exception:
                pass
            time.sleep(0.25)
        if not first:
            print('Edge did not start')
            return 2

        def new_target():
            req = urllib.request.Request('http://127.0.0.1:%d/json/new?about:blank' % dbg, method='PUT')
            return json.loads(urllib.request.urlopen(req, timeout=5).read())

        def open_page(target):
            c = bt.CDP(target['webSocketDebuggerUrl'])
            c.call('Page.enable')
            c.call('Runtime.enable')
            c.call('Network.enable')
            c.call('Network.setBlockedURLs', urls=['*supabase.co*', '*/sw.js*'])
            c.call('Page.addScriptToEvaluateOnNewDocument', source=FAKE_JS)
            pages.append(c)
            return c

        def ev(c, js, tries=40):
            last = None
            for _ in range(tries):
                try:
                    return c.eval(js)
                except Exception as e:   # the page may be reloading
                    last = e
                    time.sleep(0.25)
            raise last

        def wait(c, js, secs=20):
            end = time.time() + secs
            while time.time() < end:
                try:
                    if c.eval(js):
                        return True
                except Exception:
                    pass
                time.sleep(0.25)
            return False

        def go(c, url):
            c.call('Page.navigate', url=url)
            time.sleep(1)

        app = os.environ.get('STALE_APP', 'app.html')
        ready = se.READY_JS

        def wait_cloud(pred, secs=15):
            end = time.time() + secs
            while time.time() < end:
                q = cloud_peek()
                if pred(q):
                    return q
                time.sleep(0.25)
            return cloud_peek()

        def phone_last_used(c, base, since=new_row):
            """The phone signed in on Monday's journal and saved once; then it was closed."""
            se.set_row(old_row())
            go(c, '%s/%s?e2eday=-3&st=%d' % (base, app, random.randint(1, 10 ** 9)))
            ok = wait(c, ready, 40)
            ev(c, "(() => { data.settings.e2ePhone = 1; STCloud.save(); return true; })()")
            ok = ok and wait(c, "!!localStorage.getItem('st_cloud_base_tag')", 15)
            go(c, 'about:blank')
            se.set_row(since())   # meanwhile the PC (new_row: two more days, today's bias, today cleared)
            return ok

        # ---- phone 1: Troy's morning ----
        P1 = open_page(first)
        b1 = 'http://127.0.0.1:%d' % ports[0]
        check('setup: phone 1 last used on Monday, then the PC moved on', phone_last_used(P1, b1))
        go(P1, '%s/%s?e2eout=1&e2eso=1&st=%d' % (b1, app, random.randint(1, 10 ** 9)))
        # the run-out sign-in reloads the page once (2.5 s in); after that it sits on the sign-in screen
        time.sleep(5)
        wait(P1, GATE + ' && ' + LOADED, 20)
        time.sleep(1.5)
        asked = ev(P1, ASKED)
        check('phone 1 signed out: the morning question is not asked over the sign-in screen', ev(P1, GATE) and not asked, {'gate': ev(P1, GATE), 'asked': asked})
        check('phone 1 signed out, after its reload: the journal still knows the cloud version it came from', ev(P1, "!!window.__stStoredBase"),
              ev(P1, "JSON.stringify({ tag: localStorage.getItem('st_cloud_base_tag'), writer: localStorage.getItem('st_last_write_tab'), base: !!localStorage.getItem('st_cloud_base') })"))
        if asked:
            ev(P1, "document.getElementById('new-session-confirm').click(), true")   # what Troy did
            time.sleep(0.5)
        si = ev(P1, 'window.__e2eSignIn()')
        ok = wait(P1, ready, 30)
        if os.environ.get('SYNC_DEBUG') or not ok:
            print('phone 1 sign-in: %s %s' % (si, ev(P1, "JSON.stringify({ user: !!window.currentUser, gate: " + GATE + ", pulled: !!window.__stJournalPulled, owner: localStorage.getItem('st_journal_owner'), seen: STCloud.lastSeenUat && STCloud.lastSeenUat(), acc10: (data.accounts || []).some(a => a.id === 'acc10') })")))
        time.sleep(4)   # its saves go up
        p = cloud_peek()
        check('phone 1 signs in: the cloud keeps the PC\'s days, today\'s bias, its setting and nudges', ok and kept(p), p)
        pp = json.loads(ev(P1, PAGE_PEEK))
        check('...and the phone now holds them too', kept(pp), pp)
        time.sleep(1)
        check('...and asks no question: today was already cleared on the PC', not ev(P1, ASKED) and not ev(P1, '!!(window.__stNewDayPending && window.__stNewDayPending())'),
              {'asked': ev(P1, ASKED), 'pending': ev(P1, '!!(window.__stNewDayPending && window.__stNewDayPending())')})

        # ---- phone 2: answered on the old copy anyway, no record of its version ----
        P2 = open_page(new_target())
        b2 = 'http://localhost:%d' % ports[1]
        check('setup: phone 2 last used on Monday, then the PC moved on', phone_last_used(P2, b2))
        # no record of the version this copy came from (an older copy of the app wrote it, say), so no merge: taken off from
        # a plain file of the same site, where no app is running to write it back
        go(P2, b2 + '/tests/browser_test.py')
        ev(P2, "(() => { localStorage.removeItem('st_cloud_base'); localStorage.removeItem('st_cloud_base_tag'); return true; })()")
        go(P2, '%s/%s?e2eout=1&st=%d' % (b2, app, random.randint(1, 10 ** 9)))
        wait(P2, LOADED, 20)
        time.sleep(1)
        check('phone 2: no record of its version', not ev(P2, '!!window.__stStoredBase'))
        ev(P2, "(() => { startNewSession(); return true; })()")   # cleared on Monday's copy, before any sync
        check('phone 2: cleared on its old copy while signed out', ev(P2, "data.lastSessionDate === new Date().toDateString() && !!data._newDayCleared"))
        ev(P2, 'window.__e2eSignIn()')
        ok = wait(P2, ready, 30)
        time.sleep(4)
        p = cloud_peek()
        check('phone 2 signs in: the cloud keeps the PC\'s days, today\'s bias, its setting and nudges', ok and kept(p), p)
        ok = wait(P2, ready + " && (data.biasHistory || []).length === 6", 15)
        pp = json.loads(ev(P2, PAGE_PEEK))
        check('...and the phone takes the cloud\'s copy', ok and kept(pp), pp)

        # ---- phone 3: an ordinary morning, signed in ----
        P3 = open_page(new_target())
        b3 = 'http://127.0.0.1:%d' % ports[2]
        check('setup: phone 3 last used on Monday, the PC last used yesterday', phone_last_used(P3, b3, yesterday_row))
        go(P3, '%s/%s?st=%d' % (b3, app, random.randint(1, 10 ** 9)))
        ok = wait(P3, ready + " && (data.biasHistory || []).length === 5", 30)
        asked = ok and wait(P3, ASKED, 10)
        check('phone 3 signed in: once its journal is in, the morning question is asked', ok and asked, {'ready': ok, 'asked': ev(P3, ASKED), 'page': json.loads(ev(P3, PAGE_PEEK))})
        if asked:
            ev(P3, "document.getElementById('new-session-confirm').click(), true")
        p = wait_cloud(lambda q: q['day'] == jday(NOW) and not q['todayBias'])
        check('...Clear: the cloud is cleared for today, yesterday\'s history and the PC\'s setting kept', p['day'] == jday(NOW) and not p['todayBias'] and p['history'] == 5 and p['fromPC'] == 'pc', p)
    except SystemExit:
        pass
    finally:
        if os.environ.get('SYNC_DEBUG') or any(not r['ok'] for r in results):
            for i, c in enumerate(pages):
                try:
                    print('--- sync log, phone %d:' % (i + 1))
                    for line in json.loads(c.eval('JSON.stringify(window.__stSyncLog || [])'))[-25:]:
                        print('   ' + line)
                    print('   errors: %s' % c.eval('JSON.stringify(window.__e2eErrs || [])'))
                    for line in json.loads(c.eval('JSON.stringify(window.__e2eLsd || [])')):
                        print('   day: ' + line)
                except Exception as e:
                    print('   (no log: %s)' % e)
        try:
            subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            proc.kill()
        for s in servers:
            s.shutdown()
        time.sleep(0.5)
        shutil.rmtree(prof, ignore_errors=True)

    width = max([len(r['name']) for r in results] + [10])
    for r in results:
        got = '' if r['ok'] else '   got: ' + json.dumps(r.get('got'), ensure_ascii=False)[:500]
        print('%s  %s%s' % ('PASS' if r['ok'] else 'FAIL', r['name'].ljust(width), got))
    bad = [r for r in results if not r['ok']]
    print('\n%d checks, %d failed' % (len(results), len(bad)))
    return 1 if (bad or not results) else 0


if __name__ == '__main__':
    sys.exit(main())
