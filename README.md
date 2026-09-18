# Techlio · AI Agent Activity Monitoring

An employee AI-activity monitoring dashboard. It shows managers how AI coding
tools — Cursor, Claude Code, Copilot — are actually being used across an
organisation, and lets them drill from the org down to a single agent operation:

```
Organisation → Employees → Employee → AI tool → Sessions → Session detail
```

It is an **operational visibility** product, not timekeeping. It never accepts
timesheets, never ranks people, and never treats missing telemetry as proof that
someone was not working. See [memory-bank/requirements.md](memory-bank/requirements.md)
(PRD v0.2) — every screen traces back to it.

## Quick start

Requires Docker (Postgres + Redis) and pnpm.

```bash
pnpm install
docker compose up -d postgres redis
pnpm db:migrate     # applies infra/sql/*.sql once each, tracked in schema_migrations
pnpm db:seed        # 90 days of realistic telemetry for a 12-person org
pnpm dev            # API :3001, web :3000, connector :9477
```

Then open <http://localhost:3000> and sign in.

| Portal | Email | Password | Lands on |
|--------|-------|----------|----------|
| Manager | `manager@techlio.local` | `manager123` | Organisation overview |
| Administrator | `admin@techlio.local` | `admin123` | Organisation overview + access & connectors |
| Developer | `developer@techlio.local` | `developer123` | Their own analytics only |
| Auditor | `auditor@techlio.local` | `auditor123` | Audit history, no individual timelines |

Optional: `pnpm dev:worker` (hourly finalisation, late-event recalculation,
retention, Tier B provider pulls — needs Redis).

## The screens

| Route | Who | What it answers |
|-------|-----|-----------------|
| `/` | Manager, admin, developer | How is the org using AI tools right now and over time? |
| `/employees` | Manager, admin | Who uses what, how much, and whose telemetry is incomplete? |
| `/employees/[id]` | Manager, admin, self | One person: usage, trends, patterns, tools, projects, idle periods, sessions |
| `/employees/[id]/tools/[provider]` | Manager, admin, self | That person's use of one AI tool specifically |
| `/employees/[id]/sessions` | Manager, admin, self | Full session history with tool / activity / project filters |
| `/sessions/[id]` | Manager, admin, self | One session: durations, metrics, task context, full event trail |
| `/hourly/[id]` | Manager, admin, self | One clock hour's deterministic summary and its source events |
| `/connectors` | Admin, manager, auditor | Connector health, pause/resume, credential revocation |
| `/users` | Admin | Organisation membership and roles |
| `/audit` | Auditor, admin | Append-only access and configuration history |
| `/policy` | All | What is collected, what never is, retention, and your rights |

Every date filter accepts today / yesterday / 7d / 30d / 90d / custom, and every
figure is compared against the immediately preceding period of the same length.

## How the numbers work

The five duration metrics are stored and displayed **separately** — the PRD
forbids merging them into one headline number:

| Metric | Meaning |
|--------|---------|
| Model duration | Time model requests were executing |
| Tool duration | Time tool, test, and build operations were executing |
| Merged active | Union of the two above — parallel calls counted once |
| Interactive span | First to last event, minus gaps over the 10-minute idle threshold |
| Elapsed span | First to last event, unadjusted |

`Idle = elapsed − interactive`. Sessions carry an evidence-based classification
(`engineering_output`, `assisted_editing`, `exploration`, `idle_dominant`) that
describes *observed agent activity*, never a person's effort or worth.

Metrics a provider does not report render as **“Not available from provider”**,
never as zero. Coverage gaps, pauses, stale connectors, and unassigned sessions
each have their own distinct empty state.

## Layout

| Package | Role |
|---------|------|
| `@techlio/event-schema` | Normalised event model and approved catalog (PRD §9–10), provider capabilities |
| `@techlio/aggregation` | Interval merging and hourly duration rules (§11) |
| `@techlio/server-core` | DB, ingest, sessionization, session metrics, analytics queries, RBAC, exports, seed |
| `@techlio/provider-adapters` | Claude hooks → normalised events |
| `@techlio/puller` | Tier B daily pulls (Cursor Admin API, Copilot reports) |
| `apps/api` | NestJS + Fastify: ingest, analytics, auth, admin |
| `apps/web` | Next.js 15 dashboard |
| `apps/connector` | Local connector: redaction, signing, encrypted offline queue |
| `apps/worker` | BullMQ jobs: hourly finalise, recalculation, retention |
| `apps/extension` | VS Code / Cursor companion: file and task-context signals |

- [Technical overview](docs/TECHNICAL_OVERVIEW.md)
- [API reference](docs/api.md)
- [PRD coverage](docs/UI_PRD_COVERAGE.md)
- [Monitoring notice draft](docs/policy/monitoring-notice-draft.md) — read before enabling collection on anyone's machine

## Demo data

`pnpm db:seed` generates a deterministic 12-person organisation across four
teams: ~2,300 sessions and ~237,000 events over 90 days, spanning Cursor, Claude
Code, Copilot, and the VS Code companion. It deliberately includes the awkward
cases the product must handle — stale and offline connectors, a paused one, a
person with no telemetry at all, unassigned sessions, coverage gaps mid-session,
failed tests and builds, weekend and idle patterns.

Because seeded heartbeats are static, the API re-anchors *only* the seeded
connector heartbeats once a minute so the intended online/stale/paused/offline
mix stays visible. It touches nothing else, and is disabled with
`DEMO_CONNECTOR_KEEPALIVE=0` or in production.

## Privacy posture

Prompts, model responses, source code, command text, keystrokes, and screenshots
are never collected. Metadata is allowlisted in `@techlio/event-schema`, redacted
at the connector, and re-scanned at ingest — events carrying secrets are rejected
and raise an operational alert.
