#!/bin/sh
# Inside each terminal's virtual screen: a small window manager first (without one, MT5's dialogs and menus draw black
# and windows can't be focused), then MT5 itself.
openbox >/dev/null 2>&1 &
exec "$@"
