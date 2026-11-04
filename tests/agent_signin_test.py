# Unit check of the cloud agent's check() (4 Nov 2026) without the server: st_agent.py is loaded with its config, key and side
# effects stubbed, then check() reads stand-in journals in temp folders. No MT5, no real account, nothing is restarted.
#   python tests/agent_signin_test.py [path to st_agent.py]
import os, re, shutil, sys, tempfile, time, types
AGENT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'cloud', 'agent', 'st_agent.py')
src = open(AGENT, encoding='utf-8').read()
src = re.sub(r'^CFG = .*$', 'CFG = {"host": "t", "url": "http://x", "key": "k"}', src, flags=re.M)
src = re.sub(r'^PRIV = .*$', 'PRIV = None', src, flags=re.M)
src = re.sub(r'^from cryptography.*$', 'serialization = padding = hashes = None', src, flags=re.M)
src = src.replace('from zoneinfo import ZoneInfo', 'ZoneInfo = lambda k: None')
src = src.replace('\nif __name__ == "__main__":', '\nif False:')
ns = {'__name__': 'st_agent_test'}
exec(compile(src, 'st_agent.py', 'exec'), ns)
T = tempfile.mkdtemp()
calls = {'report': [], 'stop': []}
ns['report'] = lambda acc, st, msg='': calls['report'].append((st, msg))
ns['stop'] = lambda a, wipe_dir=None: calls['stop'].append(a['login'])
ns['log'] = lambda *a: None
ns['fx_paused'] = lambda: False
ns['subprocess'] = types.SimpleNamespace(run=lambda *a, **k: None, Popen=lambda *a, **k: None, DEVNULL=None)
ns['SEED_SERVERS'] = os.path.join(T, 'no-such-list')       # reseed() has nothing to offer: the message is what's left
ns['adir_of'] = lambda acc: os.path.join(T, str(acc['login']))
ok = []
def expect(name, cond, got=None): ok.append(cond); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  got: %r' % (got,)))

START = "FI\t0\t07:41:00.425\tTerminal\tMetaTrader 5 x64 build 6281 started for MetaQuotes Ltd."
def AUTH(l): return "IK\t0\t09:15:33.399\tNetwork\t'%s': authorized on Broker-Trade through Access Server (ping: 26.93 ms, build 6230)" % l
def SCAN(l): return "EO\t0\t03:53:50.390\tNetwork\t'%s': scanning network for access points\nPI\t0\t03:53:50.639\tNetwork\t'%s': scanning network finished" % (l, l)
def FAILED(l, why): return "LN\t0\t09:15:33.399\tNetwork\t'%s': authorization on Broker-Trade failed (%s)" % (l, why)

def terminal(login, days, ea_age=20):
    """Stand-in folders: {file date: journal lines}, as MT5 writes them (UTF-16 with a mark), MetaEditor's log beside them."""
    ad = os.path.join(T, str(login))
    shutil.rmtree(ad, ignore_errors=True)
    os.makedirs(os.path.join(ad, 'logs')); os.makedirs(os.path.join(ad, 'MQL5', 'logs'))
    for day, lines in days.items():
        open(os.path.join(ad, 'logs', '%s.log' % day), 'wb').write(b'\xff\xfe' + '\r\n'.join(lines).encode('utf-16-le'))
    open(os.path.join(ad, 'logs', 'metaeditor.log'), 'wb').write(b'\xff\xfe' + 'nothing about signing in\r\n'.encode('utf-16-le'))
    ea = os.path.join(ad, 'MQL5', 'logs', '20261104.log'); open(ea, 'wb').write(b'MM alive')
    os.utime(ea, (time.time() - ea_age, time.time() - ea_age))
    return ad

class Alive:                                      # a start by this agent: a process it holds
    def poll(self): return None
def run(login, started_ago, proc=None, **extra):
    acc = {'id': 'a%s' % login, 'login': login, 'server': 'Broker-Trade'}
    s = {'started': time.time() - started_ago, 'proc': proc, 'fails': 0, 'next': 0}; s.update(extra)
    ns['state'][acc['id']] = s
    calls['report'].clear(); calls['stop'].clear()
    ns['check'](acc)
    return list(calls['report']), list(calls['stop']), s
def told_to_remove(rep): return any('remove the account' in m for _, m in rep)
def is_running(rep): return rep and rep[-1][0] == 'running'

# 1. The incident: agent restarted, MT5 running since yesterday; today's file holds only the night's scanning lines.
L = 9000001; terminal(L, {'20261103': [START, AUTH(L), SCAN(L)], '20261104': [SCAN(L)]})
rep, st, _ = run(L, 300)
expect('4 Nov replay: an adopted, signed-in MT5 is not told to remove its account', not told_to_remove(rep), rep)
expect('...and reports running', is_running(rep) and not st, (rep, st))

# 2. Signed in days ago, the connection never dropped: three newer files with no "authorized on".
L = 9000002; terminal(L, {'20261031': [START, AUTH(L)], '20261101': [SCAN(L)], '20261102': [SCAN(L)], '20261103': [SCAN(L)], '20261104': [SCAN(L)]})
rep, st, _ = run(L, 300)
expect('signed in 4 days ago, adopted: running', is_running(rep) and not told_to_remove(rep), rep)

# 3. The same with no agent restart: the agent holds the process and the log has passed midnight - the heartbeat goes on.
L = 9000003; terminal(L, {'20261103': [START, AUTH(L), SCAN(L)], '20261104': [SCAN(L)]})
rep, st, _ = run(L, 80000, proc=Alive())
expect('past midnight, no agent restart: still reports (status_at is the heartbeat)', is_running(rep), rep)

