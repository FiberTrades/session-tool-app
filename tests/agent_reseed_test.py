# Unit check of the cloud agent's reseed() (27 Oct 2026) without the server: st_agent.py is loaded with its config, key and
# side effects stubbed, then reseed() runs against temp folders.
#   python tests/agent_reseed_test.py [path to st_agent.py]
import os, re, sys, tempfile, time, types
AGENT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'cloud', 'agent', 'st_agent.py')
src = open(AGENT, encoding='utf-8').read()
src = re.sub(r'^CFG = .*$', 'CFG = {"host": "t", "url": "http://x", "key": "k"}', src, flags=re.M)
src = re.sub(r'^PRIV = .*$', 'PRIV = None', src, flags=re.M)
src = re.sub(r'^from cryptography.*$', 'serialization = padding = hashes = None', src, flags=re.M)
src = re.sub(r'^import cryptography.*$', '', src, flags=re.M)
src = src.replace('from zoneinfo import ZoneInfo', 'ZoneInfo = lambda k: None')
src = src.replace('\nif __name__ == "__main__":', '\nif False:')
ns = {'__name__': 'st_agent_test'}
try:
    exec(compile(src, 'st_agent.py', 'exec'), ns)
except Exception as e:
    print('load failed:', type(e).__name__, e); sys.exit(2)
calls = {'report': [], 'stop': [], 'log': []}
ns['report'] = lambda acc, st, msg='': calls['report'].append((st, msg))
ns['stop'] = lambda a, wipe_dir=None: calls['stop'].append(a['login'])
ns['log'] = lambda *a: calls['log'].append(a)
ns['subprocess'] = types.SimpleNamespace(run=lambda *a, **k: None)
T = tempfile.mkdtemp()
seed = os.path.join(T, 'servers-all.dat'); open(seed, 'wb').write(b'NEW LIST')
ns['SEED_SERVERS'] = seed
ok = []
def check(name, cond, got=None): ok.append(cond); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  got: %r' % (got,)))
def acct(login, signed_log=False, old=True):
    ad = os.path.join(T, str(login)); os.makedirs(os.path.join(ad, 'Config')); os.makedirs(os.path.join(ad, 'logs'))
    sv = os.path.join(ad, 'Config', 'servers.dat'); open(sv, 'wb').write(b'OLD')
    if old: t = time.time() - 3600; os.utime(sv, (t, t))
    line = "IR\t0\t10:00:00\tNetwork\t'%s': authorized on Broker-Live through Access Point" % login if signed_log else "ED\t0\t10:00:00\tTerminal\tstarted"
    open(os.path.join(ad, 'logs', '20261026.log'), 'wb').write(line.encode('utf-16-le'))
    return {'id': 'a%s' % login, 'login': login, 'server': 'Broker-Live'}, ad, sv
# 1. never signed in, its list older than the new one: renewed, MT5 started again, once
a, ad, sv = acct(1001); s = {'next': 99, 'fails': 3}
r1 = ns['reseed'](a, ad, s)
check('never signed in + an older list: the new list copied in', r1 and open(sv, 'rb').read() == b'NEW LIST', open(sv, 'rb').read())
check('...its MT5 stopped so the agent starts it again, no back-off', calls['stop'] == [1001] and s['next'] == 0 and s['fails'] == 0, (calls['stop'], s))
check('...the member is told', calls['report'] and 'server list was updated' in calls['report'][-1][1], calls['report'])
r2 = ns['reseed'](a, ad, s)
check('...only once per list (a second call does nothing)', r2 is False and calls['stop'] == [1001], (r2, calls['stop']))
# 2. an account that has signed in at some time: never touched
b, bd, bsv = acct(2002, signed_log=True); sb = {}
r3 = ns['reseed'](b, bd, sb)
check('an account that has ever signed in: never touched', r3 is False and open(bsv, 'rb').read() == b'OLD' and 2002 not in calls['stop'] and sb.get('ever_signed'), (r3, sb))
# 3. never signed in but its copy is already this list (newer than it): nothing
c, cd, csv = acct(3003, old=False); time.sleep(0.05); os.utime(seed, (time.time() - 10, time.time() - 10))
r4 = ns['reseed'](c, cd, {})
check('a copy at least as new as the list: nothing', r4 is False and open(csv, 'rb').read() == b'OLD', r4)
# 4. a NEWER list later: renewed again, once
os.utime(seed, (time.time() + 5, time.time() + 5))
r5 = ns['reseed'](a, ad, s)
check('a newer list later: renewed once more', r5 is True and calls['stop'] == [1001, 1001], (r5, calls['stop']))
print('\n%d checks, %d failed' % (len(ok), ok.count(False)))
sys.exit(0 if all(ok) else 1)
