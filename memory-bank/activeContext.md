# Active context

**Date:** 2026-09-18

## Shape of the product

One drill-down path, and every screen serves it:

```
Organisation → Employees → Employee → AI tool → Sessions → Session detail
```

- `/` organisation overview — KPIs with period-over-period comparison, usage
  trend, observed time split, tools, teams, working-hour pattern, coverage, live
  connector and session strip.
- `/employees` directory — search, team / AI tool / connector-state filters,
  sort, usage, productive share, sessions, avg session, sparkline, last active.
- `/employees/[id]` — the analytics hub. Also the **developer's own landing
  page**: FR-004 wants parity, not a reduced self-view.
- `/employees/[id]/tools/[provider]` — one employee's use of one AI tool, with
  that provider's declared capability limits.
- `/employees/[id]/sessions` — paged history, filtered by tool, activity type,
  and project.
- `/sessions/[id]` — five durations, usage metrics, task-context versions, full
  event timeline filterable by activity type.
- Supporting: `/hourly/[id]`, `/connectors`, `/users`, `/audit`, `/policy`.

Removed in the refactor: `/developer-day` and `/my-activity` (both folded into
the employee analytics page), and all browser-side metric computation.

## Where the numbers come from

- `computeSessionMetrics` (`packages/server-core/src/sessions.ts`) is the single
  source of truth for the §11 rules. Metrics are **columns on `agent_sessions`**,
  written on ingest and by the seed.
- `packages/server-core/src/analytics.ts` holds every aggregate the dashboard
  reads. Nothing is computed in the browser.
- `resolveRange` (`range.ts`) resolves today / yesterday / 7d / 30d / 90d /
  custom; `previousRange` gives the comparison window.

## Productive vs idle — the wording that matters

The brief asked for productive vs non-productive activity; the PRD forbids
productivity scores and rankings (§3, SEC-009). Resolved by classifying
**observed agent activity**, not people:

`engineering_output` · `assisted_editing` · `exploration` count as productive
agent activity; `idle_dominant` reads "Mostly idle" and its explanation says
plainly that it describes the telemetry, not the person. Coverage gaps are a
third, separate category — never folded into idle.

## Demo data

`pnpm db:seed` builds a deterministic 12-person org: ~2,300 sessions and
~237,000 events over 90 days across Cursor, Claude Code, Copilot, and the VS Code
companion. It deliberately includes stale/offline/paused connectors, a person
with no telemetry, unassigned sessions, mid-session coverage gaps, failed tests
and builds, and weekend/idle patterns.

Seeded heartbeats are static, so the API re-anchors **only seeded** connector
heartbeats once a minute (`demo-keepalive.ts`, `connector_health.demo_state`).
Disabled with `DEMO_CONNECTOR_KEEPALIVE=0` or in production.

Alex (the local `pnpm dev` connector identity) is excluded: demo Claude/Cursor
rows are frozen unless a real heartbeat arrives. "Online" on Alex means the
local connector actually reported in — it is not a process-less sample flag.

## Local run

```bash
docker compose up -d postgres redis
pnpm db:migrate && pnpm db:seed
pnpm dev            # API 3001, web 3000, connector 9477
pnpm dev:worker     # optional: hourly finalise, recalc, retention
```

**Backlog:** [pending.md](pending.md).
