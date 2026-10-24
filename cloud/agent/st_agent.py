#!/usr/bin/env python3
"""Session Terminal cloud MT5 agent (23 Oct 2026). Runs as root under systemd (st-agent.service).

Every few seconds it asks cloud-agent (Supabase edge function) which MT5 accounts this host should run, and makes it so:

  - every account gets its own Wine prefix (/home/st/members/<user>.<login>), copied from the clean MT5 template; a
    member's accounts share one Common folder (/home/st/members/<user>.common, linked into each prefix) - the EA's
    Lead/Follow copier talks through files there;
  - each account runs its own portable MT5 (C:\\ST\\<login>) with the Session Terminal EA on a chart, its sync token
    and App trading set from the start, in the member's own time zone (the EA's daily reset follows the clock);
  - the MT5 password arrives encrypted with this host's public key; it is opened here, written into the terminal's
    start file only for the moment MT5 starts, and that file is deleted once MT5 has signed in (or after 2 minutes);
  - an account that is no longer asked for is stopped and its prefix deleted; a member with none left loses the Common folder;
  - what happened is reported back: starting, running (signed in), error (with MT5's own reason).

Nothing here ever places or changes a trade: MT5 and the EA do what the member does in the app.
"""
import base64, glob, hashlib, json, os, re, shutil, signal, subprocess, sys, time, urllib.request
from datetime import datetime
from zoneinfo import ZoneInfo

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

CFG = json.load(open("/etc/st-agent/config.json"))
HOST, URL, KEY = CFG["host"], CFG["url"], CFG["key"]
PRIV = serialization.load_pem_private_key(open("/etc/st-agent/host_key.pem", "rb").read(), password=None)
TEMPLATE = "/home/st/mt5-template"
WINE = "/opt/wine-staging/bin/wine"      # staging in Windows 11 mode: stable Wine trips MT5's debugger check since 18 Oct 2026
MEMBERS = "/home/st/members"
EA_SRC = "/opt/st/ea/MinimalistManager.ex5"
PROFILE = "STCloud"         # the chart set the agent writes before each start (write_profile)
SEED_COMMON = "/opt/st/seed-common.ini"      # MT5's saved settings, see prepare()
SEED_SERVERS = "/opt/st/servers-ftmo.dat"     # FTMO's server list
POLL = 10
HEARTBEAT = 60              # seconds between status reports while nothing changes
EA_QUIET = 300              # the EA writes "MM alive" to its log every minute: 5 minutes of silence = it stopped
BOOT_INI_TTL = 120          # seconds the start file (with the password) may live
RESTART_BACKOFF = [10, 30, 60, 300, 900]

state = {}                  # account id -> {"proc", "started", "fails", "next", "status", "ini"}
NY = ZoneInfo("America/New_York")


def fx_paused():
    """No prices from Friday 17:00 to Sunday 17:00 New York time, at the daily rollover around 17:00, nor on 25 Dec and
    1 Jan - and the EA's "MM alive" line only comes with prices (it runs on MT5's server clock), so its log is quiet
    then by design. 23 Oct 2026: the demo was restarted as "stopped answering" minutes after Friday's close. Each window
    runs on until prices have been back for EA_QUIET."""
    t = datetime.now(NY)
    m, wd, back = t.hour * 60 + t.minute, t.weekday(), 17 * 60 + 15 + EA_QUIET // 60
    if (t.month, t.day) in ((12, 25), (1, 1)):
        return True
    if wd == 5 or (wd == 4 and m >= 16 * 60 + 55) or (wd == 6 and m < back):
        return True
    return 16 * 60 + 55 <= m < back


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


def api(method, body=None, query=""):
    req = urllib.request.Request(URL + query, method=method, data=None if body is None else json.dumps(body).encode(),
                                 headers={"x-agent-key": KEY, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode())


def report(acc, status, msg=""):
    """A change goes at once; the same state again each minute - status_at is the heartbeat nudge-cron watches."""
    s = state.setdefault(acc["id"], {})
    same = s.get("status") == (status, msg)
    if same and time.time() - s.get("sent_at", 0) < HEARTBEAT:
        return
    try:
        api("POST", {"host": HOST, "id": acc["id"], "status": status, "msg": msg})
        s["status"], s["sent_at"] = (status, msg), time.time()
        if not same:
            log(acc["login"], status, msg)
    except Exception as e:
        log("report failed", acc["login"], e)


def decrypt(b64):
    return PRIV.decrypt(base64.b64decode(b64), padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()),
                                                            algorithm=hashes.SHA256(), label=None)).decode()


