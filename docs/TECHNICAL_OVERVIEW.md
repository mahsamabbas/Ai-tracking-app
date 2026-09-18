# Techlio AI Agent Activity Monitoring — Onboarding guide

This is the document to read **first** if you are new to the repo. It covers the product, how to run it, who sees what, how data moves, where code lives, and what is still unfinished.

**Related docs**

| Doc | Use it for |
|-----|------------|
| [README](../README.md) | One-page quick start |
| [API reference](./api.md) | HTTP endpoints |
| [UI vs PRD](./UI_PRD_COVERAGE.md) | Which screens map to which requirement |
| [PRD extract](../memory-bank/requirements.md) | Full product requirements (v0.2) |
| [Pending gaps](../memory-bank/pending.md) | What is still not done |
| [Monitoring notice draft](./policy/monitoring-notice-draft.md) | What we tell developers we collect |
| [Provider capability matrix](./phase0/provider-capability-matrix.md) | What each AI agent can actually emit |
| [ADR 001](./adr/001-connector-otlp-first.md) | Why the connector is OTLP/hooks-first |

The original Word PRD is `AI_Agent_Activity_Monitoring_Dashboard_Requirements.docx` at the repo root. `memory-bank/requirements.md` is the checked-in extract.

---

## 1. Start here: what problem this solves

**Sponsor:** Mahsam (CEO) · **Product owner:** Faisal (Manager) · **Org:** Techlio

Managers need **timely, reviewable evidence** of work that is visible through a developer’s **AI coding agent** (Cursor, Claude Code, and later Codex / Gemini / Copilot).

The product is an **operational visibility service**. It is **not**:

- a timesheet, payroll, billing, or invoicing system
- a measure of all human work (meetings, planning, and offline coding are invisible)
- a productivity score or developer ranking
- a keylogger / screenshot / prompt-capture tool

**Authoritative reporting unit:** one **clock-hour summary** per developer. Live status is “what we know right now”; the hourly snapshot is what you report on.

**Wording rule:** say *the agent performed*, never *the developer worked*. Missing telemetry is a **coverage gap**, never proof of inactivity.

---

## 2. Mental model (five ideas)

1. **Events first.** Everything starts as a privacy-minimized `activity_event`. Charts and hourly cards are derived from those rows.
2. **Allowlist metadata.** Events cannot carry raw prompts, responses, file bodies, shell command text, keystrokes, or screenshots. Only keys in `MetadataSchema` (`packages/event-schema`) are allowed.
3. **Five durations stay separate.** Model time, tool time, merged active time, interactive span, and elapsed session span must never be shown as one number.
4. **Hour assignment uses `occurred_at`**, not when the server received the event. Late data creates a **new snapshot version**, it does not silently overwrite.
5. **Roles are portals.** A developer must see the same metadata collected about them, and **only** that. Managers see the team. Auditors see logs and config, not timelines.

---

## 3. People, roles, and demo logins

The local prototype uses JWT sign-in at http://localhost:3000/login (no SSO yet).

| Portal | Person | Email | Password | Lands on |
|--------|--------|-------|----------|----------|
| Manager | Faisal | `manager@techlio.local` | `manager123` | `/` Team overview |
| Developer | Alex | `developer@techlio.local` | `developer123` | `/my-activity` |
| Developer | Sam | `sam@techlio.local` | `developer123` | `/my-activity` |
| Administrator | Mahsam | `admin@techlio.local` | `admin123` | `/users` |
| Auditor | Priya | `auditor@techlio.local` | `auditor123` | `/audit` |

**Alex** is the seeded local connector identity (live heartbeats when `pnpm dev` is running). **Sam** exists so you can prove isolation: managers see both; Alex cannot open Sam’s timeline.

### What each role is allowed to do (PRD §4 + current code)

| | Administrator | Manager | Developer | Auditor |
|--|---------------|---------|-----------|---------|
| Team overview (all developers) | Yes | Yes | **Own row only** | Connector coverage only; **no event charts** |
| Hourly timeline / drill-down | Yes | Yes | **Self only** | **No** |
| Export CSV / text summary | Yes | Yes | **No** | **No** |
| Register / revoke device credential | **Yes** | No | Self-register only | No |
| Create portal users | **Yes** | No | No | No |
| Pause / resume collection | Yes | No | **Own device** | No |
| Live `audit_log` | Yes | **No** | **No** | **Yes** |
| Policy / collection notice | Yes | Yes | Yes | Yes |

