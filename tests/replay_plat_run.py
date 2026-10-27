# Runs replay_plat_e2e.js (26 Oct 2026): Replay on the Charts platform on a computer's screen, dark then light, then on a phone's,
# the phone platform, dark then light. Signed out, over the shared candles; no relay, no EA, nothing live.
#   python tests/replay_plat_run.py            (SHOTS=<folder> keeps a screenshot of each run there)
import os, subprocess, sys, tempfile
import lowprio  # noqa: F401  (below normal priority: Nestor trades on this PC)
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'replay_plat_e2e.js'), encoding='utf-8').read()
shots = os.environ.get('SHOTS', '')
rc = 0
for name, size, mob, lt in (('replay_dark', '1600x900', '', False), ('replay_light', '1600x900', '', True), ('replay_phone', '', '390x844', False), ('replay_phone_light', '', '390x844', True)):
    tjs = os.path.join(tempfile.gettempdir(), 'st_replay_plat_%s.js' % name)
    open(tjs, 'w', encoding='utf-8').write(src.replace('!!window.__RP_LT', 'true' if lt else 'false'))
    env = dict(os.environ, PYTHONIOENCODING='utf-8')
    env.pop('E2E_MOBILE', None); env.pop('E2E_SIZE', None); env.pop('E2E_SHOT', None)
    if size: env['E2E_SIZE'] = size
    if mob: env['E2E_MOBILE'] = mob
    if shots: env['E2E_SHOT'] = os.path.join(shots, name + '.png')
    print('---- %s ----' % name, flush=True)
    rc |= subprocess.call([sys.executable, os.path.join(HERE, 'browser_test.py'), tjs], env=env)
sys.exit(rc)
