# Runs the Live Charts Compare + drawing-alerts test (batches C and D, 19 Oct 2026): two stand-in EAs (fake_ea_livecharts.py,
# the EA's exact protocol) on a throwaway channel - EUR/USD (EA 9.03) and gold (EA 9.05) on Wed 14 Oct 2026 08:30 UTC with
# prices from that moment's stored close - then the app in headless Edge (livecmp_e2e.js) on the same channel, signed out
# (nothing is written to the database); prints both sides.
#   python tests/livecmp_run.py
import calendar, json, os, subprocess, sys, tempfile, time, urllib.request
import lowprio  # noqa: F401  (below normal priority: Nestor trades on this PC)
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
TOK = 'st-test-livecmp-e2e'
out = os.path.join(tempfile.gettempdir(), 'st_fake_ea_livecmp_eur.json')
out2 = os.path.join(tempfile.gettempdir(), 'st_fake_ea_livecmp_gold.json')
ea = subprocess.Popen([sys.executable, os.path.join(HERE, 'fake_ea_livecharts.py'), TOK, '220', out, 'EURUSD', str(T0), str(p0), '5', '90001234', '0'], env=dict(os.environ, ST_FAKE_V='9.03'))
ea2 = subprocess.Popen([sys.executable, os.path.join(HERE, 'fake_ea_livecharts.py'), TOK, '220', out2, 'XAUUSD', str(T0), str(g0), '2', '90005678', '0'], env=dict(os.environ, ST_FAKE_V='9.05'))
time.sleep(2)
env = dict(os.environ, PYTHONIOENCODING='utf-8')
rc = subprocess.call([sys.executable, os.path.join(HERE, 'browser_test.py'), os.path.join(HERE, 'livecmp_e2e.js')], env=env)
for e2 in (ea, ea2):
    e2.terminate()
    try: e2.wait(5)
    except Exception: pass
for nm, o in (('EUR/USD', out), ('gold', out2)):
    try:
        log = json.load(open(o))
        print('stand-in EA (%s):' % nm, json.dumps({k: log.get(k) for k in ('joined', 'who', 'hist', 'bars_msgs', 'px', 'unwatch', 'errors')}))
        print('  watches (s, ms, sym):', json.dumps(log.get('watches', [])[-6:]))
    except Exception as e:
        print('stand-in EA log not written (%s):' % nm, e)
sys.exit(rc)
