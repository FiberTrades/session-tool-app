#!/usr/bin/env bash
# Session Terminal cloud MT5 host - base setup (Ubuntu 24.04). Run as root, once.
# 23 Oct 2026: the server that runs members' MT5 + the Session Terminal EA 24/7 (see cloud/README.md).
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo "== packages"
apt-get update -q
apt-get -y -q -o Dpkg::Options::=--force-confold upgrade
# python3-cryptography + openssl: the agent's key pair; openbox: each terminal's window manager (agent/run-in-x.sh - without
# one MT5's menus draw black, 23 Oct 2026); xdotool, x11-apps, imagemagick: stx (drive or screenshot a terminal)
apt-get -y -q install ufw fail2ban unattended-upgrades xvfb xauth cabextract wget curl jq ca-certificates gnupg \
  python3 python3-venv python3-pip python3-nacl python3-cryptography htop openbox xdotool x11-apps imagemagick openssl

echo "== ssh: keys only"
cat > /etc/ssh/sshd_config.d/10-st-keys-only.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
EOF
systemctl reload ssh || systemctl reload sshd

echo "== firewall: ssh only"
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw --force enable

echo "== automatic security updates"
dpkg-reconfigure -f noninteractive unattended-upgrades
systemctl enable --now fail2ban

echo "== clock: UTC (each terminal runs in its member's own time zone)"
timedatectl set-timezone UTC

echo "== the user that runs the terminals (no password, no sudo)"
id st >/dev/null 2>&1 || useradd -m -s /bin/bash st

echo "== Wine (WineHQ stable)"
dpkg --add-architecture i386
mkdir -pm755 /etc/apt/keyrings
wget -q -O /etc/apt/keyrings/winehq-archive.key https://dl.winehq.org/wine-builds/winehq.key
wget -q -NP /etc/apt/sources.list.d/ https://dl.winehq.org/wine-builds/ubuntu/dists/noble/winehq-noble.sources
apt-get update -q
# Wine 10, held there: Wine 11 trips MT5's copy protection ("A debugger has been found running in your system"),
# seen on this server 23 Oct 2026 and reported on the MQL5 forum.
V=10.0.0.0~noble-1
apt-get -y -q install --allow-downgrades --install-recommends winehq-stable=$V wine-stable=$V wine-stable-amd64=$V wine-stable-i386=$V
apt-mark hold winehq-stable wine-stable wine-stable-amd64 wine-stable-i386
wine --version
# ...and Wine STAGING 11.20 beside it, which is what runs MT5: an MT5 update on 18 Oct 2026 made the terminal itself report
# that debugger under Wine 9/10 stable too (MQL5 forum 518725). Staging in Windows 11 mode starts it (tested 23 Oct 2026).
S=11.20~noble-1
apt-get -y -q install wine-staging=$S wine-staging-amd64=$S wine-staging-i386=$S
apt-mark hold wine-staging wine-staging-amd64 wine-staging-i386
/opt/wine-staging/bin/wine --version

echo "== done"
