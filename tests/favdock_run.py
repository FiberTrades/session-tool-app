# Runs favdock_e2e.js (29 Oct 2026): the Favourites bar dragged up over the platform's top bar and back down, in the platform's window and
# the last run ends with the bar in its chart, the others with it up over the top bar, each with
# the Emoji tool's picker open from the bar's smiley. Live in the Charts tab, maximised; signed out, stored candles, no EA.
#   python tests/favdock_run.py            (SHOTS=<folder> keeps a screenshot of each run there)
import os, subprocess, sys, tempfile
import lowprio  # noqa: F401  (below normal priority: Nestor trades on this PC)
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'favdock_e2e.js'), encoding='utf-8').read()
shots = os.environ.get('SHOTS', '')
rc = 0
for size, end in (('1366x768', 'up'), ('1440x900', 'up'), ('1920x1080', 'up'), ('1440x900', 'float')):
    name = 'favdock_%s_%s' % (size, end)
    tjs = os.path.join(tempfile.gettempdir(), 'st_%s.js' % name)
    open(tjs, 'w', encoding='utf-8').write(src.replace("window.__FD_END || 'up'", repr(end)))
    env = dict(os.environ, PYTHONIOENCODING='utf-8', E2E_SIZE=size)
    env.pop('E2E_MOBILE', None); env.pop('E2E_SHOT', None)
    if shots: env['E2E_SHOT'] = os.path.join(shots, name + '.png')
    print('---- %s ----' % name, flush=True)
    rc |= subprocess.call([sys.executable, os.path.join(HERE, 'browser_test.py'), tjs], env=env)
sys.exit(rc)