def safe(s):
    return re.sub(r"[^A-Za-z0-9_.-]", "_", str(s))[:64]


def prefix_of(acc):
    """One Wine prefix per MT5 account (23 Oct 2026). Two MT5s in one prefix share its virtual desktop, which lives on
    the first one's screen: the second (his 70K beside the demo) died at every start with an X "BadWindow" error."""
    return os.path.join(MEMBERS, "%s.%s" % (safe(acc["user"]), safe(acc["login"])))


def common_of(acc):
    return os.path.join(MEMBERS, "%s.common" % safe(acc["user"]))


def adir_of(acc):
    return os.path.join(prefix_of(acc), "drive_c", "ST", safe(acc["login"]))


def as_st(cmd):
    subprocess.run(["chown", "-R", "st:st"] + cmd, check=False)


def utf16(path, text):
    with open(path, "wb") as f:
        f.write(b"\xff\xfe" + text.replace("\n", "\r\n").encode("utf-16-le"))


def inputs(acc, e):
    """The EA's inputs: the sync token, App trading, and the settings this account's EA last reported on that symbol -
    from the PC it ran on before, or from this server (23 Oct 2026, "settings follow the account": a fresh MT5 has none
    of the panel's saved state, and the EA would start on factory risk). Partial-close shares live only in the panel."""
    ln = ["InpSyncToken=%s" % (acc.get("token") or ""), "InpAppTrade=%s" % ("true" if acc.get("app_trading") else "false")]
    e = e or {}
    num = lambda k: (float(e[k]) if isinstance(e.get(k), (int, float)) or re.match(r"^-?\d+(\.\d+)?$", str(e.get(k, ""))) else None)
    yes = lambda k: ("true" if e.get(k) in (True, "true", 1) else "false") if k in e else None
    pick = {
        "InpRiskMode": {"percent": 0, "amount": 1, "lots": 2}.get(e.get("risk_mode")),
        "InpRiskPercent": num("risk_percent"), "InpRiskAmount": num("risk_amount"), "InpFixedLot": num("fixed_lot"),
        "InpMinSLpips": num("sl_min"), "InpMaxSLpips": num("sl_max"),
        "InpTPMode": {"rr": 0, "pips": 1}.get(e.get("tp_mode")), "InpTP_On": yes("tp_on"),
        "InpTP_Val": num("tp_value"), "InpTP_Pct": num("tp_close_pct"),
        "InpUseBE": yes("be_on"), "InpBE_RR": num("be_trigger_r"),
        "InpBE_OffMode": {"pips": 0, "rr": 1}.get(e.get("be_offset_mode")), "InpBE_Offset": num("be_offset"),
        "InpMaxTradesDay": (int(num("max_trades_day")) if num("max_trades_day") is not None else None),
    }
    for k, v in pick.items():
        if v is not None:
            ln.append("%s=%s" % (k, ("%g" % v) if isinstance(v, float) else v))
    return ln


def symbols(acc):
    """The charts to open: the member's own list when they chose one (cloud_mt5.symbols, 23 Oct 2026 - his 70K got a
    BTCUSD chart he had closed on his PC), each with that symbol's last settings or else the account's; otherwise every
    symbol the account's EA ran on in the last 30 days (cloud-agent's "eas"), each with its own settings, plus any symbol
    named for it in /etc/st-agent/extra-symbols.json ({"<login>": ["XAUUSD"]}); else EURUSD."""
    own = acc.get("symbols")
    if own:
        by = {x.get("symbol"): x.get("settings") for x in (acc.get("eas") or [])}
        return [(sym, by.get(sym) or acc.get("ea")) for sym in own]
    out = [(x.get("symbol"), x.get("settings")) for x in (acc.get("eas") or []) if x.get("symbol")]
    try:
        extra = json.load(open("/etc/st-agent/extra-symbols.json")).get(str(acc["login"]), [])
    except Exception:
        extra = []
    for sym in extra:
        if sym not in [o[0] for o in out]:
            out.append((sym, None))
    return out or [("EURUSD", acc.get("ea"))]