Permission helpers live in `packages/server-core/src/roles.ts` and are enforced on API routes. The web sidebar hides pages the role cannot use; typing a forbidden URL shows “This view is not in your portal.”

---

## 4. How to run the prototype

**Need:** Node 20+, pnpm 9, Docker Desktop (Postgres + Redis).

```bash
cd TechlioTrackingApp
pnpm install
docker compose up -d postgres redis
pnpm build
pnpm dev
```

`pnpm dev` starts **three** processes: API, web, and local connector.

Optional second terminal (hourly finalize + late recalc + retention):

```bash
pnpm dev:worker
```

Stop leftover ports:

```bash
pnpm dev:stop
```

| Service | URL | What it is |
|---------|-----|------------|
| Web | http://localhost:3000 | Next.js portals |
| API | http://localhost:3001 | NestJS + Fastify |
| Connector | http://127.0.0.1:9477/health | Local daemon on the developer machine |
| Postgres | `localhost:5432` | User `techlio` / password `techlio` / db `techlio_activity` |
| Redis | `localhost:6379` | BullMQ (worker only) |

**Existing databases:** Docker only runs `infra/sql/*.sql` on **first** volume create. If Postgres was created before later files, apply them manually:

```bash
docker exec -i $(docker compose ps -q postgres) psql -U techlio -d techlio_activity < infra/sql/002_devices_projects_sessions.sql
docker exec -i $(docker compose ps -q postgres) psql -U techlio -d techlio_activity < infra/sql/003_connector_provider.sql
docker exec -i $(docker compose ps -q postgres) psql -U techlio -d techlio_activity < infra/sql/004_portal_users.sql
```

The API also `CREATE TABLE IF NOT EXISTS` for `portal_users`, `devices`, and `activity_exports` on boot so local demos keep working.

### First 15 minutes after login

1. Sign in as **Faisal (manager)** — team table should list Alex and Sam; Alex’s connector is online/stale/paused from heartbeats; Sam is **offline** until an admin issues a credential and a connector runs as Sam.
2. Sign in as **Alex** — you should only see Alex’s events. Pause from **My activity**; a coverage gap is recorded, not “inactive.”
3. Sign in as **Sam** — empty / offline states, **zero events**, not a fake activity chart.
4. Sign in as **Mahsam** — Users + Connectors (issue/revoke device tokens).
5. Sign in as **Priya** — Audit history; no Developer day.

### IDE companion (optional but recommended)

The VS Code/Cursor extension is `apps/extension` (`techlio-activity-companion`). Commands:

- Techlio: Pause collection
- Techlio: Resume collection
- Techlio: Set task context

On activate it posts `http://127.0.0.1:9477/host` so the connector labels the provider as **Cursor** (or VS Code), not hardcoded Claude Code. File saves and task signals go to `POST /hooks/extension`.

---

## 5. High-level architecture

```text
 Developer machine                              Techlio services
 ┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
 │ IDE companion   │────▶│ Local connector  │────▶│ API (NestJS)    │
 │ Cursor / VS Code│     │ :9477 Fastify    │     │ :3001           │
 └─────────────────┘     │ encrypted SQLite │     └────────┬────────┘
                         │ redaction + sign │              │
 ┌─────────────────┐     └────────┬─────────┘              ▼
 │ Claude hooks /  │──────────────┘               ┌─────────────────┐
 │ OTLP (Tier A)   │                              │ Postgres        │
 └─────────────────┘                              │ activity_events │
                                                  │ hourly_snapshots│
 ┌─────────────────┐     ┌──────────────────┐     │ audit_log       │
 │ Worker (BullMQ) │◀───▶│ Redis            │     └────────┬────────┘
 │ :05 UTC hourly  │     └──────────────────┘              │
 └─────────────────┘                                       ▼
                                                  ┌─────────────────┐
                                                  │ Web (Next.js)   │
                                                  │ :3000           │
                                                  └─────────────────┘
```

**Two ingest paths**

| Path | Who | Auth |
|------|-----|------|
| Connector → `POST /v1/events/batch` | Local daemon | Device bearer token + `X-Device-Id` |
| Browser → dashboard APIs | Humans | JWT from `/v1/auth/login` |

