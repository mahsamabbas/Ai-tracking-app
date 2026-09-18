# Techlio AI Agent Activity Monitoring — Technical Overview

This document explains **what the project is**, **how data flows end to end**, and **how the codebase is organized**. It is aimed at engineers onboarding to the repo.

**Related docs:** [API reference](./api.md) · PRD extract: [memory-bank/requirements.md](../memory-bank/requirements.md) · Quick start: [README](../README.md)

---

## 1. What this project is

**Techlio AI Activity** is an internal monitoring product (PRD v0.2) that gives managers **near-live visibility** into what AI coding agents are doing on developer machines—sessions, model/tool usage metadata, tests/builds, file-change signals, and connector health.

It is **not** a timesheet, billing tool, or developer ranking system. It does **not** collect raw prompts, responses, source code bodies, command text, keystrokes, or screenshots by default.

| Concept | Meaning |
|--------|---------|
| **Authoritative unit** | One **clock-hour summary** per developer (with versioning when late events arrive) |
| **Evidence** | Every aggregate on the dashboard must be traceable to **normalized events** in Postgres |
| **Coverage gaps** | Paused or offline connectors create explicit gaps—**never** “developer was inactive” |

**Roles (target):** Administrator, Manager, Developer (self-view), Auditor. Local dev uses an `x-role` header stub until OIDC is wired.

---

## 2. High-level architecture

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  IDE companion  │────▶│  Local connector │────▶│  API (NestJS)   │
│  (VS Code/Cursor)│     │  :9477 Fastify   │     │  :3001          │
└─────────────────┘     │  SQLite queue    │     └────────┬────────┘
                        │  redaction/sign  │              │
┌─────────────────┐     └────────┬─────────┘              │
│ Claude hooks /  │──────────────┘                        ▼
│ OTLP (Tier A)   │                              ┌─────────────────┐
└─────────────────┘                              │  Postgres       │
                                                 │  activity_events│
┌─────────────────┐     ┌──────────────────┐     │  hourly_snapshots│
│ Worker (BullMQ) │◀───▶│  Redis           │     │  audit_log      │
│ hourly finalize │     └──────────────────┘     └────────┬────────┘
│ retention/pull  │                                       │
└─────────────────┘                                       ▼
                                                 ┌─────────────────┐
                                                 │  Web (Next.js)  │
                                                 │  :3000          │
                                                 └─────────────────┘
```

**Local dev stack** (`pnpm dev`):

| Service | Port | Purpose |
|---------|------|---------|
| Web dashboard | 3000 | Manager/developer UI |
| API | 3001 | Ingest, dashboard, exports, SSE |
| Connector | 9477 | Collect, queue, upload events |
| Postgres | 5432 | Durable store |
| Redis | 6379 | BullMQ jobs (worker) |

Start infra: `docker compose up -d postgres redis`. Optional: `pnpm dev:worker` for hourly jobs.

---

## 3. Monorepo layout

**Tooling:** pnpm workspaces + Turborepo, TypeScript throughout.

| Path | Package / app | Role |
|------|----------------|------|
| `packages/event-schema` | `@techlio/event-schema` | Zod schemas for Section 9–10 event model; provider capabilities (FR-012) |
| `packages/aggregation` | `@techlio/aggregation` | Hourly **five durations** (model, tool, merged active, interactive span, elapsed span) |
| `packages/provider-adapters` | `@techlio/provider-adapters` | Claude Code hooks → normalized events |
| `packages/puller` | `@techlio/puller` | Tier B: Cursor / Copilot **daily** Admin API pulls |
| `packages/server-core` | `@techlio/server-core` | Ingest, sessionization, hourly finalize, exports, retention, Drizzle schema |
| `apps/connector` | `@techlio/connector` | Local daemon: hooks, extension endpoint, queue, upload |
| `apps/api` | `@techlio/api` | HTTP API (NestJS + Fastify) |
| `apps/worker` | `@techlio/worker` | Scheduled hourly finalize, late recalc, retention, optional Cursor pull |
| `apps/web` | `@techlio/web` | Next.js 15 dashboard |
| `apps/extension` | `techlio-activity-companion` | VS Code / Cursor extension: pause, context, file/task signals |
| `infra/sql/` | — | Postgres init/migrations |
| `tests/e2e` | `@techlio/e2e` | PRD Section 19 scenario tests (partial) |
| `memory-bank/` | — | PRD extract, progress, pending gaps |
| `docs/` | — | API, ADRs, policy drafts |

---

## 4. Data model: events first

Everything starts as an **activity event** (`ActivityEvent` in `@techlio/event-schema`):

- Stable **`event_id`** (UUID) for idempotency  
- **`organization_id`**, **`developer_id`**, **`device_id`**  
- **`provider`** (e.g. `cursor`, `claude_code`)  
- **`event_type`** from the catalog (session, model, tool, file, heartbeat, coverage gap, etc.)  
- **`occurred_at`** (when the agent action happened)  
- **`metadata`** — **allowlist only** (model name, token counts, file path category, tier flags, etc.)

**Privacy rules:**

- Connector runs **local redaction** (`sanitizeEvent`) before enqueue.  
- API runs **secret scanning** and rejects forbidden keys / token patterns.  
- Missing telemetry is shown as **empty states**, not zero activity.

**Provider tiers (FR-012):**

| Tier | Examples | Hourly session/model/tool |
|------|----------|---------------------------|
| **A** | Claude Code, Codex, Gemini (via connector OTLP/hooks) | Supported when agent exposes telemetry |
| **B** | Cursor, GitHub Copilot | **Daily aggregates only**; UI must say “not available from provider” for hourly metrics |

Default local connector host provider is **Cursor** when you work in Cursor; Claude events are only tagged `claude_code` when Claude hooks hit `/hooks/claude`.

---

## 5. End-to-end flow

### 5.1 Collection (developer machine)

1. **IDE companion** (optional but recommended in Cursor/VS Code)  
   - On activate: `POST http://127.0.0.1:9477/host` with `appName` → sets provider to `cursor` or `vscode`.  
   - Emits `session_started`, `file_modified` on save, `task_context_changed`, test/build/lint completion via `POST /hooks/extension`.

