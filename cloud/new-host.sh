#!/usr/bin/env bash
# A new cloud MT5 server, ready in about 15-20 minutes (24 Oct 2026, Nestor: "a ready-made setup so a new server is running
# in about 30 minutes"). Run from the repo on the PC that holds the st_cloud SSH key (Git Bash):
#
#   bash cloud/new-host.sh <ip> <host-id> "<region>"
#   e.g. bash cloud/new-host.sh 81.0.249.99 uk2 "United Kingdom (Contabo, Portsmouth)"
#
# Before: buy the server (Contabo Cloud VPS 6, Ubuntu 24.04, UK) with the st_cloud SSH key for root (Contabo: the order's
# or Reinstall > Advanced > SSH key). Then this:
#   1. checks both servers answer (the new one and uk1, the source),
#   2. runs setup-base.sh on it (packages, keys-only SSH, firewall, user st, the two pinned Wines),
#   3. copies from uk1, server to server: the MT5 template (with MT5's saved settings and the EA's two web addresses, which MT5
#      only stores encrypted - set once by hand on uk1, see README), the brokers' server lists, the EA build, the agent secret
#      (it never passes through this PC) - over a one-off key that is removed again at the end,
#   4. installs the agent from this repo and makes the server's own key pair (only it can open the passwords sealed for it),
#   5. starts the agent, which registers the server in cloud_hosts itself (cloud-agent "hello") with the places its memory
#      holds - from then on st_cloud_pick_host sends new accounts to whichever server has the most room,
#   6. shows the agent's first lines: "hello: ... registered".
# Safe to run again: each step skips what is already there, and an existing host key is never replaced (the passwords
# stored for that server are sealed with it).
set -euo pipefail
NEW=${1:?usage: bash cloud/new-host.sh <ip> <host-id> "<region>"}
HID=${2:?host id, e.g. uk2}
REGION=${3:-$HID}
SRC=${ST_SRC:-81.0.249.218}          # uk1, where the template comes from
KEY=${ST_KEY:-$HOME/.ssh/st_cloud}
[[ $HID =~ ^[a-z0-9-]{1,32}$ ]] || { echo "host id: lowercase letters, digits and dashes (e.g. uk2)"; exit 1; }
[[ $REGION =~ ^[A-Za-z0-9\ \(\),.-]{1,80}$ ]] || { echo "region: letters, digits, spaces and ( ) , . - only"; exit 1; }
[[ $NEW != "$SRC" ]] || { echo "that is uk1 itself"; exit 1; }
DIR=$(cd "$(dirname "$0")" && pwd)
SSHO=(-i "$KEY" -o StrictHostKeyChecking=accept-new -o BatchMode=yes -o ConnectTimeout=15)
new() { ssh "${SSHO[@]}" "root@$NEW" "$@"; }
src() { ssh "${SSHO[@]}" "root@$SRC" "$@"; }
put() { scp -q "${SSHO[@]}" "$1" "root@$NEW:$2"; }
t0=$(date +%s); step() { echo; echo "== $1  ($(( ($(date +%s) - t0) / 60 )) min)"; }

step "1/6 both servers answer"
new true && echo "new server $NEW: ok"
src true && echo "source $SRC: ok"
if new 'test -f /etc/st-agent/host_key.pem'; then echo "(it already has a host key: finishing what is missing)"; fi

step "2/6 base setup (packages, firewall, user st, Wine) - the long one, ~10 min"
put "$DIR/setup-base.sh" /root/setup-base.sh
new 'bash /root/setup-base.sh' | grep -E '^==|wine-' || true
new 'id st >/dev/null && test -x /opt/wine-staging/bin/wine' || { echo "setup-base did not finish: see /root on the new server"; exit 1; }

step "3/6 the MT5 template and settings from uk1, server to server"
cleanup() {
  new "sed -i '/st-push-temp/d' /root/.ssh/authorized_keys" 2>/dev/null || true
  src 'rm -f /root/.ssh/st_push /root/.ssh/st_push.pub' 2>/dev/null || true
}
trap cleanup EXIT
if new 'test -f /home/st/mt5-template/.st-copied'; then
  echo "template already copied"
else
  src 'rm -f /root/.ssh/st_push /root/.ssh/st_push.pub && ssh-keygen -q -t ed25519 -N "" -f /root/.ssh/st_push -C st-push-temp'
  PUB=$(src 'cat /root/.ssh/st_push.pub')
  new "mkdir -p /root/.ssh && touch /root/.ssh/authorized_keys && sed -i '/st-push-temp/d' /root/.ssh/authorized_keys && echo '$PUB' >> /root/.ssh/authorized_keys"
  src "tar -C / -cf - home/st/mt5-template opt/st/seed-common.ini opt/st/servers-ftmo.dat opt/st/ea etc/st-agent/config.json etc/st-agent/agent.key etc/st-agent/extra-symbols.json \
       | ssh -i /root/.ssh/st_push -o StrictHostKeyChecking=accept-new -o BatchMode=yes root@$NEW 'mkdir -p /etc/st-agent /opt/st && tar -C / -xpf -'"
  new 'chown -R st:st /home/st/mt5-template && chmod 700 /etc/st-agent && chmod 600 /etc/st-agent/config.json /etc/st-agent/agent.key && touch /home/st/mt5-template/.st-copied'
  new 'du -sh /home/st/mt5-template | cut -f1' | sed 's/^/template: /'
fi
cleanup; trap - EXIT

step "4/6 the agent, its host id and the server's own key pair"
new 'mkdir -p /opt/st'
put "$DIR/agent/st_agent.py" /opt/st/st_agent.py
put "$DIR/agent/run-in-x.sh" /opt/st/run-in-x.sh
put "$DIR/agent/stx" /usr/local/bin/stx
put "$DIR/agent/st-agent.service" /etc/systemd/system/st-agent.service
new 'chmod 755 /opt/st/st_agent.py /opt/st/run-in-x.sh /usr/local/bin/stx'
new "python3 - '$HID' '$REGION'" <<'PY'
import json, sys
p = "/etc/st-agent/config.json"
c = json.load(open(p))
c["host"], c["region"] = sys.argv[1], sys.argv[2]
open(p, "w").write(json.dumps(c))
print("config: host", c["host"], "-", c["region"])
PY
new 'test -f /etc/st-agent/host_key.pem || (umask 077 && openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out /etc/st-agent/host_key.pem 2>/dev/null)'
new python3 - <<'PY'
import base64
from cryptography.hazmat.primitives import serialization
k = serialization.load_pem_private_key(open("/etc/st-agent/host_key.pem", "rb").read(), password=None)
pub = base64.b64encode(k.public_key().public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)).decode()
open("/etc/st-agent/host_pub.b64", "w").write(pub)
print("host key: RSA", k.key_size)
PY

step "5/6 start the agent (it registers the server itself)"
new 'systemctl daemon-reload && systemctl enable st-agent >/dev/null 2>&1 && systemctl restart st-agent'
sleep 10

step "6/6 the agent's first lines"
new 'journalctl -u st-agent -n 8 --no-pager -o cat'
if new 'journalctl -u st-agent -n 30 --no-pager -o cat | grep -q "hello: .*\(registered\|known\)"'; then
  echo; echo "READY: $HID ($NEW) is in cloud_hosts. New cloud accounts go to whichever server has the most room."
else
  echo; echo "The agent did not confirm its hello yet: check 'journalctl -u st-agent' on $NEW."; exit 1
fi
