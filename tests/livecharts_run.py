# Runs the Live Charts test: a stand-in EA 9.00 (fake_ea_livecharts.py, the EA's exact protocol) on a throwaway channel, its
# clock on a weekday morning with stored candles (Wed 14 Oct 2026 08:30 UTC) and its prices from that moment's stored
# close, then the app in headless Edge (livecharts_e2e.js) on the same channel; prints both sides.
#   python tests/livecharts_run.py
import calendar, json, os, subprocess, sys, tempfile, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
T0 = calendar.timegm((2026, 10, 14, 8, 30, 0))
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
p0, g0 = stored_close('EURUSD', 1.1640), stored_close('XAUUSD', 4100.0)
out = os.path.join(tempfile.gettempdir(), 'st_fake_ea_livecharts.json')
# Session Terminal's relay (relay/server.py) on this machine: the EUR/USD EA streams through it, gold's through Supabase
# ST_RELAY_REAL=<host>: the live relay on Railway instead
import socket as _sk
REAL = os.environ.get('ST_RELAY_REAL', '')
_s = _sk.socket(); _s.bind(('127.0.0.1', 0)); RPORT = _s.getsockname()[1]; _s.close()
relay = subprocess.Popen([sys.executable, os.path.join(HERE, '..', 'relay', 'server.py')], env=dict(os.environ, PORT=str(RPORT))) if not REAL else None
EA_RELAY = ('wss://' + REAL) if REAL else ('127.0.0.1:%d' % RPORT)
APP_RELAY = ('wss://%s/realtime/v1/websocket?vsn=1.0.0' % REAL) if REAL else ('ws://127.0.0.1:%d/realtime/v1/websocket?vsn=1.0.0' % RPORT)
time.sleep(1)
out2 = os.path.join(tempfile.gettempdir(), 'st_fake_ea_livecharts_gold.json')
out3 = os.path.join(tempfile.gettempdir(), 'st_fake_ea_livecharts_btc.json')
# two MT5 charts with the EA: EUR/USD on account 90001234, gold on account 90005678 (each streams its own symbol)
ea = subprocess.Popen([sys.executable, os.path.join(HERE, 'fake_ea_livecharts.py'), 'st-test-livecharts-e2e', '200', out, 'EURUSD', str(T0), str(p0), '5', '90001234'], env=dict(os.environ, ST_RELAY=EA_RELAY, ST_FAKE_V='9.02'))   # EA 9.02: the watchlist hub
ea2 = subprocess.Popen([sys.executable, os.path.join(HERE, 'fake_ea_livecharts.py'), 'st-test-livecharts-e2e', '200', out2, 'XAUUSD', str(T0), str(g0), '2', '90005678', '0'])   # gold's EA: managing from the app OFF
# a third chart: BTCUSD, a symbol with NO stored candles (18 Oct 2026) - through the relay, its chart built from what it sends
ea3 = subprocess.Popen([sys.executable, os.path.join(HERE, 'fake_ea_livecharts.py'), 'st-test-livecharts-e2e', '200', out3, 'BTCUSD', str(T0), '67250.0', '2', '90009999', '0'], env=dict(os.environ, ST_RELAY=EA_RELAY, ST_FAKE_V='9.01'))   # EA 9.01: other timeframes' history too
time.sleep(2)
env = dict(os.environ, PYTHONIOENCODING='utf-8')
# the test with the relay's address in it
tjs = os.path.join(tempfile.gettempdir(), 'st_livecharts_e2e_run.js')
open(tjs, 'w', encoding='utf-8').write(open(os.path.join(HERE, 'livecharts_e2e.js'), encoding='utf-8').read().replace('__RELAY__', APP_RELAY))
rc = subprocess.call([sys.executable, os.path.join(HERE, 'browser_test.py'), tjs], env=env)
if relay: relay.terminate()
for e2 in (ea, ea2, ea3):
    e2.terminate()
    try: e2.wait(5)
    except Exception: pass
try:
    log = json.load(open(out))
    print('stand-in EA:', json.dumps({k: log.get(k) for k in ('joined', 'who', 'hist', 'bars_msgs', 'px', 'unwatch', 'errors', 'cmds', 'bad_sig')}))
    print('hub (EURUSD, 9.02):', json.dumps({k: log.get(k) for k in ('wl', 'q', 'syms', 'hub_hs', 'hist_by', 'hub_px')})[:900])
    print('orders + settings (EURUSD, 9.02):', json.dumps({k: log.get(k) for k in ('opens', 'cfgs')})[:900])
    print('watches (s, ms, sym):', json.dumps(log.get('watches', [])[-12:]))
    print('px gaps (ms):', json.dumps(log.get('gaps_ms', [])[-12:]))
except Exception as e:
    print('stand-in EA log not written (stopped early):', e)
try:
    log2 = json.load(open(out2))
    print('stand-in EA (gold):', json.dumps({k: log2.get(k) for k in ('joined', 'who', 'hist', 'bars_msgs', 'px', 'unwatch', 'errors')}))
    print('gold watches (s, ms, sym):', json.dumps(log2.get('watches', [])[-8:]))
except Exception as e:
    print('gold stand-in log not written:', e)
try:
    log3 = json.load(open(out3))
    print('stand-in EA (BTCUSD):', json.dumps({k: log3.get(k) for k in ('joined', 'who', 'hist', 'hist_tf', 'bars_msgs', 'px', 'unwatch', 'errors')}))
except Exception as e:
    print('BTCUSD stand-in log not written:', e)
sys.exit(rc)
