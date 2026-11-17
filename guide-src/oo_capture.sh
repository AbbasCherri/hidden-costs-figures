#!/bin/sh
# Screenshot OnlyOffice on a private nested X display, so nothing else on the desktop is captured.
# 1. python3 patch_workbook_view.py "<workbook>.xlsx" oo/workbook.xlsx
# 2. run this script, then crop/annotate with annotate_oo.py
Xwayland :99 -ac -geometry 1600x1000 &
sleep 4
DISPLAY=:99 flatpak run --nosocket=wayland --socket=x11 --env=DISPLAY=:99 --env=QT_QPA_PLATFORM=xcb \
  org.onlyoffice.desktopeditors "$PWD/oo/workbook.xlsx" &
sleep 30
import -display :99 -window root shots/oo_graphmaker_plain.png
flatpak kill org.onlyoffice.desktopeditors
kill %1
