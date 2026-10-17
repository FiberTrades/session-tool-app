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
out2 = os.path.join(tempfile.gettempdir(), 'st_fake_ea_livecharts_gold.json')
# two MT5 charts with the EA: EUR/USD on account 90001234, gold on account 90005678 (each streams its own symbol)
ea = subprocess.Popen([sys.executable, os.path.join(HERE, 'fake_ea_livecharts.py'), 'st-test-livecharts-e2e', '200', out, 'EURUSD', str(T0), str(p0), '5', '90001234'])
ea2 = subprocess.Popen([sys.executable, os.path.join(HERE, 'fake_ea_livecharts.py'), 'st-test-livecharts-e2e', '200', out2, 'XAUUSD', str(T0), str(g0), '2', '90005678'])
time.sleep(2)
env = dict(os.environ, PYTHONIOENCODING='utf-8')
rc = subprocess.call([sys.executable, os.path.join(HERE, 'browser_test.py'), os.path.join(HERE, 'livecharts_e2e.js')], env=env)
for e2 in (ea, ea2):
    e2.terminate()
    try: e2.wait(5)
    except Exception: pass
try:
    log = json.load(open(out))
    print('stand-in EA:', json.dumps({k: log.get(k) for k in ('joined', 'who', 'hist', 'bars_msgs', 'px', 'unwatch', 'errors')}))
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
sys.exit(rc)