# 4. The message must still come when it is true: MT5 running since its own start with no sign-in, an older run's sign-in before it.
L = 9000004; terminal(L, {'20261103': [START, AUTH(L)], '20261104': [START, SCAN(L)]})
rep, st, _ = run(L, 300)
expect('adopted, this start never signed in (an earlier one did): told', told_to_remove(rep) and not is_running(rep), rep)
rep, st, _ = run(L, 100)
expect('...not before NO_SIGNIN has passed', not told_to_remove(rep) and not is_running(rep), rep)
L = 9000005; terminal(L, {'20261104': [START]})
rep, st, _ = run(L, 300)
expect('never signed in at all: told', told_to_remove(rep), rep)

# 5. A start by this agent, MT5 hasn't written yet: yesterday's sign-in is the MT5 before it. The start file stays for it.
L = 9000006; ad = terminal(L, {'20261103': [START, AUTH(L)]})
f = os.path.join(ad, 'logs', '20261103.log'); os.utime(f, (time.time() - 3600, time.time() - 3600))
ini = os.path.join(ad, 'st-start.ini'); open(ini, 'w').write('x')
rep, st, s = run(L, 5, proc=Alive(), ini=ini)
expect('just started, nothing written yet: not "running" on the old sign-in', not is_running(rep), rep)
expect('...the start file is left for MT5', os.path.exists(ini) and s['ini'] == ini, s)
open(f, 'ab').write('\r\n'.join(['', START, AUTH(L)]).encode('utf-16-le'))
rep, st, s = run(L, 15, proc=Alive(), ini=ini)
expect('...its own sign-in arrives: running, the start file gone', is_running(rep) and not os.path.exists(ini) and s['ini'] is None, (rep, s))

# 6. A start line and sign-in in the same file as an older run's failure: that failure is the past.
L = 9000007; terminal(L, {'20261104': [START, FAILED(L, 'Invalid account'), START, AUTH(L)]})
rep, st, _ = run(L, 300)
expect('an earlier run\'s "Invalid" before this start: running, not stopped', is_running(rep) and not st, (rep, st))
L = 9000008; terminal(L, {'20261103': [START, FAILED(L, 'Invalid account')], '20261104': [START]})
rep, st, _ = run(L, 5)
expect('...also when this start has not signed in yet: not stopped', not st and not any(x[0] == 'error' for x in rep), (rep, st))

# 7. MT5's own reasons still count, within this start.
L = 9000009; terminal(L, {'20261104': [START, FAILED(L, 'Invalid account')]})
rep, st, _ = run(L, 300)
expect('"Invalid" in this start: error, MT5 stopped', rep and rep[-1][0] == 'error' and st == [L], (rep, st))
L = 9000010; terminal(L, {'20261104': [START, FAILED(L, 'Service is not available')]})
rep, st, _ = run(L, 300)
expect('the broker\'s side in this start: keeps trying, says so', rep and 'not letting anyone sign in' in rep[-1][1] and not st, (rep, st))

# 8. The EA watchdog covers an adopted MT5 signed in days ago too.
L = 9000011; terminal(L, {'20261101': [START, AUTH(L)], '20261102': [SCAN(L)], '20261103': [SCAN(L)]}, ea_age=999)
rep, st, _ = run(L, 400)
expect('adopted, signed in days ago, the EA quiet: restarted by the watchdog', rep and 'EA stopped' in rep[-1][1] and st == [L], (rep, st))

# 9. The real journal's wording, as one account's file reads on uk1 with the login swapped.
L = 9000012; terminal(L, {'20261104': ["EM\t0\t07:42:59.620\tStartup\tsuccessfully initialized from start config \"C:\\ST\\%s\\st-start.ini\"" % L, START,
                                       "KJ\t0\t07:43:00.002\tTerminal\tWindows 11 build 22000 on Wine 11.20", "JJ\t0\t07:43:05.800\tNetwork\t'%s': authorized on Broker-Trade" % L]})
rep, st, _ = run(L, 300)
expect('a start as on uk1: running', is_running(rep), rep)

# 10. A broker new to the cloud (4 Nov 2026, Troy's Tradeify): never signed in, the broker says nothing: it is looked for, once, and not told to remove the account.
_seek = os.path.join(T, 'seek-server.sh'); open(_seek, 'w').close(); ns['SEEK'] = _seek
class FakeProc:
    rc = None
    def poll(self): return self.rc
_proc = FakeProc(); _started = []
ns['subprocess'].Popen = lambda a, **k: (_started.append(a), _proc)[1]
L = 9000020; terminal(L, {'20261104': [START]})
rep, st, _ = run(L, 300)
expect('a server MT5 does not know: looked for, and says so', rep and 'Looking for Broker-Trade' in rep[-1][1] and not told_to_remove(rep) and len(_started) == 1 and _started[0][-1] == 'Broker-Trade', (rep, _started))
rep, st, _ = run(L, 310)
expect('...one search at a time', len(_started) == 1 and 'Looking for' in rep[-1][1], (rep, _started))
_proc.rc = 2
rep, st, _ = run(L, 320)
expect('...not found: the member is told to check the name, and it is not searched again at once', len(_started) == 1 and 'written exactly' in rep[-1][1], (rep, _started))
ns['seeking'].clear(); _proc.rc = None; _started.clear()
L = 9000021; terminal(L, {'20261104': [START]})
rep, st, _ = run(L, 300, ever_signed=True)
expect('an account that has signed in here before is never searched for', not _started, _started)
_acc = {'id': 'abad', 'login': 9000022, 'server': 'Bad;name$(id)'}
expect('a server name that could reach a shell is refused', ns['seek'](_acc) is False and not _started, _started)
ns['seeking'].clear()

shutil.rmtree(T, ignore_errors=True)
print('\n%d checks, %d failed' % (len(ok), ok.count(False)))
sys.exit(0 if all(ok) else 1)
