#!/bin/sh
# Rebuilds docs/demo.gif from the current widget code (macOS, Google Chrome, Python 3).
# Usage, from the project root: sh tools/demo/make-gif.sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../.." && pwd)
WORK=$(mktemp -d)
mkdir -p "$WORK/frames"
python3 "$HERE/build_demo.py" "$ROOT" "$WORK"
seq 40 80 12200 | xargs -P 6 -n 1 -I{} sh "$HERE/frame.sh" {} "$WORK"
python3 -m venv "$WORK/venv" && "$WORK/venv/bin/pip" install -q pillow
"$WORK/venv/bin/python" "$HERE/assemble.py" "$WORK" "$ROOT/docs/demo.gif" 840
rm -rf "$WORK"
