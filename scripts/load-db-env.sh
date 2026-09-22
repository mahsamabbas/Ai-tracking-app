#!/usr/bin/env bash
# Load Postgres URL from Vercel-pulled API env (never commit secrets).
# Prefer unpooled URL for migrations (Neon/Vercel Postgres).
set -euo pipefail
_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ROOT="$(cd "$_SCRIPT_DIR/.." && pwd)"

strip_quotes() {
  local v="$1"
  v="${v#\"}"
  v="${v%\"}"
  v="${v#\'}"
  v="${v%\'}"
  printf '%s' "$v"
}

normalize_postgres_url() {
  local u
  u="$(strip_quotes "$1")"
  u="${u#prisma+}"
  u="${u#postgresql+}"
  printf '%s' "$u"
}

is_postgres_dsn() {
  local u
  u="$(normalize_postgres_url "$1")"
  case "$u" in
    postgres://*|postgresql://*) return 0 ;;
    *) return 1 ;;
  esac
}

pick_env_file() {
  for candidate in \
    "$ROOT/apps/api/.env.production.local" \
    "$ROOT/apps/api/.env.local" \
    "$ROOT/.vercel-api/.env.local"; do
    if [[ -f "$candidate" ]]; then
      echo "$candidate"
      return 0
    fi
  done
  return 1
}

resolve_database_url() {
  local name val norm
  for name in \
    DATABASE_URL_UNPOOLED \
    POSTGRES_URL_NON_POOLING \
    POSTGRES_URL \
    DATABASE_URL \
    POSTGRES_PRISMA_URL; do
    val="${!name:-}"
    [[ -n "$val" ]] || continue
    if is_postgres_dsn "$val"; then
      normalize_postgres_url "$val"
      return 0
    fi
  done

  local host user pass db
  host="${PGHOST_UNPOOLED:-${PGHOST:-}}"
  user="${POSTGRES_USER:-${PGUSER:-}}"
  pass="${POSTGRES_PASSWORD:-${PGPASSWORD:-}}"
  db="${POSTGRES_DATABASE:-${PGDATABASE:-}}"

  if [[ -n "$host" && -n "$user" && -n "$pass" && -n "$db" ]]; then
    printf 'postgresql://%s:%s@%s/%s?sslmode=require' "$user" "$pass" "$host" "$db"
    return 0
  fi

  return 1
}

if [[ "${1:-}" == "--check" ]]; then
  ENV_FILE=""
  if ENV_FILE="$(pick_env_file)"; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
    echo "env file: $ENV_FILE"
    for name in DATABASE_URL DATABASE_URL_UNPOOLED POSTGRES_URL POSTGRES_URL_NON_POOLING POSTGRES_PRISMA_URL PGHOST PGHOST_UNPOOLED; do
      if [[ -n "${!name:-}" ]]; then
        if is_postgres_dsn "${!name}"; then
          echo "  $name: set (postgres DSN)"
        else
          echo "  $name: set (not a postgres DSN — skipped)"
        fi
      else
        echo "  $name: (empty)"
      fi
    done
    if resolve_database_url >/dev/null; then
      echo "resolved: ok (postgres URL chosen for migrate)"
    else
      echo "resolved: FAILED — no usable Postgres URL in this file"
      exit 1
    fi
  else
    echo "No env file under apps/api/"
    exit 1
  fi
  exit 0
fi

ENV_FILE=""
if ENV_FILE="$(pick_env_file)"; then
  echo "==> Loading DB env from $ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  echo "ERROR: No apps/api/.env.production.local or .env.local — run:"
  echo "  cd apps/api && vercel link --project tracking-app-api --yes"
  echo "  vercel env pull .env.production.local --environment=production --yes"
  return 1 2>/dev/null || exit 1
fi

if ! RESOLVED="$(resolve_database_url)"; then
  echo "ERROR: No usable Postgres URL in $ENV_FILE"
  echo "       Run: bash scripts/load-db-env.sh --check"
  echo "       In Vercel → tracking-app-api → Storage/Postgres: link Neon and redeploy env pull."
  exit 1
fi

export DATABASE_URL="$RESOLVED"
export DATABASE_URL_UNPOOLED="$RESOLVED"

if [[ "$DATABASE_URL" == *"@HOST"* ]] || [[ "$DATABASE_URL" == *"USER:PASS"* ]]; then
  echo "ERROR: DATABASE_URL is still a documentation placeholder."
  exit 1
fi
