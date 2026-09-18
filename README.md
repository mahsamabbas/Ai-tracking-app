# Techlio AI Agent Activity Monitoring

Monorepo for the AI Agent Activity Monitoring Dashboard (PRD v0.2).

## Quick start

```bash
pnpm install
docker compose up -d postgres redis
pnpm build
pnpm --filter @techlio/api dev
pnpm --filter @techlio/connector dev
pnpm --filter @techlio/web dev
```

Connector: `http://127.0.0.1:9477` · API: `http://localhost:3001` · Web: `http://localhost:3000`

## Packages

- `@techlio/event-schema` — normalized events (Section 9–10)
- `@techlio/aggregation` — hourly duration metrics
- `@techlio/provider-adapters` — Claude hooks → events
- `@techlio/puller` — Cursor / Copilot Tier B
- `@techlio/server-core` — ingest, DB, hourly finalize
- Apps: `connector`, `api`, `worker`, `web`, `extension`

## Policy

See `docs/policy/monitoring-notice-draft.md` before enabling monitoring on employee machines.