Header fallback `x-role: manager` still exists for local tests unless `ALLOW_DEV_HEADER_AUTH=0`. Prefer JWT.

---

## 6. End-to-end data flow

### 6.1 On the developer machine

1. Connector starts, loads/creates an Ed25519 signing key, opens encrypted SQLite at `.techlio-connector/queue.db`.
2. Every ~30s it enqueues `heartbeat_sent` (queue depth, pause flag, provider) and flushes the queue to the API.
3. Pause/resume emits `telemetry_gap_started` / `telemetry_gap_ended` plus connector paused/resumed. The dashboard must treat this as a **coverage gap**.
4. Claude Code: `POST http://127.0.0.1:9477/hooks/claude` → `@techlio/provider-adapters`.
5. Before upload, `sanitizeEvent` strips secrets and disallowed fields.

Default connector identity (Alex):

| Field | UUID / value |
|-------|----------------|
| Organization | `550e8400-e29b-41d4-a716-446655440010` |
| Developer (Alex) | `550e8400-e29b-41d4-a716-446655440011` |
| Device | `550e8400-e29b-41d4-a716-446655440012` |
| Device token | `dev-device-token` (dev only) |
| Sam’s developer id | `550e8400-e29b-41d4-a716-446655440021` |

### 6.2 Ingestion (`packages/server-core` → `ingestBatch`)

1. Validate with `EventBatchSchema`.
2. Reject org mismatch, replayed `event_id`, secrets, schema violations.
3. Insert `activity_events` with `ON CONFLICT DO NOTHING` (idempotent).
4. Heartbeats update `connector_health`.
5. Session/context events update `agent_sessions` / `session_context_versions`.
6. Events in an already-finalized hour enqueue BullMQ job `hourly-recalc`.

### 6.3 Hourly worker (`apps/worker`)

Scheduled ~**:05 UTC** after each hour:

- Load events for `(organization, developer, hour)` using **`occurred_at`**.
- Compute the five durations in `@techlio/aggregation`.
- Write `hourly_snapshots` (`metrics` JSON includes counts and source `eventIds` when present).
- Late events → new row, higher `version`, visible `recalc_reason`.
- Daily: purge events older than `RETENTION_DAYS` (default 90).
- Optional: `CURSOR_API_KEY` pulls Cursor **daily usage + Analytics API**; `GITHUB_TOKEN` + `GITHUB_ORG` pull Copilot daily user reports — all as `provider_daily_aggregate` events.

Today the worker finalizes the **seeded Alex** developer id. Expanding that loop to every developer in the org is a known follow-up.

### 6.4 Dashboard

- Overview polls every 30s and listens to `GET /v1/stream/sse?access_token=…` (EventSource cannot send `Authorization` headers).
- Charts are computed in the browser from recent events (`apps/web/src/lib/analytics.ts`).
- Hourly cards come from `hourly_snapshots`; drill-down loads source events for that hour.

---

## 7. Event model (the contract)

Defined in `packages/event-schema`. **Do not add metadata keys without updating `MetadataSchema`.** Allowed examples: `model_name`, `tool_category`, `token_input` / `token_output`, `file_path` / `path_category`, `gap_reason`, `connector_paused`, `tier`, `daily_only`.

Required event fields: `event_id`, `schema_version` (`1.0.0`), `organization_id`, `developer_id`, `device_id`, `provider`, `connector_version`, `event_type`, `occurred_at`, `consent_version`.

### Catalog (PRD §10)

| Group | Types |
|-------|--------|
| Connector lifecycle | `connector_started/stopped`, `heartbeat_sent`, `connector_paused/resumed`, `update_required`, `upload_failed/recovered` |
| Session | `session_started/heartbeat/paused/resumed/ended`, `task_context_changed` |
| Model | `model_request_started/completed` |
| Tools | `tool_started/completed` (`file_read`, `file_write`, `shell`, `search`, `test`, `build`, `browser`, `other`) |
| Engineering checks | `test_*`, `build_*`, `lint_*`, `typecheck_*` |
| Files | `file_created/modified/deleted` (path or category, **no body**) |
| Hourly | `hour_opened/finalized/recalculated`, `summary_generated/failed` |
| Coverage | `telemetry_gap_started/ended`, `provider_capability_missing`, `late_events_received`, `unassigned_activity_detected` |
| Tier B | `provider_daily_aggregate` |

