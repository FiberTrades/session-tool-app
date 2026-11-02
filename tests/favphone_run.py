# Runs favphone_e2e.js (2 Nov 2026): the favourite tools on a phone, at 375 and 390 wide, upright and on their side, with a screenshot of each.
# A stand-in EA through Session Terminal's relay on this machine. Nothing live is touched.
#   python tests/favphone_run.py [screenshot folder]
import calendar, os, socket, subprocess, sys, tempfile, time
import lowprio  # noqa: F401  (below normal priority: Nestor trades on this PC)
HERE = os.path.dirname(os.path.abspath(__file__))
T0 = calendar.timegm((2026, 10, 14, 8, 30, 0))
TOK = 'st-test-favphone-%d' % os.getpid()
SHOTS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(tempfile.gettempdir(), 'st_favphone')
os.makedirs(SHOTS, exist_ok=True)
s = socket.socket(); s.bind(('127.0.0.1', 0)); RPORT = s.getsockname()[1]; s.close()
relay = subprocess.Popen([sys.executable, os.path.join(HERE, '..', 'relay', 'server.py')], env=dict(os.environ, PORT=str(RPORT)), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
out = os.path.join(tempfile.gettempdir(), 'st_fake_ea_favphone_%d.json' % os.getpid())
ea = subprocess.Popen([sys.executable, os.path.join(HERE, 'fake_ea_livecharts.py'), TOK, '400', out, 'EURUSD', str(T0), '1.1640', '5', '90001234'],
                      env=dict(os.environ, ST_RELAY='127.0.0.1:%d' % RPORT, ST_FAKE_V='9.03'))
time.sleep(2)
src = open(os.path.join(HERE, 'favphone_e2e.js'), encoding='utf-8').read().replace('__RELAY__', 'ws://127.0.0.1:%d/realtime/v1/websocket?vsn=1.0.0' % RPORT).replace('__TOK__', TOK)
tjs = os.path.join(tempfile.gettempdir(), 'st_favphone_e2e_run_%d.js' % os.getpid()); open(tjs, 'w', encoding='utf-8').write(src)
rc = 0
for wh in ('375x812', '390x844', '812x375', '844x390'):
    print('--', wh)
    env = dict(os.environ, PYTHONIOENCODING='utf-8', E2E_MOBILE=wh, E2E_SHOT=os.path.join(SHOTS, 'fav_%s.png' % wh))
    rc = subprocess.call([sys.executable, os.path.join(HERE, 'browser_test.py'), tjs], env=env) or rc
relay.terminate(); ea.terminate()
sys.exit(rc)
