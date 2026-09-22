#!/usr/bin/env bash
# Migrate DB → build server-core → deploy API + web on Vercel. Run from repo root.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

WITH_CONNECTOR=0
for arg in "$@"; do
  case "$arg" in
    --with-connector) WITH_CONNECTOR=1 ;;
    -h|--help)
      echo "Usage: $0 [--with-connector]"
      echo "  Set DATABASE_URL (or POSTGRES_URL) to your production Postgres before migrating."
      echo "  Requires: vercel CLI logged in (vercel login)."
      exit 0
      ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

echo "==> 1/4  Build @techlio/server-core"
pnpm --filter @techlio/server-core run build

echo "==> 2/4  Database migrations"
if [[ "${SKIP_DB_MIGRATE:-}" == "1" ]]; then
  echo "SKIP_DB_MIGRATE=1 — skipping migrations (run pnpm db:migrate separately with production DATABASE_URL)."
elif [[ "${DATABASE_URL:-}" == *"@HOST"* ]] || [[ "${DATABASE_URL:-}" == *"USER:PASS"* ]]; then
  echo "ERROR: DATABASE_URL still looks like the documentation placeholder (USER/PASS/HOST)."
  echo "Use your real Postgres URL, for example:"
  echo "  cd apps/api && vercel link --project tracking-app-api --yes"
  echo "  vercel env pull .env.production.local --environment=production --yes"
  echo "  export \$(grep -E '^DATABASE_URL=' .env.production.local | head -1)"
  echo "Or set SKIP_DB_MIGRATE=1 to deploy without migrating."
  exit 1
elif [[ -z "${DATABASE_URL:-}${POSTGRES_URL:-}${DATABASE_URL_UNPOOLED:-}" ]]; then
  echo "WARN: DATABASE_URL not set — migrating local default (postgres://techlio:techlio@localhost:5432/techlio_activity)"
fi
pnpm db:migrate

if [[ "$WITH_CONNECTOR" == "1" ]]; then
  echo "==> 3/5  Pack connector (DMG/exe)"
  pnpm connector:pack
  echo "    Copy artifacts into apps/web/public/downloads/ if needed, then web deploy includes them."
  echo "==> 4/5  Vercel production (api + web)"
else
  echo "==> 3/4  Vercel production (api + web)"
fi

"$ROOT/scripts/deploy-vercel.sh" all

echo "Done."
