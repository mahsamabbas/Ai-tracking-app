#!/usr/bin/env bash
# Deploy Techlio: Vercel (web) + Render (API). Run from repo root.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

API_URL="${NEXT_PUBLIC_API_URL:-}"

echo "==> 1/4  Push latest to GitHub (for Render blueprint)"
git push origin main

echo "==> 2/4  Deploy dashboard to Vercel (apps/web)"
if [[ -z "$API_URL" ]]; then
  echo "WARN: Set NEXT_PUBLIC_API_URL to your Render API URL before production deploy."
  echo "      Example: export NEXT_PUBLIC_API_URL=https://techlio-api.onrender.com"
else
  cd "$ROOT/apps/web"
  vercel env rm NEXT_PUBLIC_API_URL production --yes 2>/dev/null || true
  printf '%s' "$API_URL" | vercel env add NEXT_PUBLIC_API_URL production
fi
cd "$ROOT/apps/web"
vercel deploy --prod --yes

echo "==> 3/4  Render API (Docker)"
if command -v render >/dev/null 2>&1; then
  render blueprints validate "$ROOT/render.yaml"
  echo "If this is your first deploy, open Render and sync the blueprint:"
  echo "  https://dashboard.render.com/blueprint/new"
  echo "Then trigger deploy: render deploys create techlio-api --wait"
else
  echo "Install Render CLI: brew install render"
  echo "Then: render login"
  echo "Open: https://dashboard.render.com/blueprint/new → repo tracking-app → apply render.yaml"
fi

echo "==> 4/4  Seed production DB (once, after Postgres is up)"
echo "  DATABASE_URL='<external postgres url>' pnpm db:seed"

echo "Done."
