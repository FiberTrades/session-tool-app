#!/bin/bash
# Drives the THROWAWAY MT5 (/home/st/probe) on display :77 - used by cloud/seed-servers.sh, never a member's MT5.
#   mt5x.sh start | shot <name> | key <keys...> | type <text> | click <x> <y> | wins | stop
P=/home/st/probe; A=$P/drive_c/ST/probe; D=:77
xa() { ls -t /tmp/xvfb-run.*/Xauthority 2>/dev/null | head -1; }
X() { runuser -u st -- env DISPLAY=$D XAUTHORITY="$(xa)" "$@"; }
case "$1" in
  start)
    printf '\xff\xfe' > "$A/plain.ini"; printf '[Common]\r\nNewsEnable=0\r\nProxyEnable=0\r\nCertInstall=0\r\n' | iconv -f utf-8 -t utf-16le >> "$A/plain.ini"
    chown st:st "$A/plain.ini"
    runuser -u st -- env WINEPREFIX=$P WINEARCH=win64 WINEDEBUG=-all WINEDLLOVERRIDES="mscoree,mshtml=" HOME=/home/st USER=st TZ=Europe/London \
      setsid xvfb-run -n 77 -s "-screen 0 1280x800x24" /opt/st/run-in-x.sh /opt/wine-staging/bin/wine "C:\\ST\\probe\\terminal64.exe" /portable "/config:C:\\ST\\probe\\plain.ini" >/dev/null 2>&1 < /dev/null &
    sleep 25 ;;
  shot) X import -window root "/tmp/x-${2:-now}.png" && echo "/tmp/x-${2:-now}.png" ;;
  key) shift; X xdotool key --delay 120 "$@" ;;
  type) shift; X xdotool type --delay 60 "$*" ;;
  click) X xdotool mousemove "$2" "$3" click 1 ;;
  wins) for w in $(X xdotool search --onlyvisible --name "." 2>/dev/null); do echo "$w $(X xdotool getwindowname $w 2>/dev/null)"; done ;;
  stop)
    W=$(X xdotool search --name "Netting|Hedging|MetaTrader" 2>/dev/null | head -1); [ -n "$W" ] && X xdotool windowclose "$W" 2>/dev/null
    sleep 8
    runuser -u st -- env WINEPREFIX=$P /opt/wine-staging/bin/wineserver -k >/dev/null 2>&1
    pkill -u st -f "ST.probe.terminal64.exe" 2>/dev/null; pkill -u st -f "Xvfb :77" 2>/dev/null; true ;;
esac
