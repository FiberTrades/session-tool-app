# Runs themebars_e2e.js (27 Oct 2026): the floating toolbars and menus in the platform's theme, not the chart's background - a dark
# platform with a white chart, then a light platform with a dark chart. Signed out, over the shared candles; nothing live.
#   python tests/themebars_run.py            (SHOTS=<folder> keeps a screenshot of each run there)
import os, subprocess, sys, tempfile
import lowprio  # noqa: F401  (below normal priority: Nestor trades on this PC)
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'themebars_e2e.js'), encoding='utf-8').read()
shots = os.environ.get('SHOTS', '')
rc = 0
for name, lt in (('dark_platform_white_chart', False), ('light_platform_dark_chart', True)):
    tjs = os.path.join(tempfile.gettempdir(), 'st_themebars_%s.js' % name)
    open(tjs, 'w', encoding='utf-8').write(src.replace('!!window.__TB_LT', 'true' if lt else 'false'))
    env = dict(os.environ, PYTHONIOENCODING='utf-8', E2E_SIZE='1600x900')
    env.pop('E2E_MOBILE', None); env.pop('E2E_SHOT', None)
    if shots: env['E2E_SHOT'] = os.path.join(shots, name + '.png')
    print('---- %s ----' % name, flush=True)
    rc |= subprocess.call([sys.executable, os.path.join(HERE, 'browser_test.py'), tjs], env=env)
sys.exit(rc)
