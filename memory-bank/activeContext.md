# Active context

**Date:** 2026-09-18

**Fixes:** Sidebar is viewport-locked (main pane scrolls). Provider is the host IDE (Cursor by default), not hardcoded Claude Code. Cursor is Tier B — hourly model/tool metrics show the PRD empty state.

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
