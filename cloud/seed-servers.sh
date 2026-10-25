#!/usr/bin/env bash
# Rebuild the cloud MT5's server list (/opt/st/servers-all.dat) from MT5's own company search (25 Oct 2026, Nestor: "adding that
# broker's server list to the cloud setup ... yes do it"). Run from the repo on the PC that holds the st_cloud SSH key (Git Bash):
#
#   bash cloud/seed-servers.sh
#
# Why: a cloud MT5 finds a server only through Config/servers.dat. With FTMO's list alone, an ICMarketsSC-Demo account never even
# tried to connect (tested on uk1, 25 Oct 2026); with the merged list it reached the server. On uk1 this starts a THROWAWAY portable
# MT5 (/home/st/probe, copied from the template - never a member's prefix, no account, no login), opens File > Open an Account and
# searches each name in cloud/seed/brokers.txt: MT5 writes every company it finds, with its demo and live servers, into servers.dat.
# The result replaces /opt/st/servers-all.dat (the previous one kept as servers-all.dat.prev; FTMO's own list stays as
# servers-ftmo.dat). The agent copies it into every NEW account (prepare()); accounts already running keep their own list.
set -euo pipefail
HOST=${ST_SRC:-81.0.249.218}
KEY=${ST_KEY:-$HOME/.ssh/st_cloud}
DIR=$(cd "$(dirname "$0")" && pwd)
SSHO=(-i "$KEY" -o BatchMode=yes -o ConnectTimeout=15)
srv() { ssh "${SSHO[@]}" "root@$HOST" "$@"; }
scp -q "${SSHO[@]}" "$DIR/seed/mt5x.sh" "$DIR/seed/brokers.txt" "root@$HOST:/root/"
srv 'set -e
P=/home/st/probe; A=$P/drive_c/ST/probe
[ -d "$P/drive_c" ] || cp -a /home/st/mt5-template "$P"
mkdir -p "$A"; [ -f "$A/terminal64.exe" ] || cp -a "$P/drive_c/Program Files/MetaTrader 5/." "$A/"
mkdir -p "$A/Config"; cp /opt/st/servers-ftmo.dat "$A/Config/servers.dat"; cp /opt/st/seed-common.ini "$A/Config/common.ini"
chown -R st:st "$P"
bash /root/mt5x.sh start
bash /root/mt5x.sh key Escape; sleep 1               # the login prompt MT5 shows when no account is saved
bash /root/mt5x.sh click 22 41; sleep 1             # File
bash /root/mt5x.sh click 76 344; sleep 6            # Open an Account
while IFS= read -r name; do
  [ -z "$name" ] && continue; case "$name" in \#*) continue;; esac
  bash /root/mt5x.sh click 575 248; bash /root/mt5x.sh key ctrl+a BackSpace; bash /root/mt5x.sh type "$name"
  bash /root/mt5x.sh click 906 248; sleep 7
  echo "$name -> $(stat -c %s "$A/Config/servers.dat") bytes"
done < /root/brokers.txt
bash /root/mt5x.sh click 937 652; sleep 1           # Cancel
bash /root/mt5x.sh stop
N=$(stat -c %s "$A/Config/servers.dat")
[ "$N" -gt 100000 ] || { echo "the list did not grow ($N bytes): nothing replaced"; exit 3; }
[ -f /opt/st/servers-all.dat ] && cp /opt/st/servers-all.dat /opt/st/servers-all.dat.prev
cp "$A/Config/servers.dat" /opt/st/servers-all.dat; chmod 644 /opt/st/servers-all.dat
ls -la /opt/st/servers-*.dat'
