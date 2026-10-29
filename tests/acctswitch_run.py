# Runs the account-switch test (acctswitch_e2e.js): three stand-in EAs on EUR/USD through a local relay - 90001234, 90007777 (50 pips
# above) and 90003333 (another broker's EURUSD.x, 100 pips above) - on a throwaway channel, their clock on a weekday morning with
# stored candles (Wed 14 Oct 2026 08:30 UTC), then the app in headless Edge on the same channel. Nothing real is touched.
#   python tests/acctswitch_run.py              E2E_APP=<file>: another copy of the app; ACCSW_MEASURE=1: timings only;
#   ST_STUB_MS=400: the candle stand-in answers as slowly as the real store; ACCSW_GAP=46000: a pause before each switch
import calendar, json, os, socket, subprocess, sys, tempfile, time, urllib.request
import lowprio  # noqa: F401  (below normal priority: Nestor trades on this PC)
HERE = os.path.dirname(os.path.abspath(__file__))
T0 = calendar.timegm((2026, 10, 14, 8, 30, 0))
PID = os.getpid()
TOK = 'st-test-acctswitch-%d' % PID
def stored_close(sym, dflt):
    try:
        req = urllib.request.Request('https://figozyxoyobixadhqewr.supabase.co/rest/v1/rpc/st_candles', method='POST',
            data=json.dumps({'p_symbol': sym, 'p_tf': 1, 'p_from': T0 - 3600, 'p_to': T0}).encode(),
            headers={'apikey': 'sb_publishable_h-TrkkVzrGOkwX6LxMDsaQ_hE8540Nv', 'Content-Type': 'application/json'})
        rows = json.loads(urllib.request.urlopen(req, timeout=15).read())
        if rows: return float(rows[-1]['c'])
    except Exception as e:
        print('stored close not read, using', dflt, e)
    return dflt
p0 = stored_close('EURUSD', 1.1640)
s = socket.socket(); s.bind(('127.0.0.1', 0)); RPORT = s.getsockname()[1]; s.close()
relay = subprocess.Popen([sys.executable, os.path.join(HERE, '..', 'relay', 'server.py')], env=dict(os.environ, PORT=str(RPORT)), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
t = time.time() + 8
while time.time() < t:
    try: socket.create_connection(('127.0.0.1', RPORT), 0.5).close(); break
    except OSError: time.sleep(0.15)
EA_RELAY, APP_RELAY = '127.0.0.1:%d' % RPORT, 'ws://127.0.0.1:%d/realtime/v1/websocket?vsn=1.0.0' % RPORT
outs, eas = [], []
for sym, lg, px in (('EURUSD', '90001234', p0), ('EURUSD', '90007777', p0 + 0.005), ('EURUSD.x', '90003333', p0 + 0.010)):
    o = os.path.join(tempfile.gettempdir(), 'st_accsw_%s_%d.json' % (lg, PID)); outs.append(o)
    env = dict(os.environ, ST_RELAY=EA_RELAY, ST_FAKE_V='9.03')
    if sym != 'EURUSD': env['ST_FAKE_UNI'] = json.dumps({sym: [px, 5], 'GBPUSD.x': [1.30112, 5]})
    eas.append(subprocess.Popen([sys.executable, os.path.join(HERE, 'fake_ea_livecharts.py'), TOK, '420', o, sym, str(T0), str(px), '5', lg], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
time.sleep(2)
tjs = os.path.join(tempfile.gettempdir(), 'st_acctswitch_e2e_%d.js' % PID)
src = open(os.path.join(HERE, 'acctswitch_e2e.js'), encoding='utf-8').read()
for a, b in (('__RELAY__', APP_RELAY), ('__TOK__', TOK), ('__T0__', str(T0)), ('__P0__', repr(p0)), ('__MEASURE__', os.environ.get('ACCSW_MEASURE', '0')), ('__GAP__', os.environ.get('ACCSW_GAP', '0'))):
    src = src.replace(a, b)
open(tjs, 'w', encoding='utf-8').write(src)
try:
    rc = subprocess.call([sys.executable, os.path.join(HERE, 'browser_test.py'), tjs], env=dict(os.environ, PYTHONIOENCODING='utf-8'))
finally:
    relay.terminate()
    for e in eas:
        e.terminate()
        try: e.wait(5)
        except Exception: pass
for o in outs:
    try:
        log = json.load(open(o)); print(os.path.basename(o), json.dumps({k: log.get(k) for k in ('joined', 'who', 'hist', 'px', 'errors')})[:300])
    except Exception as e:
        print(os.path.basename(o), 'log not written', e)
sys.exit(rc)
