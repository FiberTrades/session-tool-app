# Runs practice_linetext_e2e.js (29 Oct 2026): a line's words Above / Middle / Below and Left / Centre / Right, on a dark chart and then a
# white one (Middle breaks the line under the words with nothing painted behind them, on both). Back Testing; nothing live.
#   python tests/linetext_run.py
import os, subprocess, sys, tempfile
import lowprio  # noqa: F401  (below normal priority: Nestor trades on this PC)
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'practice_linetext_e2e.js'), encoding='utf-8').read()
rc = 0
for name, light in (('dark_chart', False), ('white_chart', True)):
    tjs = os.path.join(tempfile.gettempdir(), 'st_linetext_%s.js' % name)
    open(tjs, 'w', encoding='utf-8').write(src.replace('!!window.__LT_LIGHT', 'true' if light else 'false'))
    env = dict(os.environ, PYTHONIOENCODING='utf-8')
    print('---- %s ----' % name, flush=True)
    rc |= subprocess.call([sys.executable, os.path.join(HERE, 'browser_test.py'), tjs], env=env)
sys.exit(rc)
