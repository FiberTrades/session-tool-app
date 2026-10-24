#!/usr/bin/env bash
# Compile the Trade Manager EA on the cloud server (24 Oct 2026, Nestor: "yes set it up" - nobody compiles by hand any more).
# Run from the repo on the PC that holds the st_cloud SSH key (Git Bash):
#
#   bash cloud/build-ea.sh            the working copy of ea/MinimalistManager.mq5
#   bash cloud/build-ea.sh HEAD~1     that commit's source instead
#
# On uk1 it keeps a build MT5 of its own (/home/st/build: a Wine prefix copied from the MT5 template once, with MetaEditor and the
# standard library), apart from every member's MT5, so a compile never touches a running account. MetaEditor's own log decides:
# "0 errors" or the build stops with the errors printed. A good build is kept as /opt/st/ea/builds/MinimalistManager-<version>-
# <time>.ex5 (builds/latest.ex5 points at it) - nothing is rolled out from here: cloud/rollout-ea.sh does that, the demo first.
set -euo pipefail
REV=${1:-}
HOST=${ST_SRC:-81.0.249.218}
KEY=${ST_KEY:-$HOME/.ssh/st_cloud}
DIR=$(cd "$(dirname "$0")/.." && pwd)
SSHO=(-i "$KEY" -o BatchMode=yes -o ConnectTimeout=15)
srv() { ssh "${SSHO[@]}" "root@$HOST" "$@"; }

TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT
if [ -n "$REV" ]; then git -C "$DIR" show "$REV:ea/MinimalistManager.mq5" > "$TMP"; else cp "$DIR/ea/MinimalistManager.mq5" "$TMP"; fi
VER=$(grep -m1 -o '#property version *"[0-9.]*"' "$TMP" | grep -o '[0-9.]*' | tail -1)
echo "== source: ${REV:-working copy}, version $VER"

echo "== the build MT5 (made once)"
srv 'set -e
B=/home/st/build; A="$B/drive_c/ST/build"
if [ ! -f "$A/MetaEditor64.exe" ]; then
  [ -d "$B/drive_c" ] || cp -a /home/st/mt5-template "$B"
  mkdir -p "$A"
  cp -a "$B/drive_c/Program Files/MetaTrader 5/." "$A/"
  INC=$(ls -d /home/st/members/*/drive_c/ST/*/MQL5/Include 2>/dev/null | head -1)
  [ -n "$INC" ] || { echo "no MQL5 standard library to copy (no member MT5 has run yet)"; exit 3; }
  mkdir -p "$A/MQL5" && cp -a "$INC" "$A/MQL5/Include"
  chown -R st:st "$B"
  echo "made $A"
else
  echo "ready"
fi
mkdir -p "$A/MQL5/Experts/SessionTerminal" /opt/st/ea/builds'
scp -q "${SSHO[@]}" "$TMP" "root@$HOST:/home/st/build/drive_c/ST/build/MQL5/Experts/SessionTerminal/MinimalistManager.mq5"

echo "== compile"
srv 'set -e
A=/home/st/build/drive_c/ST/build; E="$A/MQL5/Experts/SessionTerminal"
rm -f "$E/MinimalistManager.ex5" "$A/build.log"; chown -R st:st "$E"
runuser -u st -- env WINEPREFIX=/home/st/build WINEARCH=win64 WINEDEBUG=-all WINEDLLOVERRIDES="mscoree,mshtml=" HOME=/home/st USER=st \
  timeout 240 xvfb-run -a /opt/wine-staging/bin/wine "C:\\ST\\build\\MetaEditor64.exe" /portable \
  "/compile:C:\\ST\\build\\MQL5\\Experts\\SessionTerminal\\MinimalistManager.mq5" "/log:C:\\ST\\build\\build.log" >/dev/null 2>&1 || true
runuser -u st -- env WINEPREFIX=/home/st/build /opt/wine-staging/bin/wineserver -k >/dev/null 2>&1 || true
[ -f "$A/build.log" ] || { echo "MetaEditor wrote no log"; exit 4; }
iconv -f utf-16le -t utf-8 "$A/build.log" 2>/dev/null | tr -d "\r" | grep -iv "^$" | grep -i "error\|warning\|result" | tail -25'
OK=$(srv 'A=/home/st/build/drive_c/ST/build; iconv -f utf-16le -t utf-8 "$A/build.log" 2>/dev/null | tr -d "\r" | grep -ci "result: 0 errors" || true')
if [ "$OK" = "0" ] || ! srv 'test -s /home/st/build/drive_c/ST/build/MQL5/Experts/SessionTerminal/MinimalistManager.ex5'; then
  echo; echo "BUILD FAILED: see the errors above"; exit 1
fi
STAMP=$(date -u +%Y%m%d-%H%M)
OUT="MinimalistManager-$VER-$STAMP.ex5"
srv "cp /home/st/build/drive_c/ST/build/MQL5/Experts/SessionTerminal/MinimalistManager.ex5 /opt/st/ea/builds/$OUT && ln -sfn /opt/st/ea/builds/$OUT /opt/st/ea/builds/latest.ex5 && sha256sum /opt/st/ea/builds/$OUT | cut -c1-16 && ls -la /opt/st/ea/builds/$OUT | awk '{print \$5\" bytes\"}'"
echo; echo "BUILT: /opt/st/ea/builds/$OUT (version $VER). Roll it out with cloud/rollout-ea.sh - the demo first."
