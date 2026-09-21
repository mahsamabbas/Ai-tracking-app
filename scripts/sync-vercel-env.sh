#!/usr/bin/env bash
# Sync Techlio env to Vercel (run after `vercel login` on talhakhilji237 account).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_URL="https://tracking-app-api-three.vercel.app"
DASHBOARD_URL="https://tracking-app-api-t9yd.vercel.app"

echo "==> API project: tracking-app-api"
cd "$ROOT/.vercel-api"
vercel link --project tracking-app-api --yes 2>/dev/null || vercel link --project tracking-app-api

if ! vercel env ls production 2>/dev/null | grep -q JWT_SECRET; then
  JWT="$(openssl rand -hex 32)"
  printf '%s\n' "$JWT" | vercel env add JWT_SECRET production
else
  echo "JWT_SECRET already set on API (skipping)"
fi

vercel env ls production 2>/dev/null | grep -q '^ SKIP_REDIS ' || printf '%s\n' '1' | vercel env add SKIP_REDIS production
vercel env ls production 2>/dev/null | grep -q '^ ALLOW_DEV_HEADER_AUTH ' || printf '%s\n' '0' | vercel env add ALLOW_DEV_HEADER_AUTH production

vercel env pull "$ROOT/apps/api/.env.local" --environment=production --yes

echo "==> Web project: tracking-app-api-t9yd"
cd "$ROOT/apps/web"
vercel link --project tracking-app-api-t9yd --yes 2>/dev/null || vercel link --project tracking-app-api-t9yd
vercel env rm NEXT_PUBLIC_API_URL production --yes 2>/dev/null || true
printf '%s\n' "$API_URL" | vercel env add NEXT_PUBLIC_API_URL production
vercel env pull "$ROOT/apps/web/.env.local" --environment=production --yes

echo "Done. Redeploy from repo root (not apps/web or .vercel-api):"
echo "  $ROOT/scripts/deploy-vercel.sh all"
echo "  API health: curl -s $API_URL/v1/health"
echo "  Dashboard:  $DASHBOARD_URL/login"
