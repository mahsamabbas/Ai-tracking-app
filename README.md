# Techlio AI Agent Activity Monitoring

Monorepo for the AI Agent Activity Monitoring Dashboard (PRD v0.2).

## Quick start

1. **Start Docker Desktop** (required for Postgres + Redis).

```bash
cd /Users/macbookpro/Documents/TechlioTrackingApp
pnpm install
docker compose up -d postgres redis
# If Postgres already existed before 002 migration, run once:
# docker exec -i $(docker compose ps -q postgres) psql -U techlio -d techlio_activity < infra/sql/002_devices_projects_sessions.sql
pnpm build
pnpm dev
```

API reference: `docs/api.md`.

That starts **API (3001), web (3000), and connector (9477)** in parallel. Optional hourly jobs: `pnpm dev:worker` in a second terminal (needs Redis).

**Do not** paste several `pnpm … dev` lines in one block with `# comments` on the same line — only the first command runs until you stop it.

| Service   | URL |
|-----------|-----|
| Dashboard | http://localhost:3000 |
| API       | http://localhost:3001 |
| Connector | http://127.0.0.1:9477 |

## Packages

- `@techlio/event-schema` — normalized events (Section 9–10)
- `@techlio/aggregation` — hourly duration metrics
- `@techlio/provider-adapters` — Claude hooks → events
- `@techlio/puller` — Cursor / Copilot Tier B
- `@techlio/server-core` — ingest, DB, hourly finalize
- Apps: `connector`, `api`, `worker`, `web`, `extension`

## Policy

See `docs/policy/monitoring-notice-draft.md` before enabling monitoring on employee machines.

The local connector labels the **host IDE** as the provider (Cursor when you run this repo in Cursor). Claude Code events are only tagged `claude_code` when Claude hooks actually fire. Cursor is Tier B: hourly model/tool metrics are not available from the provider.
