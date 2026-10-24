# Runs the instant-open test: Session Terminal's relay on this machine, one stand-in EA 9.15 on EUR/USD (the hub, account 90001234,
# a cloud account in the test) whose MT5 opens a chart ST_FAKE_CHART_MS after a "chart" (1600, as the demo measured), its clock on
# a weekday morning with stored candles; then the app in headless Edge (instant_e2e.js). Prints both sides and the timings.
#   python tests/instant_run.py            E2E_APP=app_before.html: against an older copy; E2E_JS=instant_time.js: the timings alone
import calendar, json, os, socket, subprocess, sys, tempfile, time
HERE = os.path.dirname(os.path.abspath(__file__))
T0 = calendar.timegm((2026, 10, 14, 8, 30, 0))
s = socket.socket(); s.bind(('127.0.0.1', 0)); RPORT = s.getsockname()[1]; s.close()
relay = subprocess.Popen([sys.executable, os.path.join(HERE, '..', 'relay', 'server.py')], env=dict(os.environ, PORT=str(RPORT)))
time.sleep(1)
out = os.path.join(tempfile.gettempdir(), 'st_fake_ea_instant.json')
ea = subprocess.Popen([sys.executable, os.path.join(HERE, 'fake_ea_livecharts.py'), 'st-test-instant-e2e', '400', out, 'EURUSD', str(T0), '1.16420', '5', '90001234'],
                      env=dict(os.environ, ST_RELAY='127.0.0.1:%d' % RPORT, ST_FAKE_V=os.environ.get('ST_FAKE_V', '9.15'), ST_FAKE_CHART_MS=os.environ.get('ST_FAKE_CHART_MS', '1600')))
time.sleep(2)
tjs = os.path.join(tempfile.gettempdir(), 'st_instant_e2e_run.js')
open(tjs, 'w', encoding='utf-8').write(open(os.path.join(HERE, os.environ.get('E2E_JS', 'instant_e2e.js')), encoding='utf-8').read().replace('__RELAY__', 'ws://127.0.0.1:%d/realtime/v1/websocket?vsn=1.0.0' % RPORT))
rc = subprocess.call([sys.executable, os.path.join(HERE, 'browser_test.py'), tjs], env=dict(os.environ, PYTHONIOENCODING='utf-8'))
relay.terminate(); ea.terminate()
try: ea.wait(5)
except Exception: pass
try:
    log = json.load(open(out))
    print('stand-in EA: charts opened', json.dumps(log.get('charts')), '| chart commands', json.dumps(log.get('chart_cmds')), '| uncharts', json.dumps(log.get('uncharts')))
    print('orders', json.dumps(log.get('opens')), '| first price from each opened chart (s)', json.dumps(log.get('ch_first_px')), '| hub hs', json.dumps(log.get('hub_hs')[-6:]))
except Exception as e:
    print('stand-in EA log not written:', e)
sys.exit(rc)
