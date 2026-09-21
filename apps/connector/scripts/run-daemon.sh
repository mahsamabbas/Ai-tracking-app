#!/usr/bin/env bash
# Used by macOS LaunchAgent — loads apps/connector/.env then starts the connector.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CONN_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$CONN_DIR"
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
if [[ ! -f dist/index.js ]]; then
  cd "$ROOT"
  pnpm --filter @techlio/connector run build
  cd "$CONN_DIR"
fi
exec node dist/index.js
