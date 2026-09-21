#!/usr/bin/env bash
# One-time install: Techlio connector runs at login and stays up (KeepAlive).
set -euo pipefail

DEFAULT_REPO="$HOME/Documents/TechlioTrackingApp"
read -r -p "Path to TechlioTrackingApp repo [$DEFAULT_REPO]: " REPO
REPO="${REPO:-$DEFAULT_REPO}"
if [[ ! -d "$REPO/apps/connector" ]]; then
  echo "Expected $REPO/apps/connector — clone the repo first."
  exit 1
fi

RUNNER="$REPO/apps/connector/scripts/run-daemon.sh"
chmod +x "$RUNNER"
cd "$REPO"
pnpm --filter @techlio/connector run build

LABEL="com.techlio.connector"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
mkdir -p "$HOME/Library/LaunchAgents"

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${RUNNER}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${HOME}/.techlio-connector/connector.log</string>
  <key>StandardErrorPath</key>
  <string>${HOME}/.techlio-connector/connector.err.log</string>
</dict>
</plist>
EOF

mkdir -p "$HOME/.techlio-connector"
launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
launchctl enable "gui/$(id -u)/${LABEL}"
launchctl kickstart -k "gui/$(id -u)/${LABEL}"

echo "Connector installed. Health: curl -s http://127.0.0.1:9477/health"
echo "Logs: $HOME/.techlio-connector/connector.log"
