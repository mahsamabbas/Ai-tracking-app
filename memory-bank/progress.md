# Progress snapshot

**Overall:** the monitoring product works end-to-end on a local stack — data
model, analytics API, drill-down UI, role isolation, and realistic connected
data. **Not** production Definition of Done: legal approval, a real provider
pilot, production hardening, and the §19 live integration tests remain.

**Gap list:** [pending.md](pending.md)

## Delivered in the monitoring refactor

**Data**
- `employees` table; `agent_sessions` carries precomputed metrics (five
  durations, idle, counts, models, tool categories, classification, coverage).
- Real migration runner (`scripts/migrate.mjs` + `schema_migrations`); runtime no
  longer creates tables on boot.
- Deterministic 90-day seed for a 12-person org, including the awkward cases the
  product must handle.

**API**
- `/v1/analytics/organization`, `/v1/analytics/coverage`, `/v1/meta/filters`
- `/v1/employees`, `/v1/employees/:id`, `/v1/employees/:id/tools/:provider`,
  `/v1/employees/:id/sessions`, `/v1/sessions/:id`
- `/v1/dashboard/live` replaces the old `/v1/dashboard/team`: connector states,
  24h sessions, grouped coverage alerts, recent events.
- Every analytics endpoint is range-aware and returns period-over-period
  comparison figures.

**UI**
- Rebuilt design system: tokens in `globals.css`, `ui/` primitives, `charts/`,
  `domain/`, `filters/`, shared vocabulary in `lib/vocab.ts`.
- The six PRD empty states are distinct variants, plus loading skeletons, error
  with retry, and not-found.
- Responsive desktop/tablet; sidebar collapses to a drawer below `lg`.
- Removed: `/developer-day`, `/my-activity`, eleven one-off components, and all
  browser-side metric computation.

**Tests**
- 22 unit tests in `@techlio/server-core` covering interval merging, idle
  exclusion, classification, null token totals, coverage gaps, and range
  resolution — the §19 scenarios that are testable without a live connector.
- Connector queue tests prove rows survive until acknowledgement; API crypto
  tests prove exact signed bodies pass and tampering fails.

## 2026-09-21 integrity and phase-audit pass

- Ed25519 keys bind at connector activation; `/v1/events/batch` verifies
  `X-Signature` for issued devices.
- Connector activation requires and audits collection-notice acknowledgement.
- The encrypted queue now uses peek/ack semantics instead of delete/re-enqueue.
- Cursor is truthfully Tier B/companion telemetry; Codex/Gemini are marked
  unavailable and OTLP stubs return 501 instead of silently dropping data.
- Hourly worker finalizes every active employee; coverage-event hours are
  explicitly partial and duplicate version jobs are idempotent.
- Added `docs/PHASE_DELIVERY_AUDIT.md`, ops runbook, and pilot report template.

## Still pending

- Legal/HR (SEC-007/010), pilot report, Phase 0 live validation
- Production OIDC/SSO
- FR-024 LLM summaries (deliberately not enabled), FR-027 email/Slack delivery
- Full PDF export layout
- TLS, managed encryption at rest, WCAG audit, Terraform, and executed ops drills
- Live §19 integration: offline queue, long idle, late-event E2E, heartbeat stop,
  pause E2E, signature replay
