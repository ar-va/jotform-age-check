#!/bin/sh
# frame.sh <ms> <work dir>: screenshot of demo.html at that moment of the timeline (macOS Google Chrome).
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --allow-file-access-from-files \
  --hide-scrollbars --window-size=640,600 --force-device-scale-factor=2 --virtual-time-budget=500 \
  --screenshot="$2/frames/f$(printf %05d "$1").png" "file://$2/demo.html?t=$1" 2>/dev/null