2. **Connector** (`apps/connector`)  
   - Buffers events in **encrypted SQLite** (`EncryptedQueue`).  
   - Every ~30s: enqueue `heartbeat_sent` (with queue depth, provider metadata) and flush to API.  
   - **Pause/resume** emits `telemetry_gap_*` and `connector_paused` / `resumed` (coverage gap, not “inactive dev”).  
   - **Claude Code:** `POST /hooks/claude` → `@techlio/provider-adapters`.  
   - Upload: `POST /v1/events/batch` with `Authorization: Bearer <device-token>` and `X-Device-Id`.

3. **Signing**  
   - Connector signs batch body with **Ed25519** (`X-Signature`). Server verification is still being hardened for production.

### 5.2 Ingestion (API + server-core)

`ingestBatch` in `@techlio/server-core`:

1. Validate batch with `EventBatchSchema`.  
2. Reject org mismatch, replayed `event_id`, secrets, schema violations.  
3. Insert into `activity_events` with `ON CONFLICT DO NOTHING`.  
4. Update `connector_health` on heartbeats (last seen, queue depth, paused, **provider**).  
5. **Sessionization** (`agent_sessions`, `session_context_versions`) on session/context events.  
6. If event lands in an already-finalized hour → enqueue **late recalc** on BullMQ (`hourly-recalc`).

### 5.3 Aggregation (worker)

On a schedule (~**:05 UTC** each hour):

- Worker loads events for `(org, developer, hour)` from Postgres.  
- `@techlio/aggregation` computes five separate durations (interval merge, idle gap default 10 minutes).  
- Writes `hourly_snapshots` with `metrics` JSON (includes token/file counts when present, `eventIds` for drill-down).  
- **Late events** create a new row with higher `version` and `recalc_reason`.

**Retention:** Worker can purge events older than `RETENTION_DAYS` (default 90).

**Tier B:** With `CURSOR_API_KEY`, worker can pull Cursor daily usage and ingest as `provider_daily_aggregate` events.

### 5.4 Presentation (web)

- **Team overview:** connectors, recent events, charts, filters, SSE tick (`/v1/stream/sse`), CSV export.  
- **Developer day:** hourly cards; Tier B banner when provider cannot supply hourly metrics.  
- **Hourly detail:** `/hourly/[id]` — metrics, versions, linked source events.  
- **My activity:** developer-scoped view.  
- Layout: fixed sidebar, scrollable main content.

Auth in dev: `x-role: manager` (etc.) on dashboard routes.

---

## 6. Database (Postgres)

Initialized via `infra/sql/`:

| Table | Purpose |
|-------|---------|
| `organizations` | Tenant boundary |
| `activity_events` | Append-only normalized events (`payload` JSONB) |
| `hourly_snapshots` | Versioned hourly metrics per developer/hour |
| `connector_health` | Last heartbeat, queue depth, paused, provider |
| `devices` | Hashed device tokens, revoke support |
| `agent_sessions` / `session_context_versions` | Sessionization and task context history |
| `projects` / `work_items` | Context pick lists |
| `audit_log` | Sensitive actions (ingest, pause, export, retention) |
| `activity_exports` | Generated CSV/PDF export payloads |

