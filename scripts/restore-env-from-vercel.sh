#!/usr/bin/env bash
# Restore local .env files from Vercel (never commit these files).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> API (tracking-app-api)"
cd "$ROOT/apps/api"
vercel link --project tracking-app-api --yes
vercel env pull .env.local --environment=production --yes
vercel env pull .env.production.local --environment=production --yes

echo "==> Web dashboard (tracking-app-api-t9yd)"
cd "$ROOT/apps/web"
vercel link --project tracking-app-api-t9yd --yes
vercel env pull .env.local --environment=production --yes

echo "==> Verify (no secrets printed)"
node "$ROOT/scripts/check-env-files.mjs"

echo ""
echo "Done. Files:"
echo "  $ROOT/apps/api/.env.local"
echo "  $ROOT/apps/api/.env.production.local"
echo "  $ROOT/apps/web/.env.local"
echo "  $ROOT/apps/connector/.env  (local connector only — not on Vercel)"