CHART = r"""<chart>
id=%(id)d
symbol=%(sym)s
period_type=0
period_size=15
scale=4
mode=1
grid=0
volume=0
scroll=1
shift=1
ohlc=0
tradelines=1
tradehistory=1
windows_total=1

<expert>
name=MinimalistManager
path=Experts\SessionTerminal\MinimalistManager.ex5
expertmode=1
<inputs>
%(inputs)s
</inputs>
</expert>

<window>
height=100.000000
objects=0

<indicator>
name=Main
path=
apply=1
show_data=1
scale_inherit=0
scale_line=0
scale_line_percent=50
scale_line_value=0.000000
scale_fix_min=0
scale_fix_min_val=0.000000
scale_fix_max=0
scale_fix_max_val=0.000000
expertmode=0
fixed_height=-1
</indicator>
</window>
</chart>
"""


def write_profile(acc, ad):
    """MT5's chart set for this account, written fresh before every start: one M15 chart per symbol, each with the EA
    and that symbol's settings (multi-symbol, 23 Oct 2026). Charts opened by a start file were saved and piled up - one
    more EURUSD chart per restart - so the start file opens none now; MT5 opens this set (ProfileLast)."""
    pd = os.path.join(ad, "MQL5", "Profiles", "Charts", PROFILE)
    shutil.rmtree(pd, ignore_errors=True)
    os.makedirs(pd, exist_ok=True)
    for i, (sym, e) in enumerate(symbols(acc)):
        utf16(os.path.join(pd, "chart%02d.chr" % (i + 1)),
              CHART % {"id": 133846014025810000 + i + 1, "sym": sym, "inputs": "\n".join(inputs(acc, e))})


def prepare(acc):
    """The member's prefix and this account's portable MT5, EA and preset."""
    pre = prefix_of(acc)
    if not os.path.isdir(pre):
        os.makedirs(MEMBERS, exist_ok=True)
        shutil.rmtree(pre + ".tmp", ignore_errors=True)
        subprocess.run(["cp", "-a", TEMPLATE, pre + ".tmp"], check=True)      # a half copy is never taken for a prefix
        os.rename(pre + ".tmp", pre)
        as_st([pre])
    link_common(acc, pre)
    ad = adir_of(acc)
    if not os.path.isdir(ad):
        os.makedirs(os.path.dirname(ad), exist_ok=True)
        subprocess.run(["cp", "-a", os.path.join(pre, "drive_c", "Program Files", "MetaTrader 5"), ad], check=True)
    # MT5's own settings, saved once through its Options window on this host (23 Oct 2026): Algo Trading on, the two
    # "disable when changed" boxes off, and the EA's two web addresses - which MT5 only accepts in its own encrypted form,
    # so they cannot be written by hand. And the brokers' server lists (FTMO's), without which a fresh MT5 can't find
    # the account's server. Seeded into an account that lacks them (a prefix copied before the template had them).
    cfg = os.path.join(ad, "Config")
    os.makedirs(cfg, exist_ok=True)
    ci = os.path.join(cfg, "common.ini")
    try:
        has = os.path.exists(ci) and "WebRequestUrl=" in open(ci, "rb").read().decode("utf-16-le", "ignore")
    except Exception:
        has = False
    if not has and os.path.exists(SEED_COMMON):
        shutil.copyfile(SEED_COMMON, ci)
    sv = os.path.join(cfg, "servers.dat")
    if os.path.exists(SEED_SERVERS) and (not os.path.exists(sv) or os.path.getsize(sv) < os.path.getsize(SEED_SERVERS)):
        shutil.copyfile(SEED_SERVERS, sv)
    ex = os.path.join(ad, "MQL5", "Experts", "SessionTerminal")
    os.makedirs(ex, exist_ok=True)
    dst = os.path.join(ex, "MinimalistManager.ex5")
    if os.path.exists(EA_SRC) and (not os.path.exists(dst) or open(dst, "rb").read() != open(EA_SRC, "rb").read()):
        shutil.copyfile(EA_SRC, dst)
    write_profile(acc, ad)
    as_st([os.path.join(pre, "drive_c", "ST")])
    return ad


def link_common(acc, pre):
    """MT5's Common folder - where the copier's Lead and Follow EAs leave their files - is one folder per member,
    linked into each of the member's prefixes, so their accounts still find each other."""
    mq = os.path.join(pre, "drive_c", "users", "st", "AppData", "Roaming", "MetaQuotes")
    cm, shared = os.path.join(mq, "Terminal", "Common"), common_of(acc)
    if os.path.islink(cm):
        return
    os.makedirs(shared, exist_ok=True)
    if os.path.isdir(cm):                        # files written before the link: keep them
        subprocess.run(["cp", "-a", cm + "/.", shared], check=False)
        shutil.rmtree(cm)
    os.makedirs(os.path.dirname(cm), exist_ok=True)
    os.symlink(shared, cm)
    as_st([mq, shared])


