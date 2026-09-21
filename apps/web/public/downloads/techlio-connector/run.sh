#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
export CONNECTOR_DB="${CONNECTOR_DB:-$HOME/.techlio-connector/queue.db}"
mkdir -p "$(dirname "$CONNECTOR_DB")"
exec node agent.mjs
