# API reference

Base URL `http://localhost:3001`. All dashboard endpoints require
`Authorization: Bearer <jwt>` from `POST /v1/auth/login`. Every query is scoped
to the caller's organisation and role; a developer can only ever resolve to
their own `developerId`, and an auditor cannot read individual activity at all.

## Date ranges

Analytics endpoints accept either a preset or an explicit window:

| Param | Values |
|-------|--------|
| `preset` | `today`, `yesterday`, `7d` (default), `30d`, `90d` |
| `from` / `to` | ISO-8601 timestamps; `from` wins over `preset` |

Each response echoes the resolved `range` and `preset`, and comparison figures
(`previousTotals`) use the immediately preceding window of the same length.

## Auth

| Method | Path | Notes |
|--------|------|-------|
| POST | `/v1/auth/login` | `{ email, password }` → `{ token, user, homePath }` |
| GET | `/v1/auth/me` | Verifies the token, returns the user |

## Analytics

| Method | Path | Returns |
|--------|------|---------|
| GET | `/v1/analytics/organization` | Org totals, previous-period totals, headcount, daily trend, tool distribution, hour and weekday patterns, session classifications, tool categories, coverage, per-team rollup. Filters: `team`, `provider` |
| GET | `/v1/analytics/coverage` | Coverage summary alone (gap events, paused/stale/offline connectors, partial and unassigned sessions, employees with no telemetry) |
| GET | `/v1/meta/filters` | Teams, projects, and provider capabilities for filter controls |

## Employees

| Method | Path | Returns |
|--------|------|---------|
| GET | `/v1/employees` | Directory rows: connector state (worst across their devices), AI active / productive / idle time, sessions, average session, tools used, daily sparkline, last active. Filters: `search`, `team`, `provider`, `status`, `connectorState`, `sort` (`activity`\|`sessions`\|`recent`\|`name`) |
| GET | `/v1/employees/{id}` | Profile, devices, totals, previous totals, daily trend, tools, hour/weekday patterns, classifications, tool categories, models, projects, idle periods, recent sessions |
| GET | `/v1/employees/{id}/tools/{provider}` | The same shape scoped to one AI tool, plus that provider's declared capability limits and the tool's share of the employee's AI time |
| GET | `/v1/employees/{id}/sessions` | Paged session history. Filters: `provider`, `classification`, `projectId`, `page`, `pageSize` |

## Sessions and hours

| Method | Path | Returns |
|--------|------|---------|
| GET | `/v1/sessions/{id}` | Session row with all five durations, project/work item, full source-event trail, versioned context changes, previous/next session ids, provider capability |
| GET | `/v1/developers/{id}/timeline` | Hourly summary cards. `hours` (default 48, max 336) |
| GET | `/v1/hourly-snapshots/{id}` | Deterministic metrics, recalculation versions, and the source events behind them |

## Live status

| Method | Path | Returns |
|--------|------|---------|
| GET | `/v1/dashboard/live` | Connector states, sessions active in the last 24h, grouped coverage alerts, recent events. `limit` caps the event list |
| GET | `/v1/stream/sse` | Server-sent events for near-live updates. Polling `/v1/dashboard/live` is the supported fallback and is what the dashboard uses |

## Ingestion (connector credentials, not user JWTs)

| Method | Path | Notes |
|--------|------|-------|
| POST | `/v1/events/batch` | Requires `Authorization: Bearer <device-token>`, `X-Device-Id`, and Ed25519 `X-Signature` over the exact JSON body. Idempotent on `event_id`; rejects invalid signatures, replays, org/device mismatches, and secrets |
| POST | `/v1/connectors/register` | Administrator issues a revocable device credential |
| POST | `/v1/connectors/activate` | Developer activates an assigned credential, accepts the collection notice, and binds the installation's Ed25519 public key |
| GET | `/v1/connectors/mine` | Developer lists assigned connector credentials (tokens are never returned) |
| POST | `/v1/connectors/{id}/heartbeat` | Health, version, queue depth, pause state |
| POST | `/v1/connectors/{id}/pause` \| `/resume` | Records an authorised pause and emits a coverage-gap event |
| POST | `/v1/connectors/{id}/revoke` | Administrator only |
| GET | `/v1/connectors/{id}/health` | Single connector health |
| POST | `/v1/sessions/{id}/context` | Versioned project / work-item context change |
| POST | `/v1/events/timesheet` | Always `404`. No endpoint accepts submitted hours |

## Organisation administration

| Method | Path | Role |
|--------|------|------|
| GET/POST | `/v1/users` | Administrator |
| GET | `/v1/org/developers` | Any signed-in role (scoped) |
| GET | `/v1/org/policy` | Any signed-in role |
| GET | `/v1/audit-log` | Auditor, administrator |
| GET | `/v1/projects`, `/v1/work-items` | Any signed-in role |
| POST | `/v1/activity-exports` | Manager, administrator. CSV or text; never includes billing conclusions |
| GET | `/v1/activity-exports/{id}` | Downloads a previously created export |

## Error shape

Errors return the NestJS default: `{ statusCode, message, error }`. `403` means
the record exists but is outside the caller's scope; `404` means it does not
exist in their organisation.