Apply migrations in order (`001`, `002`, `003`, …) on existing databases; fresh Docker mounts run them at init.

**ORM:** Drizzle in `packages/server-core` (API imports shared `db` from server-core).

---

## 7. API surface (summary)

Full list: [docs/api.md](./api.md).

**Ingest:** `POST /v1/events/batch`  
**Dashboard:** `GET /v1/dashboard/team`, `GET /v1/developers/:id/timeline`, `GET /v1/hourly-snapshots/:id`  
**Connectors:** register, revoke, heartbeat, pause  
**Context:** `GET /v1/projects`, `GET /v1/work-items`, `POST /v1/sessions/:id/context`  
**Exports:** `POST /v1/activity-exports`, `GET /v1/activity-exports/:id`  
**Live:** `GET /v1/stream/sse`  

Timesheet import is explicitly rejected (`POST /v1/events/timesheet`).

---

## 8. Key technical invariants

These come from the PRD and `.cursor/rules/privacy-guardrails.mdc`:

1. **Allowlist metadata** — no arbitrary JSON on events.  
2. **Idempotent ingest** — same `event_id` never double-counts.  
3. **Five durations** — never collapse model vs tool vs merged active in the UI.  
4. **Hour boundary** — assignment by `occurred_at`; late data → new snapshot version.  
5. **Coverage gaps** — pause/offline/stale heartbeat are explicit states.  
6. **No timesheet/billing/ranking** — not in schema, API, or UI.

---

## 9. Configuration (common env vars)

| Variable | Where | Meaning |
|----------|--------|---------|
| `DATABASE_URL` | API, worker, server-core | Postgres connection |
| `REDIS_HOST` / `REDIS_PORT` | API, worker | BullMQ |
| `TECHLIO_PROVIDER` | Connector | Default host provider (`cursor`, `claude_code`, …) |
| `TECHLIO_DEVICE_TOKEN` | Connector | Bearer token for ingest |
| `TECHLIO_API_URL` | Connector | API base (default `http://localhost:3001`) |
| `NEXT_PUBLIC_API_URL` | Web | Browser → API |
| `CURSOR_API_KEY` | Worker | Tier B daily pull |
| `RETENTION_DAYS` | Worker | Event purge horizon |

Dev defaults use fixed org/developer/device UUIDs in code constants for the pilot org “Techlio”.

---

## 10. Testing and quality

- **Unit:** aggregation intervals, event schema, connector redaction, server-core secret scan.  
- **E2E package:** `tests/e2e/scenarios/section19.test.ts` — subset of PRD Section 19 (overlap, secrets, RBAC helper, timesheet reject, etc.).  
- **CI:** `pnpm build` + `pnpm test` via Turborepo.

Many integration scenarios (offline queue, heartbeat stop, full replay against API) are still pending—see [memory-bank/pending.md](../memory-bank/pending.md).

---

## 11. What is not done yet (honest scope)

Production MVP (Definition of Done §22) still requires:

- Real **OIDC/SSO** and full **RBAC** on every route  
- **Legal/HR** approval of monitoring notice  
- **Ed25519** verification enforced on API  
- Full **Codex/Gemini OTLP** adapters  
- **Manager notifications** (FR-027), rich PDF exports  
- **WCAG** audit, TLS, encryption-at-rest ops, Terraform/runbooks  
- Complete **Section 19** integration test matrix  

The repo is a **working local scaffold** with real ingest, dashboard, hourly worker path, Cursor-aware labeling, and Tier B capability messaging—not a finished production rollout.

---

## 12. How to run (developer checklist)

```bash
cd TechlioTrackingApp
pnpm install
docker compose up -d postgres redis
# If DB existed before newer migrations:
# psql ... < infra/sql/002_devices_projects_sessions.sql
# psql ... < infra/sql/003_connector_provider.sql
pnpm build
pnpm dev          # API + web + connector
pnpm dev:worker   # optional: hourly jobs + Cursor pull
```

- Dashboard: http://localhost:3000  
- API: http://localhost:3001  
- Connector health: http://127.0.0.1:9477/health  

Install the **Techlio AI Activity Companion** extension in Cursor/VS Code so the connector learns the host is Cursor and receives file/context signals.

---

*Last updated to match the codebase layout and Cursor provider behavior as of the local MVP engineering pass.*
