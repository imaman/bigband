#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

ELECTRON_BIN=$(node -e "console.log(require('electron'))")
MAIN_JS="$(pwd)/dist/src/main.js"

if [ ! -f "$ELECTRON_BIN" ]; then
  echo "ERROR: Electron binary not found at $ELECTRON_BIN" >&2
  exit 1
fi

if [ ! -f "$MAIN_JS" ]; then
  echo "ERROR: main.js not found at $MAIN_JS (did you run yarn build?)" >&2
  exit 1
fi

DESKTOP_DIR="$HOME/.local/share/applications"
mkdir -p "$DESKTOP_DIR"

cat > "$DESKTOP_DIR/wake-me-up.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Wake Me Up
Exec=$ELECTRON_BIN --no-sandbox $MAIN_JS
Icon=alarm-symbolic
Terminal=false
StartupWMClass=wake-me-up
Categories=Utility;
EOF

echo "Installed: $DESKTOP_DIR/wake-me-up.desktop"
echo "Exec=$ELECTRON_BIN --no-sandbox $MAIN_JS"
