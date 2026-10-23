#!/usr/bin/env python3
"""Session Terminal cloud MT5 agent (23 Oct 2026). Runs as root under systemd (st-agent.service).

Every few seconds it asks cloud-agent (Supabase edge function) which MT5 accounts this host should run, and makes it so:

  - a member gets their own Wine prefix (/home/st/members/<user>), copied from the clean MT5 template, so all of a
    member's accounts share one Common folder - the EA's Lead/Follow copier talks through files there;
  - each account runs its own portable MT5 (C:\\ST\\<login>) with the Session Terminal EA on a chart, its sync token
    and App trading set from the start, in the member's own time zone (the EA's daily reset follows the clock);
  - the MT5 password arrives encrypted with this host's public key; it is opened here, written into the terminal's
    start file only for the moment MT5 starts, and that file is deleted once MT5 has signed in (or after 2 minutes);
  - an account that is no longer asked for is stopped and its folder deleted; a member with none left loses the prefix;
  - what happened is reported back: starting, running (signed in), error (with MT5's own reason).

Nothing here ever places or changes a trade: MT5 and the EA do what the member does in the app.
"""
import base64, glob, hashlib, json, os, re, shutil, signal, subprocess, sys, time, urllib.request

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

CFG = json.load(open("/etc/st-agent/config.json"))
HOST, URL, KEY = CFG["host"], CFG["url"], CFG["key"]
PRIV = serialization.load_pem_private_key(open("/etc/st-agent/host_key.pem", "rb").read(), password=None)
TEMPLATE = "/home/st/mt5-template"
WINE = "/opt/wine-staging/bin/wine"      # staging in Windows 11 mode: stable Wine trips MT5's debugger check since 18 Oct 2026
MEMBERS = "/home/st/members"
EA_SRC = "/opt/st/ea/MinimalistManager.ex5"
EA_NAME = "SessionTerminal\\MinimalistManager"      # under MQL5\Experts
SEED_COMMON = "/opt/st/seed-common.ini"      # MT5's saved settings, see prepare()
SEED_SERVERS = "/opt/st/servers-ftmo.dat"     # FTMO's server list
POLL = 10
HEARTBEAT = 60              # seconds between status reports while nothing changes
EA_QUIET = 300              # the EA writes "MM alive" to its log every minute: 5 minutes of silence = it stopped
BOOT_INI_TTL = 120          # seconds the start file (with the password) may live
RESTART_BACKOFF = [10, 30, 60, 300, 900]

state = {}                  # account id -> {"proc", "started", "fails", "next", "status", "ini"}


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
    return os.path.join(MEMBERS, safe(acc["user"]))


def adir_of(acc):
    return os.path.join(prefix_of(acc), "drive_c", "ST", safe(acc["login"]))


def as_st(cmd):
    subprocess.run(["chown", "-R", "st:st"] + cmd, check=False)


def utf16(path, text):
    with open(path, "wb") as f:
        f.write(b"\xff\xfe" + text.replace("\n", "\r\n").encode("utf-16-le"))


def preset(acc):
    """The EA's inputs: the sync token, App trading, and the settings this account's EA last reported - from the PC it
    ran on before, or from this server (23 Oct 2026, "settings follow the account": a fresh MT5 has none of the panel's
    saved state, and the EA would start on factory risk). Partial-close shares live only in the panel and don't carry."""
    ln = ["InpSyncToken=%s" % (acc.get("token") or ""), "InpAppTrade=%s" % ("true" if acc.get("app_trading") else "false")]
    e = acc.get("ea") or {}
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
    return "\n".join(ln) + "\n"


def prepare(acc):
    """The member's prefix and this account's portable MT5, EA and preset."""
    pre = prefix_of(acc)
    if not os.path.isdir(pre):
        os.makedirs(MEMBERS, exist_ok=True)
        subprocess.run(["cp", "-a", TEMPLATE, pre], check=True)
        as_st([pre])
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
    pr = os.path.join(ad, "MQL5", "Presets")
    os.makedirs(pr, exist_ok=True)
    utf16(os.path.join(pr, "st-cloud.set"), preset(acc))
    as_st([os.path.join(pre, "drive_c", "ST")])
    return ad


def start_ini(acc, ad, password):
    p = os.path.join(ad, "st-start.ini")
    utf16(p, "\n".join([
        "[Common]", "Login=%s" % acc["login"], "Password=%s" % password, "Server=%s" % acc["server"],
        "NewsEnable=0", "ProxyEnable=0", "CertInstall=0",
        "[Experts]", "Enabled=1", "AllowLiveTrading=1", "AllowDllImport=0", "Account=0", "Profile=0",
        # no WebRequest lines here: MT5 keeps its allowed addresses encrypted in Config/common.ini (seeded by the agent),
        # and a plain list in the start file replaced them with nothing (23 Oct 2026)
        "[StartUp]", "Expert=%s" % EA_NAME, "ExpertParameters=st-cloud.set", "Symbol=EURUSD", "Period=M15", "",
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
    s["started"], s["ini"] = time.time(), ini
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
        reason = "Invalid account" if "invalid account" in bad.lower() else "MT5 could not sign in"
        report(acc, "error", reason + ": check the login, password and server, then remove and add the account again.")
        stop(acc)
        s["next"] = time.time() + 6 * 3600
        return
    if signed:
        # the EA itself: it writes "MM alive" to its log every minute, so a log quiet for EA_QUIET means it stopped
        # (MT5 still signed in, nothing managing the trades) - say so and start MT5 again
        el = glob.glob(os.path.join(ad, "MQL5", "logs", "*.log"))
        quiet = (time.time() - max(os.path.getmtime(f) for f in el)) if el else None
        if time.time() - s.get("started", 0) > EA_QUIET and (quiet is None or quiet > EA_QUIET):
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
    if s.get("login"):                         # also one adopted from an earlier run of the agent
        subprocess.run(["pkill", "-u", "st", "-f", "drive_c/ST/%s/terminal64.exe" % safe(s["login"])], check=False)
        subprocess.run(["pkill", "-u", "st", "-f", "C:.ST.%s.terminal64.exe" % safe(s["login"])], check=False)
    if s.get("ini"):
        try:
            os.remove(s["ini"])
        except FileNotFoundError:
            pass
    if wipe_dir:
        subprocess.run(["pkill", "-f", wipe_dir], check=False)
        shutil.rmtree(wipe_dir, ignore_errors=True)


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
        s["dir"], s["login"] = adir_of(a), a["login"]
        if not alive(a):
            if s.get("proc") is not None:        # it was running and stopped: back off before the next start
                s["fails"] = s.get("fails", 0) + 1
                s["next"] = time.time() + RESTART_BACKOFF[min(s["fails"] - 1, len(RESTART_BACKOFF) - 1)]
                s["proc"] = None
            launch(a)
        else:
            check(a)
    # members with no account left: their prefix goes too
    users = {safe(a["user"]) for a in accounts}
    for d in glob.glob(os.path.join(MEMBERS, "*")):
        if os.path.basename(d) not in users and not any(os.path.dirname(os.path.dirname(os.path.dirname(x.get("dir") or ""))) == d for x in state.values()):
            subprocess.run(["pkill", "-f", d], check=False)
            shutil.rmtree(d, ignore_errors=True)
            log("member folder removed", d)


def main():
    log("st-agent up, host", HOST)
    while True:
        try:
            tick()
        except Exception as e:
            log("tick failed:", e)
        time.sleep(POLL)


if __name__ == "__main__":
    main()
