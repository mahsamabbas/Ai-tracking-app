# Techlio Activity API (v1)

Base URL: `http://localhost:3001` (dev).

## Authentication

- **Dashboard:** `x-role` header (`manager`, `developer`, `administrator`, `auditor`).
- **Connector ingest:** `Authorization: Bearer <device-token>` and `X-Device-Id: <uuid>` (optional if device id is in first event).

## Endpoints

| Method | Path | Notes |
|--------|------|--------|
| POST | `/v1/connectors/register` | Returns `{ deviceId, token }` |
| POST | `/v1/connectors/:id/revoke` | Admin only |
| POST | `/v1/connectors/:id/heartbeat` | Bearer token |
| POST | `/v1/connectors/:id/pause` | Creates coverage gap event |
| POST | `/v1/events/batch` | Signed batch; idempotent by `event_id` |
| GET | `/v1/projects` | Org-scoped project list |
| GET | `/v1/work-items` | Optional `q`, `projectId` |
| POST | `/v1/sessions/:id/context` | Task context change |
| GET | `/v1/dashboard/team` | Filters: `developerId`, `eventType`, `provider` |
| GET | `/v1/developers/:id/timeline` | Hourly cards |
| GET | `/v1/hourly-snapshots/:id` | Metrics + source events + versions |
| POST | `/v1/activity-exports` | Body: `{ format: "csv" \| "pdf" }` |
| GET | `/v1/activity-exports/:id` | Download export |
| GET | `/v1/stream/sse` | Server-Sent Events (15s tick) |

## Errors

- `401` — missing/invalid token or role
- Rejected events may include `reasons: ["replay", "secret:...", "schema"]`

## Database migrations

After `001_init.sql`, apply `infra/sql/002_devices_projects_sessions.sql`.