### Five durations (PRD §11) — never merge in UI

| Metric | Meaning |
|--------|---------|
| Model duration | Time in model calls (clipped to the hour) |
| Tool duration | Time in tools |
| Merged active | Union of model+tool intervals (overlaps not double-counted) |
| Interactive span | Session activity excluding idle gaps (default **10 minutes**) |
| Elapsed session span | First event → last event in the hour (idle included) |

If the provider does not expose a metric, show **“Not available from provider”**, never `0`.

### Provider tiers (FR-012)

| Tier | Examples | Hourly model/tool/session |
|------|----------|---------------------------|
| **A** | Claude Code, Codex, Gemini (connector hooks / OTLP) | Yes, when the agent emits it |
| **B** | Cursor, GitHub Copilot | **Daily aggregates only** |

This repo is usually opened in **Cursor**, so the local connector defaults to provider `cursor` (Tier B). Claude events are tagged `claude_code` only when Claude hooks actually fire. That is why hourly model/tool cards often show the empty state even though heartbeats and file-save events exist.

---

## 8. Web app map

App: `apps/web` (Next.js 15, App Router, Tailwind). Auth is client-side: JWT in `localStorage` key `techlio-jwt` (`apps/web/src/lib/auth-context.tsx`).

| Route | Who | What you see |
|-------|-----|----------------|
| `/login` | Public | Demo portal picker |
| `/` | Manager, admin, developer | Overview. Manager/admin: full team + export. Developer: own signals only |
| `/developer-day` | Manager, admin, developer | Hourly cards. Manager/admin pick a developer |
| `/hourly/[id]` | Manager, admin, developer | Metrics, versions, source events. FR-024 narrative is **not** generated |
| `/my-activity` | Developer | Own connector, pause/resume, own events |
| `/users` | Admin | List/create portal users |
| `/connectors` | Admin, manager, auditor | Health. Admin can issue/revoke credentials |
| `/policy` | All signed-in roles | Collection notice + retention |
| `/audit` | Auditor, admin | Live rows from `audit_log` |

Shell: `apps/web/src/components/AppShell.tsx` — viewport-locked sidebar, scrolling main pane, mobile drawer.

---

## 9. API map

Base: `http://localhost:3001`. Full table: [api.md](./api.md).

**Humans (JWT)**

| Method | Path | Typical roles |
|--------|------|----------------|
| POST | `/v1/auth/login` | Public |
| GET | `/v1/auth/me` | Any signed-in |
| GET | `/v1/dashboard/team` | All roles (payload scoped) |
| GET | `/v1/developers/:id/timeline` | Manager, admin, matching developer |
| GET | `/v1/hourly-snapshots/:id` | Same as timeline |
| GET/POST | `/v1/users` | Admin |
| GET | `/v1/org/developers` | Signed-in (developers filtered to self) |
| GET | `/v1/org/policy` | Signed-in |
| GET | `/v1/audit-log` | Auditor, admin |
| POST | `/v1/connectors/register` | Admin, or developer for self |
| POST | `/v1/connectors/:id/revoke` | Admin |
| POST | `/v1/connectors/:id/pause` / `resume` | Developer (own) or admin |
| POST | `/v1/activity-exports` | Manager, admin |
| GET | `/v1/projects`, `/v1/work-items` | Signed-in |
| POST | `/v1/sessions/:id/context` | Developer (self) |
| GET | `/v1/stream/sse` | JWT as `access_token` query param |

**Connector (device token)**

| Method | Path |
|--------|------|
| POST | `/v1/events/batch` |
| POST | `/v1/connectors/:id/heartbeat` |

`POST /v1/events/timesheet` always returns **404** `timesheet_import_not_supported`.

---

## 10. Database (Postgres)

SQL lives in `infra/sql/`. ORM is **Drizzle** in `packages/server-core/src/schema.ts`.

