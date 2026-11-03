# Runs symsfail_e2e.js (3 Nov 2026): a stand-in EA, the candles from tests/fixtures, the app in headless Edge. Nothing live is touched.
#   python tests/symsfail_run.py
import calendar, os, socket, subprocess, sys, tempfile, time
import lowprio  # noqa: F401  (below normal priority: Nestor trades on this PC)
HERE = os.path.dirname(os.path.abspath(__file__))
T0 = calendar.timegm((2026, 10, 14, 8, 30, 0))
PID = os.getpid()
TOK = 'st-test-symsfail-e2e-%d' % PID
def relay_up(port, secs=8):
    t = time.time() + secs
    while time.time() < t:
        try:
            socket.create_connection(('127.0.0.1', port), 0.5).close(); return True
        except OSError:
            time.sleep(0.15)
    return False
s = socket.socket(); s.bind(('127.0.0.1', 0)); RPORT = s.getsockname()[1]; s.close()
relay = subprocess.Popen([sys.executable, os.path.join(HERE, '..', 'relay', 'server.py')], env=dict(os.environ, PORT=str(RPORT)), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
relay_up(RPORT)
A = '127.0.0.1:%d' % RPORT
o1, o2 = (os.path.join(tempfile.gettempdir(), 'st_fake_ea_symsfail_%s_%d.json' % (x, PID)) for x in 'ab')
ea1 = subprocess.Popen([sys.executable, os.path.join(HERE, 'fake_ea_livecharts.py'), TOK, '200', o1, 'EURUSD', str(T0), '1.1640', '5', '90001234'], env=dict(os.environ, ST_RELAY=A, ST_FAKE_V='9.03'))
ea2 = subprocess.Popen([sys.executable, os.path.join(HERE, 'fake_ea_livecharts.py'), TOK, '200', o2, 'EURUSD', str(T0), '1.1690', '5', '90007777'], env=dict(os.environ, ST_RELAY=A, ST_FAKE_V='9.03'))
time.sleep(2)
tjs = os.path.join(tempfile.gettempdir(), 'st_symsfail_e2e_run_%d.js' % PID)
open(tjs, 'w', encoding='utf-8').write(open(os.path.join(HERE, 'symsfail_e2e.js'), encoding='utf-8').read()
    .replace('__RELAY__', 'ws://127.0.0.1:%d/realtime/v1/websocket?vsn=1.0.0' % RPORT).replace("'st-test-symsfail-e2e'", repr(TOK)).replace('__KEEP__', '1' if os.environ.get('ST_SYMSFAIL_SHOT') else ''))
rc = subprocess.call([sys.executable, os.path.join(HERE, 'browser_test.py'), tjs], env=dict(os.environ, PYTHONIOENCODING='utf-8', **({'E2E_SHOT': os.environ['ST_SYMSFAIL_SHOT']} if os.environ.get('ST_SYMSFAIL_SHOT') else {})))
relay.terminate()
for e in (ea1, ea2):
    e.terminate()
    try: e.wait(5)
    except Exception: pass
sys.exit(rc)