def start_ini(acc, ad, password):
    p = os.path.join(ad, "st-start.ini")
    utf16(p, "\n".join([
        "[Common]", "Login=%s" % acc["login"], "Password=%s" % password, "Server=%s" % acc["server"],
        "NewsEnable=0", "ProxyEnable=0", "CertInstall=0",
        "[Experts]", "Enabled=1", "AllowLiveTrading=1", "AllowDllImport=0", "Account=0", "Profile=0",
        # no WebRequest lines here: MT5 keeps its allowed addresses encrypted in Config/common.ini (seeded by the agent),
        # and a plain list in the start file replaced them with nothing (23 Oct 2026)
        "[Charts]", "ProfileLast=%s" % PROFILE, "",
    ]))
    os.chmod(p, 0o600)
    subprocess.run(["chown", "st:st", p], check=False)
    return p


def running(login):
    """This account's MT5, if it runs - started by this agent or by an earlier run of it (MT5 outlives an agent restart)."""
    r = subprocess.run(["pgrep", "-u", "st", "-f", "drive_c/ST/%s/terminal64.exe" % safe(login)], capture_output=True, text=True)
    return [int(p) for p in r.stdout.split() if p.strip().isdigit()]


def alive(acc):
    s = state.get(acc["id"]) or {}
    pr = s.get("proc")
    if pr is not None and pr.poll() is None:
        return True
    return bool(running(acc["login"]))       # adopted: never a second MT5 for one account


def launch(acc):
    s = state.setdefault(acc["id"], {"fails": 0, "next": 0})
    if time.time() < s.get("next", 0):
        return
    try:
        password = decrypt(acc["enc_password"])
    except Exception:
        report(acc, "error", "The password could not be read. Remove the account and add it again.")
        s["next"] = time.time() + 3600
        return
    ad = prepare(acc)
    ini = start_ini(acc, ad, password)
    password = None
    env = dict(os.environ, WINEPREFIX=prefix_of(acc), WINEARCH="win64", WINEDEBUG="-all",
               WINEDLLOVERRIDES="mscoree,mshtml=", TZ=acc.get("tz") or "Europe/London", HOME="/home/st", USER="st")
    win_ini = "C:\\ST\\%s\\st-start.ini" % safe(acc["login"])
    cmd = ["runuser", "-u", "st", "--", "env"] + ["%s=%s" % kv for kv in env.items() if kv[0] in
           ("WINEPREFIX", "WINEARCH", "WINEDEBUG", "WINEDLLOVERRIDES", "TZ", "HOME", "USER")] + \
          ["xvfb-run", "-a", "-s", "-screen 0 1280x800x24", "/opt/st/run-in-x.sh", WINE, os.path.join(ad, "terminal64.exe"), "/portable",
           "/config:" + win_ini]
    s["proc"] = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    s["started"], s["ini"], s["syms"] = time.time(), ini, [x[0] for x in symbols(acc)]
    report(acc, "starting", "MT5 is starting")


def journal_lines(ad):
    """Today's and yesterday's MT5 journal, newest last (UTF-16)."""
    out = []
    for f in sorted(glob.glob(os.path.join(ad, "logs", "*.log")))[-2:]:
        try:
            out += open(f, "rb").read().decode("utf-16-le", "ignore").splitlines()
        except Exception:
            pass
    return out


