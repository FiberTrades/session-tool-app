#!/usr/bin/env bash
# Put a server-built Trade Manager EA (cloud/build-ea.sh) on the cloud MT5s, one account first (24 Oct 2026).
#
#   bash cloud/rollout-ea.sh one <login> [build]   that account only (a trial copy in /opt/st/ea/canary/<login>.ex5), its MT5 restarted
#   bash cloud/rollout-ea.sh all [build]           every account: the build becomes /opt/st/ea/MinimalistManager.ex5 (the old one kept
#                                                  as .prev), trial copies removed, each MT5 restarted one after another
#   bash cloud/rollout-ea.sh status                which build each account runs
#
# [build] is a file name in /opt/st/ea/builds (default latest.ex5). An MT5 is only restarted while the market is closed (the agent's
# fx_paused) unless NOW=1 is set - his live accounts manage real trades (never-test-on-real-accounts: the demo goes first). A restart is
# the agent's own path: the terminal's process group ends, the agent starts it again with the build copied in, and this waits for
# "running Signed in" (up to 3 minutes).
set -euo pipefail
OP=${1:?one <login> | all | status}
HOST=${ST_SRC:-81.0.249.218}
KEY=${ST_KEY:-$HOME/.ssh/st_cloud}
srv() { ssh -i "$KEY" -o BatchMode=yes -o ConnectTimeout=15 "root@$HOST" "$@"; }

if [ "$OP" = "status" ]; then
  srv 'for d in /home/st/members/*/drive_c/ST/*/MQL5/Experts/SessionTerminal/MinimalistManager.ex5; do lg=$(echo "$d" | sed "s#.*/ST/\([0-9]*\)/.*#\1#"); h=$(sha256sum "$d" | cut -c1-12);
    b=$(for f in /opt/st/ea/builds/MinimalistManager-*.ex5 /opt/st/ea/MinimalistManager.ex5; do [ "$(sha256sum "$f" | cut -c1-12)" = "$h" ] && basename "$f" && break; done);
    echo "$lg  ${b:-unknown build} ($h)$( [ -f /opt/st/ea/canary/$lg.ex5 ] && echo "  [trial copy]")"; done'
  exit 0
fi

if [ "$OP" = "one" ]; then LOGINS=${2:?login}; BUILD=${3:-latest.ex5}; else BUILD=${2:-latest.ex5}; LOGINS=""; fi
srv "test -f /opt/st/ea/builds/$BUILD" || { echo "no build /opt/st/ea/builds/$BUILD"; exit 1; }
PAUSED=$(srv 'cd /opt/st && python3 -c "import importlib.util as u; s=u.spec_from_file_location(\"a\",\"/opt/st/st_agent.py\"); m=u.module_from_spec(s); s.loader.exec_module(m); print(1 if m.fx_paused() else 0)"')
if [ "$PAUSED" != "1" ] && [ "${NOW:-0}" != "1" ]; then echo "The market is open: no MT5 is restarted now. Run again with the market closed, or NOW=1 with Nestor's OK."; exit 2; fi

if [ "$OP" = "one" ]; then
  srv "mkdir -p /opt/st/ea/canary && cp \"/opt/st/ea/builds/$BUILD\" /opt/st/ea/canary/$LOGINS.ex5 && echo trial copy for $LOGINS: $BUILD"
elif [ "$OP" = "all" ]; then
  srv "cp /opt/st/ea/MinimalistManager.ex5 /opt/st/ea/MinimalistManager.ex5.prev && cp \"/opt/st/ea/builds/$BUILD\" /opt/st/ea/MinimalistManager.ex5 && rm -f /opt/st/ea/canary/*.ex5 && echo 'all accounts: $BUILD, the previous one kept as MinimalistManager.ex5.prev'"
  LOGINS=$(srv 'ls -d /home/st/members/*/drive_c/ST/* 2>/dev/null | sed "s#.*/ST/##" | sort -u | tr "\n" " "')
else
  echo "usage: one <login> [build] | all [build] | status"; exit 1
fi

for lg in $LOGINS; do
  echo "== restarting $lg"
  srv "pid=\$(pgrep -u st -f \"ST/$lg/terminal64.exe\" | head -1); if [ -n \"\$pid\" ]; then g=\$(ps -o pgid= -p \$pid | tr -d ' '); kill -TERM -- -\$g; echo ended group \$g; else echo 'not running (the agent starts it)'; fi"
  T0=$(date +%s); OKL=""
  for i in $(seq 1 36); do
    sleep 5
    OKL=$(srv "journalctl -u st-agent --since '-$(( $(date +%s) - T0 + 2 ))s' --no-pager -o cat | grep \"$lg running Signed in\" | tail -1" || true)
    [ -n "$OKL" ] && break
  done
  if [ -n "$OKL" ]; then echo "$OKL  ($(( $(date +%s) - T0 )) s)"; else echo "$lg did not report signed in within 3 minutes: check journalctl -u st-agent"; exit 3; fi
done
bash "$0" status
