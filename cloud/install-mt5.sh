#!/usr/bin/env bash
# Session Terminal cloud MT5 host - the MT5 template (run as user st, after setup-base.sh).
# One Wine prefix holds a clean MetaTrader 5 install. Each member's prefix is copied from it (cloud/agent), and each of the
# member's accounts runs its own portable copy of the terminal inside that prefix, so a member's accounts share one Common
# folder - which is where the EA's Lead/Follow copier files live.
set -euo pipefail
export WINEARCH=win64
export WINEPREFIX=/home/st/mt5-template
# Wine staging, in Windows 11 mode (see setup-base.sh): stable Wine trips MT5's "A debugger has been found" since 18 Oct 2026
export PATH=/opt/wine-staging/bin:$PATH
export WINEDEBUG=-all
# no Mono (.NET) or Gecko (IE) - MT5 needs neither, and their installers open a dialog nobody can click on a headless server
export WINEDLLOVERRIDES="mscoree,mshtml="
MT5_URL=https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe

# One virtual screen for the whole install. xvfb-run per step closed the screen under Wine's own helper processes
# (explorer /desktop), which then hung and kept "wineserver -w" waiting for ever (23 Oct 2026).
Xvfb :90 -screen 0 1280x1024x24 -nolisten tcp >/dev/null 2>&1 &
XPID=$!
trap 'wineserver -k 2>/dev/null || true; kill $XPID 2>/dev/null || true' EXIT
export DISPLAY=:90
sleep 2

mkdir -p /home/st/dl
cd /home/st/dl
echo "== Wine prefix"
wineboot --init
wineserver -w
# Windows 11: with staging, the mode in which MT5's debugger check passes
wine reg add 'HKEY_CURRENT_USER\Software\Wine' /v Version /t REG_SZ /d win11 /f
# Wine's own virtual desktop: MT5's dialogs (Options, the account wizard) are layered windows that draw black - or not
# at all - straight on the X screen; inside the virtual desktop Wine draws them itself (23 Oct 2026)
wine reg add 'HKEY_CURRENT_USER\Software\Wine\Explorer' /v Desktop /t REG_SZ /d Default /f
wine reg add 'HKEY_CURRENT_USER\Software\Wine\Explorer\Desktops' /v Default /t REG_SZ /d 1280x800 /f
wineserver -w

echo "== MetaTrader 5 (MetaQuotes' official installer)"
wget -q -O mt5setup.exe "$MT5_URL"
timeout 900 wine mt5setup.exe /auto || echo "installer exit $?"
# the installer starts MT5 when it is done and leaves it open, so "wineserver -w" would wait for ever: give MT5 a minute
# to finish its first start, then close it
sleep 60
pkill -f "terminal64.exe" || true
sleep 5
wineserver -k || true
ls -la "$WINEPREFIX/drive_c/Program Files/MetaTrader 5/" | head -20
echo "== done"
