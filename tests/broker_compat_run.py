# Runs the cross-broker test (broker_compat_e2e.js, 25 Oct 2026): Session Terminal's relay on this machine and a stand-in EA 9.15 that
# plays a broker other than FTMO - its symbols EURUSD.r, GBPUSD.r, USDJPY.r (3 digits), GOLD (2), NAS100 (1), BTCUSD, a USD account -
# its clock on a weekday morning; then the app in headless Edge on a computer screen. Nothing live is touched.
#   python tests/broker_compat_run.py
import calendar, json, os, socket, subprocess, sys, tempfile, time
HERE = os.path.dirname(os.path.abspath(__file__))
T0 = calendar.timegm((2026, 10, 14, 8, 30, 0))
TOK = 'st-test-broker-e2e'
UNI = {'EURUSD.r': [1.16420, 5], 'GBPUSD.r': [1.30112, 5], 'USDJPY.r': [151.204, 3], 'GOLD': [4100.00, 2], 'NAS100': [25140.6, 1], 'BTCUSD': [67250.00, 2]}
s = socket.socket(); s.bind(('127.0.0.1', 0)); RPORT = s.getsockname()[1]; s.close()
relay = subprocess.Popen([sys.executable, os.path.join(HERE, '..', 'relay', 'server.py')], env=dict(os.environ, PORT=str(RPORT)), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(150):   # the relay up before the EA dials it
    try: socket.create_connection(('127.0.0.1', RPORT), timeout=1).close(); break
    except OSError: time.sleep(0.1)
out = os.path.join(tempfile.gettempdir(), 'st_fake_ea_broker_%d.json' % os.getpid())
ea = subprocess.Popen([sys.executable, os.path.join(HERE, 'fake_ea_livecharts.py'), TOK, '400', out, 'EURUSD.r', str(T0), '1.16420', '5', '90001234'],
                      env=dict(os.environ, ST_RELAY='127.0.0.1:%d' % RPORT, ST_FAKE_V='9.15', ST_FAKE_UNI=json.dumps(UNI), ST_FAKE_CUR='USD', ST_FAKE_CHART_MS='800'))
time.sleep(2)
src = open(os.path.join(HERE, 'broker_compat_e2e.js'), encoding='utf-8').read().replace('__RELAY__', 'ws://127.0.0.1:%d/realtime/v1/websocket?vsn=1.0.0' % RPORT).replace('__TOK__', TOK)
tjs = os.path.join(tempfile.gettempdir(), 'st_broker_e2e_run_%d.js' % os.getpid()); open(tjs, 'w', encoding='utf-8').write(src)
try:
    rc = subprocess.call([sys.executable, os.path.join(HERE, 'browser_test.py'), tjs], env=dict(os.environ, PYTHONIOENCODING='utf-8'))
finally:
    relay.terminate(); ea.terminate()
    try: ea.wait(5)
    except Exception: pass
try:
    log = json.load(open(out))
    print('stand-in EA:', json.dumps({k: log.get(k) for k in ('joined', 'who', 'syms', 'hub_hs', 'errors')})[:700])
except Exception as e:
    print('stand-in EA log not written:', e)
sys.exit(rc)
