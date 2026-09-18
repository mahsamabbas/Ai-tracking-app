# Active context

**Date:** 2026-09-18

**Phase:** Local MVP stack implemented; legal pilot and production hardening remain.

**Local run:**

```bash
docker compose up -d postgres redis
# existing DB: apply infra/sql/002_devices_projects_sessions.sql
pnpm dev
# optional: pnpm dev:worker
```

**New surfaces:** `docs/api.md`, web routes `/hourly/[id]`, `/my-activity`, SSE on overview.

**Backlog:** [pending.md](pending.md) (updated after engineering pass).
