# Runs the live-line test: a stand-in EA (fake_ea_line.py, the EA's exact protocol) on a throwaway channel, then the
# app in headless Edge (liveline_e2e.js) watching the same channel; prints both sides.
#   python tests/liveline_run.py
import json, os, subprocess, sys, tempfile, time
HERE = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(tempfile.gettempdir(), 'st_fake_ea_line.json')
ea = subprocess.Popen([sys.executable, os.path.join(HERE, 'fake_ea_line.py'), 'st-test-liveline-e2e', '100', out, '990011'])
time.sleep(2)
env = dict(os.environ, PYTHONIOENCODING='utf-8')
rc = subprocess.call([sys.executable, os.path.join(HERE, 'browser_test.py'), os.path.join(HERE, 'liveline_e2e.js')], env=env)
ea.terminate()
try: ea.wait(5)
except Exception: pass
try:
    log = json.load(open(out))
    print('stand-in EA:', json.dumps({k: log[k] for k in ('joined', 'watch', 'unwatch', 'sent_ticks', 'errors')}))
except Exception as e:
    print('stand-in EA log not written (stopped early):', e)
sys.exit(rc)
