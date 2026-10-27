# Runs trade_replay_plat_e2e.js (26 Oct 2026): Trade Replay in the Charts platform's look on a computer, dark and light, on a small laptop,
# then on a phone's screen, its own layout in the platform's colours, dark and light. Signed out, over the shared candles; nothing live.
#   python tests/trade_replay_plat_run.py            (SHOTS=<folder> keeps a screenshot of each run there)
import os, subprocess, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'trade_replay_plat_e2e.js'), encoding='utf-8').read()
shots = os.environ.get('SHOTS', '')
rc = 0
for name, size, mob, lt in (('trade_replay_dark', '1600x900', '', False), ('trade_replay_light', '1600x900', '', True), ('trade_replay_1024', '1024x768', '', False), ('trade_replay_phone', '', '390x844', False), ('trade_replay_phone_light', '', '390x844', True)):
    tjs = os.path.join(tempfile.gettempdir(), 'st_trade_replay_plat_%s.js' % name)
    open(tjs, 'w', encoding='utf-8').write(src.replace('!!window.__RP_LT', 'true' if lt else 'false'))
    env = dict(os.environ, PYTHONIOENCODING='utf-8')
    env.pop('E2E_MOBILE', None); env.pop('E2E_SIZE', None); env.pop('E2E_SHOT', None)
    if size: env['E2E_SIZE'] = size
    if mob: env['E2E_MOBILE'] = mob
    if shots: env['E2E_SHOT'] = os.path.join(shots, name + '.png')
    print('---- %s ----' % name, flush=True)
    rc |= subprocess.call([sys.executable, os.path.join(HERE, 'browser_test.py'), tjs], env=env)
sys.exit(rc)