| Table | Purpose |
|-------|---------|
| `organizations` | Tenant, timezone, retention boundary |
| `portal_users` | JWT identities (email, role, optional `developer_id`) |
| `activity_events` | Append-only normalized events (`payload` JSONB) |
| `hourly_snapshots` | Versioned metrics per developer per clock hour |
| `connector_health` | Last heartbeat, version, queue depth, paused, provider |
| `devices` | Hashed device tokens, revoke timestamp |
| `agent_sessions` / `session_context_versions` | Sessions and task-context history |
| `projects` / `work_items` | Optional context pick lists |
| `audit_log` | Login, register, pause, export, user create, ingest counts |
| `activity_exports` | Generated CSV/text payloads |

**There are no timesheet, billing, invoice, or ranking tables.** Do not add them.

Seeded projects: “Techlio Platform”, “Internal Tools”, work item “Activity dashboard MVP”.

---

## 11. Monorepo map — where to change what

**Tooling:** pnpm workspaces + Turborepo, TypeScript everywhere.

| If you need to… | Go here |
|-----------------|--------|
| Change allowed event fields | `packages/event-schema` |
| Change how durations are calculated | `packages/aggregation` |
| Map Claude hooks → events | `packages/provider-adapters` |
| Pull Cursor/Copilot daily APIs | `packages/puller` |
| Ingest, RBAC, hourly finalize, exports | `packages/server-core` |
| HTTP routes / JWT | `apps/api` |
| Hourly schedule / retention | `apps/worker` |
| Screens, charts, portals | `apps/web` |
| Local queue, redaction, upload | `apps/connector` |
| Pause / file-save / task context in the IDE | `apps/extension` |
| SQL | `infra/sql/` |
| Section 19 tests | `tests/e2e/scenarios/section19.test.ts` |
| Agent/product memory | `memory-bank/` |
| Cursor agent rules | `.cursor/rules/` |

After changing `@techlio/server-core`, run `pnpm --filter @techlio/server-core build`. The API imports the **compiled** `dist/` types.

Useful root scripts: `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm dev`, `pnpm dev:worker`, `pnpm dev:stop`.

---

## 12. Environment variables

| Variable | Where | Default / meaning |
|----------|--------|-------------------|
| `DATABASE_URL` | API, worker | `postgres://techlio:techlio@localhost:5432/techlio_activity` |
| `REDIS_HOST` / `REDIS_PORT` | API, worker | `localhost` / `6379` |
| `JWT_SECRET` | API | Dev placeholder — change in production |
| `NEXT_PUBLIC_API_URL` | Web | `http://localhost:3001` |
| `TECHLIO_API_URL` | Connector | `http://localhost:3001` |
| `TECHLIO_DEVICE_TOKEN` | Connector | `dev-device-token` |
| `TECHLIO_ORG_ID` / `TECHLIO_DEV_ID` / `TECHLIO_DEVICE_ID` | Connector | Seeded Alex UUIDs |
| `TECHLIO_PROVIDER` | Connector | `cursor` |
| `CONNECTOR_PORT` | Connector | `9477` |
| `CONNECTOR_DB` | Connector | `.techlio-connector/queue.db` |
| `CONNECTOR_SIGNING_KEY_HEX` | Connector | Auto-created if unset |
| `RETENTION_DAYS` | Worker | `90` |
| `CURSOR_API_KEY` | Worker | Cursor daily usage + Enterprise Analytics (DAU, agent edits) |
| `GITHUB_TOKEN` / `GITHUB_ORG` | Worker | GitHub Copilot org daily user report |
| `ORG_TIMEZONE` | Policy API | `UTC` (labels only; timestamps stored UTC) |
| `ALLOW_DEV_HEADER_AUTH` | API | Set `0` to require JWT even locally |

---

## 13. Invariants (do not break these)

From the PRD and `.cursor/rules/privacy-guardrails.mdc`:

1. **Allowlist metadata** — no arbitrary JSON on events.
2. **Idempotent ingest** — same `event_id` never double-counts.
3. **Five durations** — never collapse them in the UI.
4. **Hour boundary** — `occurred_at`; late data → new snapshot version.
5. **Coverage gaps** — pause / offline / stale heartbeat are explicit states (`offline`, `paused`, `stale`, `online`). Required empty states also include: no activity observed, provider does not expose this metric, events delayed, no task selected.
6. **No timesheet / billing / ranking** — not in schema, API, UI, or exports.
7. **Org scope** — every query filters `organization_id`.
8. **Developer transparency** — a developer can see the same metadata collected about them.

