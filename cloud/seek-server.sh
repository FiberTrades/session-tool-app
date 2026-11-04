#!/usr/bin/env bash
# Find one broker's server for the cloud MT5s (4 Nov 2026, Nestor: "make sure when a user adds a new broker server the app works to find
# it and recognize it"). Troy's Tradeify account sat on "starting" because MT5 knows a server only through its list. The agent runs this on
# uk1 when an account that has never signed in can't reach its server:
#
#   /opt/st/seek-server.sh TradeifyVenturesFX-Server
#
# In the THROWAWAY MT5 (/home/st/probe: no account, no login, never a member's), starting from today's list, it searches MT5's own company
# search for the names in the server's name. A list that grew replaces /opt/st/servers-all.dat; the agent's reseed() then gives it to the
# accounts that have never signed in, and starts them again. Accounts that have signed in are never touched. Exit: 0 grew, 2 nothing new.
set -euo pipefail
NAME=${1:-}
# a member typed this, and it reaches a shell and a keyboard: letters, digits, space . _ - only
[[ "$NAME" =~ ^[A-Za-z0-9][A-Za-z0-9\ ._-]{1,63}$ ]] || { echo "bad server name"; exit 3; }
exec >>/var/log/st-seek.log 2>&1
exec 9>/run/st-seek.lock; flock 9          # one search at a time: one throwaway MT5, one display
echo "== $(date -u +%FT%TZ) $NAME"
HERE=$(dirname "$(readlink -f "$0")"); M="$HERE/mt5x.sh"; LIST=/opt/st/servers-all.dat
P=/home/st/probe; A=$P/drive_c/ST/probe
[ -f "$A/terminal64.exe" ] && [ -f "$LIST" ] || { echo "no throwaway MT5 or no list"; exit 3; }
mkdir -p "$A/Config"; cp "$LIST" "$A/Config/servers.dat"; cp /opt/st/seed-common.ini "$A/Config/common.ini"; chown -R st:st "$A/Config"
BASE0=$(stat -c %s "$LIST")

# TradeifyVenturesFX-Server: TradeifyVenturesFX, Tradeify Ventures FX, Tradeify Ventures, Tradeify
BASE=${NAME%%[- ]*}
WORDS=$(printf '%s' "$BASE" | sed -E 's/([a-z0-9])([A-Z])/\1 \2/g; s/([A-Z]+)([A-Z][a-z])/\1 \2/g')
TWO=$(printf '%s' "$WORDS" | awk '{print $1, $2}' | sed 's/ *$//'); ONE=$(printf '%s' "$WORDS" | awk '{print $1}')
TERMS=("$BASE"); [ "$WORDS" != "$BASE" ] && TERMS+=("$WORDS"); [ "$TWO" != "$WORDS" ] && TERMS+=("$TWO"); [ ${#ONE} -ge 4 ] && [ "$ONE" != "$TWO" ] && TERMS+=("$ONE")

bash "$M" start
trap 'bash "$M" stop || true' EXIT
bash "$M" key Escape; sleep 1              # the login prompt MT5 shows when no account is saved
bash "$M" click 22 41; sleep 1             # File
bash "$M" click 76 344; sleep 6            # Open an Account
for term in "${TERMS[@]}"; do
  bash "$M" click 575 248; bash "$M" key ctrl+a BackSpace; bash "$M" type "$term"
  bash "$M" click 906 248; sleep 7
  echo "$term -> $(stat -c %s "$A/Config/servers.dat") bytes"
  [ "$(stat -c %s "$A/Config/servers.dat")" -gt "$BASE0" ] && break   # found: a shorter name would only bring in other companies
done
bash "$M" click 937 652; sleep 1           # Cancel
trap - EXIT; bash "$M" stop
N=$(stat -c %s "$A/Config/servers.dat")
if [ "$N" -le "$BASE0" ]; then echo "nothing new for $NAME ($BASE0 -> $N bytes)"; exit 2; fi
cp "$LIST" "$LIST.prev"
cp "$A/Config/servers.dat" "$LIST.new"; chmod 644 "$LIST.new"; mv "$LIST.new" "$LIST"
echo "list grew for $NAME: $BASE0 -> $N bytes"
