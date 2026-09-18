# Progress snapshot

**Overall:** MVP **feature-complete for local dev** on engineering paths; **not** production Definition of Done (legal pilot, OIDC, full §19 E2E).

**Gap list:** [pending.md](pending.md)

## Recently completed (engineering)

- §14 APIs: register/revoke, heartbeat, projects, work-items, session context, hourly-snapshot detail, activity exports, SSE (`/v1/stream/sse`)
- Device tokens (hashed), ingest secret rejection + replay id, sessionization tables, coverage gap on pause
- Late-event recalc queue (API → BullMQ → worker)
- Hourly metrics: tokens, tests/builds/files, linked event ids
- Retention job (worker, `RETENTION_DAYS`)
- Web: filters, export CSV, SSE indicator, hourly drill-down, developer self-view
- Connector: pause/resume gap events, heartbeat queue depth, extension hook
- VS Code extension: file save + task context + task completion signals
- SQL `002_devices_projects_sessions.sql`, `docs/api.md`

## Still pending (summary)

- Legal/HR (SEC-007/010), pilot report, Phase 0 live validation
- Production OIDC/SSO, full multi-tenant RBAC, Ed25519 verify on API
- Codex/Gemini OTLP, Tier B puller schedule, signed connector binaries
- FR-024 LLM summaries, FR-027 notifications (rules engine)
- TLS, encryption at rest, WCAG audit, Terraform/runbooks
- Remaining §19 integration tests (offline, idle, late E2E, heartbeat stop, etc.)
