# Runs the Charts platform test (platform_e2e.js, 24 Oct 2026): a stand-in EA 9.03 (fake_ea_livecharts.py) on a throwaway channel through
# Session Terminal's relay on this machine, its clock on a weekday morning with stored candles, then the app in headless Edge on a computer
# screen; then the same app on a phone's screen, where the platform stays off. Nothing live is touched.
#   python tests/platform_run.py
import calendar, json, os, socket, subprocess, sys, tempfile, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
T0 = calendar.timegm((2026, 10, 14, 8, 30, 0))
TOK = 'st-test-platform-e2e-%d' % os.getpid()   # this run's own channel: another session's run beside it never meets it


def stored_close(sym, dflt):
    try:
        req = urllib.request.Request('https://figozyxoyobixadhqewr.supabase.co/rest/v1/rpc/st_candles', method='POST',
            data=json.dumps({'p_symbol': sym, 'p_tf': 1, 'p_from': T0 - 3600, 'p_to': T0}).encode(),
            headers={'apikey': 'sb_publishable_h-TrkkVzrGOkwX6LxMDsaQ_hE8540Nv', 'Content-Type': 'application/json'})
        rows = json.loads(urllib.request.urlopen(req, timeout=15).read())
        if rows: return float(rows[-1]['c'])
    except Exception as e:
        print('stored close of', sym, 'not read, using', dflt, e)
    return dflt


def relay_up(port, secs=8):
    t = time.time() + secs
    while time.time() < t:
        try:
            socket.create_connection(('127.0.0.1', port), 0.5).close(); return True
        except OSError:
            time.sleep(0.15)
    return False


p0 = stored_close('EURUSD', 1.1640)
s = socket.socket(); s.bind(('127.0.0.1', 0)); RPORT = s.getsockname()[1]; s.close()
relay = subprocess.Popen([sys.executable, os.path.join(HERE, '..', 'relay', 'server.py')], env=dict(os.environ, PORT=str(RPORT)), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
relay_up(RPORT)
out = os.path.join(tempfile.gettempdir(), 'st_fake_ea_platform_%d.json' % os.getpid())
ea = subprocess.Popen([sys.executable, os.path.join(HERE, 'fake_ea_livecharts.py'), TOK, '400', out, 'EURUSD', str(T0), str(p0), '5', '90001234'],
                      env=dict(os.environ, ST_RELAY='127.0.0.1:%d' % RPORT, ST_FAKE_V='9.03'))
time.sleep(2)
env = dict(os.environ, PYTHONIOENCODING='utf-8')
src = open(os.path.join(HERE, 'platform_e2e.js'), encoding='utf-8').read().replace('__RELAY__', 'ws://127.0.0.1:%d/realtime/v1/websocket?vsn=1.0.0' % RPORT).replace('__TOK__', TOK)
tjs = os.path.join(tempfile.gettempdir(), 'st_platform_e2e_run_%d.js' % os.getpid()); open(tjs, 'w', encoding='utf-8').write(src)
rc = subprocess.call([sys.executable, os.path.join(HERE, 'browser_test.py'), tjs], env=env)
print('\n-- on a phone --')
rc2 = subprocess.call([sys.executable, os.path.join(HERE, 'browser_test.py'), tjs], env=dict(env, E2E_MOBILE='390x844'))
relay.terminate(); ea.terminate()
try:
    log = json.load(open(out))
    print('stand-in EA:', json.dumps({k: log.get(k) for k in ('joined', 'who', 'opens', 'errors')})[:600])
except Exception as e:
    print('stand-in EA log not written:', e)
sys.exit(rc or rc2)