def check(acc):
    s = state.get(acc["id"]) or {}
    ad = adir_of(acc)
    lines = journal_lines(ad)
    signed = any(("authorized on" in l) and str(acc["login"]) in l for l in lines[-400:])
    bad = next((l for l in reversed(lines[-200:]) if "authorization" in l.lower() and "failed" in l.lower()), None)
    if s.get("ini") and (signed or time.time() - s.get("started", 0) > BOOT_INI_TTL):
        try:
            os.remove(s["ini"])
        except FileNotFoundError:
            pass
        s["ini"] = None
    if bad and not signed:
        why = re.search(r"failed \(([^)]*)\)", bad)
        why = why.group(1) if why else "no reason given"
        if "invalid" in why.lower():
            report(acc, "error", "MT5 could not sign in (%s): check the login, password and server, then remove and add "
                                 "the account again." % why)
            stop(acc)
            s["next"] = time.time() + 6 * 3600
            return
        # the broker's own side - "Service is not available", "No connection" (his 70K on FTMO-Server4 the minute the
        # market closed, 23 Oct 2026): nothing wrong with the account, and MT5 keeps trying by itself, so leave it running
        report(acc, "starting", "%s is not letting anyone sign in right now (%s). MT5 keeps trying." % (acc["server"], why))
        return
    if signed:
        # the EA itself: it writes "MM alive" to its log every minute, so a log quiet for EA_QUIET means it stopped
        # (MT5 still signed in, nothing managing the trades) - say so and start MT5 again
        el = glob.glob(os.path.join(ad, "MQL5", "logs", "*.log"))
        quiet = (time.time() - max(os.path.getmtime(f) for f in el)) if el else None
        if time.time() - s.get("started", 0) > EA_QUIET and (quiet is None or quiet > EA_QUIET) and not fx_paused():
            report(acc, "error", "The EA stopped answering; MT5 is being started again.")
            stop(acc)
            s["fails"] = s.get("fails", 0) + 1
            s["next"] = time.time() + RESTART_BACKOFF[min(s["fails"] - 1, len(RESTART_BACKOFF) - 1)]
            return
        s["fails"] = 0
        report(acc, "running", "Signed in on %s" % acc["server"])


def stop(acc_or_id, wipe_dir=None):
    aid = acc_or_id["id"] if isinstance(acc_or_id, dict) else acc_or_id
    s = state.get(aid) or {}
    pr = s.get("proc")
    if pr is not None and pr.poll() is None:
        try:
            os.killpg(pr.pid, signal.SIGTERM)
            pr.wait(timeout=20)
        except Exception:
            try:
                os.killpg(pr.pid, signal.SIGKILL)
            except Exception:
                pass
    s["proc"] = None
    if s.get("login"):                         # also one adopted from an earlier run of the agent: its whole group
        end_groups(mt5_groups(s["login"]))
        subprocess.run(["pkill", "-u", "st", "-f", "drive_c/ST/%s/terminal64.exe" % safe(s["login"])], check=False)
        subprocess.run(["pkill", "-u", "st", "-f", "C:.ST.%s.terminal64.exe" % safe(s["login"])], check=False)
    if s.get("ini"):
        try:
            os.remove(s["ini"])
        except FileNotFoundError:
            pass
    if wipe_dir:
        wine_down(wipe_dir)
        subprocess.run(["pkill", "-f", wipe_dir], check=False)
        shutil.rmtree(wipe_dir, ignore_errors=True)


def mt5_groups(login):
    """The process groups an account's MT5 runs in. launch() starts each in a group of its own (xvfb-run, the screen, its
    window manager, MT5), so ending the group ends all of it. Ending MT5 by name alone also hit xvfb-run, whose command
    line names terminal64.exe, before it could close its screen: 7 empty screens were left on uk1 by 24 Oct 2026."""
    out = set()
    for pat in ("drive_c/ST/%s/terminal64.exe", "C:.ST.%s.terminal64.exe"):
        r = subprocess.run(["pgrep", "-u", "st", "-f", pat % safe(login)], capture_output=True, text=True)
        for pid in r.stdout.split():
            try:
                g = os.getpgid(int(pid))
            except Exception:
                continue
            if g > 1 and g != os.getpgrp():
                out.add(g)
    return out


def end_groups(groups, wait=20):
    for g in groups:
        try:
            os.killpg(g, signal.SIGTERM)
        except ProcessLookupError:
            pass
    t = time.time() + wait
    while groups and time.time() < t:
        groups = {g for g in groups if group_alive(g)}
        time.sleep(0.5)
    for g in groups:
        try:
            os.killpg(g, signal.SIGKILL)
        except ProcessLookupError:
            pass


def group_alive(g):
    """Any process of the group still running. A zombie (ended, not yet reaped by its parent) doesn't count: killpg(g, 0)
    still succeeds for one."""
    r = subprocess.run(["ps", "-e", "-o", "pgid=,stat="], capture_output=True, text=True)
    return any(f[0] == str(g) and not f[1].startswith("Z") for f in (ln.split() for ln in r.stdout.splitlines()) if len(f) == 2)


def wine_down(prefix):
    """A removed account's Wine (its wineserver, services, plugplay...): about 120 MB that outlived the folder before."""
    if os.path.isdir(os.path.join(prefix, "drive_c")):
        subprocess.run(["runuser", "-u", "st", "--", "env", "WINEPREFIX=" + prefix, os.path.join(os.path.dirname(WINE), "wineserver"),
                        "-k"], check=False, timeout=30)