---

## 14. Testing

```bash
pnpm test
```

| Layer | What exists |
|-------|-------------|
| Unit | Aggregation interval merge, event schema, connector redaction, secret scan |
| E2E package | Overlap durations, secrets, unassigned sessions, timesheet reject, developer cannot view another developer, auditor cannot view timelines |
| CI | `pnpm build` + `pnpm test` via Turborepo |

Still missing live integration: offline queue → later upload, long idle, late-event E2E against the API, heartbeat stop, pause E2E, signature replay. See [pending.md](../memory-bank/pending.md).

---

## 15. What is implemented vs not

**This repo is a working local prototype**, not production Definition of Done (PRD §22).

**In good shape locally**

- JWT portals and RBAC (admin / manager / developer / auditor)
- Connector collect → redact → queue → ingest
- Team overview, developer day, hourly drill-down, my activity
- Pause → coverage gap, unassigned task context
- Hourly snapshot versioning path (worker)
- CSV / text export (audited)
- Live audit log, admin user + credential management
- Explicit empty states for Tier B / offline / paused

**Not done (do not pretend otherwise)**

| Area | Status |
|------|--------|
| Legal / HR monitoring notice (SEC-007, SEC-010) | Draft only |
| Production SSO / OIDC (FR-001) | JWT only |
| Ed25519 verify on API ingest (SEC-006) | Connector signs; API enforcement not production-hard |
| LLM hourly narrative (FR-024) | Deferred; UI says metrics are deterministic |
| Email / Slack notifications (FR-027) | In-app alerts only |
| Full PDF layout (FR-028) | Text/CSV stand-in |
| Codex / Gemini OTLP adapters (FR-006) | Claude hooks exist; others pending |
| Worker hourly job for **every** developer | Seeded Alex id today |
| TLS, encryption at rest, Terraform, WCAG 2.1 AA audit | Production ops |
| 7-day pilot + report, Phase 0 live Claude validation | Human process |
| Signed connector binaries / OS keychain | Packaging |

---

## 16. Glossary

| Term | Meaning |
|------|---------|
| Agent event | Timestamped activity record from the connector or provider |
| Agent active time | Merged model+tool duration — **not** “hours the developer worked” |
| Interactive session span | First→last observed activity excluding configured idle gaps |
| Hourly summary | Versioned snapshot for one developer and one clock hour |
| Coverage gap | Period we cannot confirm capture (pause, stale, offline, upload failure) |
| Work item context | Optional project/task label; **not** a timesheet |
| Stale connector | No heartbeat within 5 minutes (configurable) |
| Tier A / B | Hourly telemetry vs daily-only provider APIs |
| Live status | Last known connector/session state, target &lt; 60 seconds after ingest |

---

## 17. If something looks empty or “wrong”

| You see | Likely cause |
|---------|----------------|
| Heartbeats only, no model/tool charts | You are on **Cursor (Tier B)**. That is expected until Claude/OTLP events arrive |
| Sam has no activity | Sam has no running connector. Admin must issue a device token and run a connector as Sam’s ids |
| No hourly cards | Worker has not finalized the hour (`pnpm dev:worker`). Cards appear after `:05 UTC` or a late recalc |
| “Database not connected” | Docker Desktop not running, or migrations not applied |
| Login works but APIs 401 | JWT expired (12h) or `localStorage` key `techlio-jwt` cleared — sign in again |
| Connector register 500 `devices does not exist` | Apply `002_devices_projects_sessions.sql` or restart API so boot DDL runs |

---

## 18. Suggested learning path

1. Run the stack and click all five demo portals (§3–4).
2. Read this file through §7 (events + five durations).
3. Skim `packages/event-schema/src/event.ts` and `packages/server-core/src/ingest.ts`.
4. Follow one heartbeat: connector `apps/connector/src/index.ts` → API `events.controller.ts` → `connector_health` → overview.
5. Read `memory-bank/requirements.md` sections 3, 8, 11, 12 when you implement a feature.
6. Before coding, check `.cursor/rules/privacy-guardrails.mdc` and [pending.md](../memory-bank/pending.md).

---

*Last updated 2026-09-18 to match portal isolation, JWT roles, Cursor-as-default provider, and the local MVP layout.*
