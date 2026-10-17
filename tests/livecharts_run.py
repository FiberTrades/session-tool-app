# Runs the Live Charts test: a stand-in EA 9.00 (fake_ea_livecharts.py, the EA's exact protocol) on a throwaway channel, its
# clock on a weekday morning with stored candles (Wed 14 Oct 2026 08:30 UTC) and its prices from that moment's stored
# close, then the app in headless Edge (livecharts_e2e.js) on the same channel; prints both sides.
#   python tests/livecharts_run.py
import calendar, json, os, subprocess, sys, tempfile, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
T0 = calendar.timegm((2026, 10, 14, 8, 30, 0))
p0 = 1.1640
try:
    req = urllib.request.Request('https://figozyxoyobixadhqewr.supabase.co/rest/v1/rpc/st_candles', method='POST',
        data=json.dumps({'p_symbol': 'EURUSD', 'p_tf': 1, 'p_from': T0 - 3600, 'p_to': T0}).encode(),
        headers={'apikey': 'sb_publishable_h-TrkkVzrGOkwX6LxMDsaQ_hE8540Nv', 'Content-Type': 'application/json'})
    rows = json.loads(urllib.request.urlopen(req, timeout=15).read())
    if rows: p0 = float(rows[-1]['c'])
except Exception as e:
    print('stored close not read, using', p0, e)
out = os.path.join(tempfile.gettempdir(), 'st_fake_ea_livecharts.json')
ea = subprocess.Popen([sys.executable, os.path.join(HERE, 'fake_ea_livecharts.py'), 'st-test-livecharts-e2e', '170', out, 'EURUSD', str(T0), str(p0)])
time.sleep(2)
env = dict(os.environ, PYTHONIOENCODING='utf-8')
rc = subprocess.call([sys.executable, os.path.join(HERE, 'browser_test.py'), os.path.join(HERE, 'livecharts_e2e.js')], env=env)
ea.terminate()
try: ea.wait(5)
except Exception: pass
try:
    log = json.load(open(out))
    print('stand-in EA:', json.dumps({k: log.get(k) for k in ('joined', 'who', 'hist', 'bars_msgs', 'px', 'unwatch', 'errors')}))
    print('watches (s, ms, sym):', json.dumps(log.get('watches', [])[-12:]))
    print('px gaps (ms):', json.dumps(log.get('gaps_ms', [])[-12:]))
except Exception as e:
    print('stand-in EA log not written (stopped early):', e)
sys.exit(rc)
