# UI ↔ PRD coverage

Where each functional requirement from [requirements.md](../memory-bank/requirements.md)
is satisfied in the shipped product.

## §8.1 Identity, access, transparency

| ID | Where |
|----|-------|
| FR-001 Authentication | `/login`, JWT issued by `POST /v1/auth/login`. SSO/OIDC still to do |
| FR-002 Role-based access | `packages/server-core/src/roles.ts` enforced on every controller; nav and routes filtered in `AppShell` |
| FR-003 Organisation boundary | Every query filters `organization_id`; developer requests additionally pin `developer_id` |
| FR-004 Developer visibility | A developer's landing page is `/employees/<self>` — the *same* analytics surface a manager sees, not a reduced one |
| FR-005 Pause and disclosure | `/connectors` pause/resume; `/policy` states the behaviour; a pause emits `telemetry_gap_started` and shows as a coverage gap on the employee and session pages |

## §8.2 Connector

| ID | Where |
|----|-------|
| FR-006 Supported provider | `PROVIDER_CAPABILITIES` in `@techlio/event-schema`; Cursor and Claude Code are Tier A through the local connector, Copilot and the VS Code companion are partial |
| FR-007 Device registration | `POST /v1/connectors/register`, revocable from `/connectors` |
| FR-008 Local redaction | `apps/connector/src/redaction.ts`, re-scanned server-side in `security.ts` |
| FR-009 Offline queue | `apps/connector/src/queue.ts` |
| FR-010 Heartbeat and version | `/connectors` table: state, last heartbeat, queue depth, version |
| FR-011 Task context | Session detail → **Task context** tab shows versioned changes; unassigned sessions are labelled “No task selected” everywhere |
| FR-012 Capability declaration | Tool drill-down shows the provider's declared limits; unavailable metrics render as “Not available from provider” |

## §8.3 Collection and processing

| ID | Where |
|----|-------|
| FR-013 Event capture | Session detail event timeline, filterable by activity type |
| FR-014 Engineering outcomes | Session **Usage metrics** tab; org and employee “Engineering outcomes” cards |
| FR-015 File-change metadata | Path *category* only; no file bodies anywhere |
| FR-016 Idempotent ingestion | `ON CONFLICT DO NOTHING` on `event_id` plus a replay guard in `ingest.ts` |
| FR-017 Sessionization | `sessionize.ts` opens a session on any session-bearing event; `computeSessionMetrics` merges overlapping intervals |
| FR-018 Idle handling | 10-minute threshold; idle surfaces as its own metric, band, and “Idle & coverage periods” list |
| FR-019 Coverage gaps | Coverage callouts on employee and session pages, grouped alerts on `/` and `/connectors`, coverage counters in the org summary |

## §8.4 Dashboard and summaries

| ID | Where |
|----|-------|
| FR-020 Team overview | `/employees` — connector state, context, last active, sessions, usage, coverage warning per person |
| FR-021 Recent activity | `/` polls `/v1/dashboard/live` every 30s; SSE remains available at `/v1/stream/sse` |
| FR-022 Hourly timeline | `/hourly/[id]` cards with all five durations kept separate |
| FR-023 Hourly finalisation | Worker finalises at :05; late events create a new version, visible in the recalculation history |
| FR-024 Generated summary | Deliberately not enabled. The hourly page states that metrics are deterministic and no AI narrative is attached |
| FR-025 Drill-down | Organisation → Employees → Employee → AI tool → Sessions → Session → source events, with breadcrumbs at every level |
| FR-026 Filters | Date range (today/yesterday/7d/30d/90d/custom) everywhere, plus team, AI tool, connector state, activity type, project, and search |
| FR-027 Notifications | Grouped in-app coverage alerts on `/` and `/connectors`. Email/Slack delivery still to do |
| FR-028 Export | `POST /v1/activity-exports`; CSV and text, no billing conclusions |

## §12 Required empty states

Each is a distinct variant in `components/ui/States.tsx`, never interchangeable:

| State | Copy |
|-------|------|
| No activity observed | “The connector reported in, but no agent sessions occurred in this period.” |
| Connector offline | “No telemetry was received… Missing telemetry is not evidence of inactivity.” |
| Collection paused | “A coverage gap is recorded instead of a silent blank.” |
| Provider does not expose this metric | “The value is unavailable — it is not zero.” |
| Events delayed | “Figures may change when the queue drains.” |
| No task selected | “Activity in this period was not linked to a project or work item.” |
| No matches (filters) | Offers to clear filters or widen the range |

## §3 Non-goals — actively enforced

- No timesheet entity, endpoint, or field. `POST /v1/events/timesheet` returns 404.
- No leaderboard or score. The directory sorts on user request; the product never ranks.
- Session classification describes *observed agent activity*. `idle_dominant`
  reads “Mostly idle” and its explanation says plainly that it describes the
  telemetry, not the person.
- Every screen that shows usage carries the caveat that planning, review,
  meetings, and manual coding are invisible to the system.

## Still open

Legal/HR sign-off (SEC-007, SEC-010), production SSO/OIDC, Ed25519 verification
at the API, email/Slack notification delivery, full PDF export layout, WCAG
audit, Terraform and runbooks, and the seven-day pilot report.