def sweep():
    """Insurance for the leak mt5_groups() fixes: a screen whose launcher is gone (its Xvfb is the init's child) and with
    nothing but the screen and its window manager left in the group, for 5 minutes, is closed."""
    r = subprocess.run(["ps", "-u", "st", "-o", "pid=,ppid=,pgid=,etimes=,comm="], capture_output=True, text=True)
    groups = {}
    for ln in r.stdout.splitlines():
        f = ln.split(None, 4)
        if len(f) == 5 and f[2].isdigit():
            groups.setdefault(int(f[2]), []).append((int(f[1]), int(f[3]), f[4].strip()))
    for g, ps in groups.items():
        if g > 1 and g != os.getpgrp() and {x[2] for x in ps} <= {"Xvfb", "openbox"} and \
                any(x[2] == "Xvfb" and x[0] == 1 and x[1] > 300 for x in ps):
            try:
                os.killpg(g, signal.SIGTERM)
                log("closed a leftover screen, group", g)
            except ProcessLookupError:
                pass


def tick():
    accounts = api("GET", query="?host=" + HOST).get("accounts", [])
    want = {a["id"]: a for a in accounts}
    for aid in list(state):
        if aid not in want:                      # removed by the member: stop and delete everything of it
            d = state[aid].get("dir")
            stop(aid, wipe_dir=d)
            state.pop(aid, None)
            log("removed", aid)
    for a in accounts:
        s = state.setdefault(a["id"], {"fails": 0, "next": 0})
        s["dir"], s["login"] = prefix_of(a), a["login"]
        if not alive(a):
            if s.get("proc") is not None:        # it was running and stopped: back off before the next start
                s["fails"] = s.get("fails", 0) + 1
                s["next"] = time.time() + RESTART_BACKOFF[min(s["fails"] - 1, len(RESTART_BACKOFF) - 1)]
                s["proc"] = None
            if s.get("ini"):                     # MT5 died before signing in: its start file (the password) goes now,
                try:                             # not at the next start - check() only runs for a live MT5
                    os.remove(s["ini"])
                except FileNotFoundError:
                    pass
                s["ini"] = None
            launch(a)
        else:
            s.setdefault("started", time.time())  # adopted after an agent restart: the EA gets the same grace as a fresh start
            want = [x[0] for x in symbols(a)]
            if s.setdefault("syms", want) != want and not fx_paused():
                # the member changed the charts: MT5 opens its chart set at start, so start it again - while prices run, as
                # an EA before 9.12 started without a fresh price sent its candles minutes late
                report(a, "starting", "Opening your new charts")
                stop(a)
                s["syms"] = want
                continue
            check(a)
    # anything else under members/ - a removed account's prefix, the Common folder of a member with no account left
    keep = {prefix_of(a) for a in accounts} | {common_of(a) for a in accounts} | {x.get("dir") for x in state.values()}
    for d in glob.glob(os.path.join(MEMBERS, "*")):
        if d not in keep:
            wine_down(d)
            subprocess.run(["pkill", "-f", d], check=False)
            shutil.rmtree(d, ignore_errors=True)
            log("folder removed", d)
    sweep()


def hello():
    """Registers this server in cloud_hosts at its first start (24 Oct 2026, cloud/new-host.sh): its id, region, public key
    and the places its memory holds - each MT5 + EA takes ~650 MB all-in, 1.5 GB is kept for the system. A known server is
    left as it is; a different key for its id is refused (the stored passwords are sealed with the old one)."""
    try:
        pub = base64.b64encode(PRIV.public_key().public_bytes(serialization.Encoding.DER,
                                                              serialization.PublicFormat.SubjectPublicKeyInfo)).decode()
        mb = int(re.search(r"MemTotal:\s+(\d+)", open("/proc/meminfo").read()).group(1)) // 1024
        r = api("POST", {"op": "hello", "host": HOST, "region": CFG.get("region") or HOST, "public_key": pub,
                         "capacity": max(1, (mb - 1500) // 680)})
        log("hello:", json.dumps(r))
    except Exception as e:
        log("hello failed:", e)


def main():
    log("st-agent up, host", HOST)
    hello()
    while True:
        try:
            tick()
        except Exception as e:
            log("tick failed:", e)
        time.sleep(POLL)


if __name__ == "__main__":
    main()
