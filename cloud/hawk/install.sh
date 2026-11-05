#!/bin/sh
# Installs the hawk on uk1 as the st-hawk service (5 Nov 2026). Run as root from a folder holding hawk.py + engine.py:
#   sh install.sh <HAWK_KEY>
# The same key must be set as the st-hawk function secret:  supabase secrets set HAWK_KEY=<key> --project-ref figozyxoyobixadhqewr
# Read-only on the market: it only sends `watch`/`hist` to the local relay for the demo (1515070952), never commands or orders.
set -e
[ -n "$1" ] || { echo "usage: sh install.sh <HAWK_KEY>"; exit 1; }
mkdir -p /opt/st/hawk
cp hawk.py engine.py /opt/st/hawk/
umask 077
printf 'HAWK_KEY=%s\n' "$1" > /etc/st-hawk.env
chmod 600 /etc/st-hawk.env
cat > /etc/systemd/system/st-hawk.service <<'EOF'
[Unit]
Description=Session Terminal hawk - the admin's live ST Method alerts (read-only)
After=network-online.target st-relay.service

[Service]
EnvironmentFile=/etc/st-hawk.env
WorkingDirectory=/opt/st/hawk
ExecStart=/usr/bin/python3 -u /opt/st/hawk/hawk.py live
Restart=always
RestartSec=20

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now st-hawk
sleep 3
systemctl --no-pager status st-hawk | head -12
journalctl -u st-hawk -n 10 --no-pager
