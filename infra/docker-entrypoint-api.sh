#!/bin/sh
set -e
cd /app
echo "Running database migrations..."
node scripts/migrate.mjs
echo "Starting API..."
exec node apps/api/dist/main.js
