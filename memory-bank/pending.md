# Pending work vs PRD v0.2

Source: [requirements.md](requirements.md).  
Last reviewed: 2026-09-21 (delivery-phase audit and integrity pass).

---

## Current prioritized pending list

### P0 — blocks pilot or production approval

- [ ] Obtain Legal/HR approval for the monitoring notice, consent, retention,
  access, pause, dispute, client-confidentiality, jurisdiction, and cross-border
  policy (SEC-007/010).
- [ ] Run and document one real sanitized Claude Code validation session,
  including hooks/OTel, model/tool/test/file/token coverage, licensing, and
  supported operating systems (Phase 0).
- [ ] Add live integration tests for offline queue recovery, heartbeat stop,
  pause/resume, late-event recalculation, invalid signatures, replay through the
  API, and provider-missing UI behavior (§19).
- [ ] Add production TLS and managed encryption at rest for Postgres, Redis,
  backups, and exports (SEC-003).
- [ ] Implement production SSO/OIDC and remove development authentication
  fallbacks (FR-001).

### P1 — complete the MVP product behavior

- [ ] Decide whether direct Postgres ingestion is the accepted durability
  boundary; otherwise add a durable server-side ingestion queue.
- [ ] Persist connector-reported capabilities and use them in health/coverage
  views instead of relying only on the static provider catalog (FR-012).
- [x] Surface repeated `upload_failed` (two or more in 24h), `upload_recovered`,
  and `update_required` on the live overview. Email/Slack delivery is still open.
- [x] Add per-developer current-hour event count/current context to the team
  overview (FR-020). Offline or paused connectors with no events stay blank
  rather than a zero.
- [x] Wire `/v1/developers/:id/timeline` into an employee-day hourly-card UI
  (FR-022). Labels use `ORG_TIMEZONE`.
- [x] Add work-item, coverage-state, and clock-hour filters on session history
  (FR-026). Event-type filtering already exists on the session detail timeline.
- [x] Generate a real PDF activity summary (FR-028). CSV remains the full event
  list. The PDF is an operational count by event type, not a billing document.
- [ ] Complete notification rules for repeated upload failure, unsupported
  versions, prolonged unassigned activity, and summary failure; add approved
  email/Slack delivery if required (FR-027).
- [ ] Decide FR-024 generated-summary scope. If enabled, add the database model,
  evidence links, model metadata, versioned corrections, and failure handling.
- [ ] Make hourly completeness include every relevant stale/offline/upload gap
  and expose late delivery (`received_at` versus `occurred_at`) explicitly.
- [x] Apply configured organization timezone (`ORG_TIMEZONE`) to hourly-card labels.
- [ ] Run the seven-day internal pilot and complete
  `docs/pilot-report-template.md`.

### P2 — production hardening

- [ ] Add approved, time-limited, audited support-access workflow (SEC-004).
- [ ] Enforce append-only audit records at the database-role/permission level
  while retaining an approved expiry mechanism (SEC-006/008).
- [ ] Implement 365-day retention jobs for hourly snapshots and audit records
  after legal approval (SEC-008).
- [ ] Add request IDs and idempotency keys to all write APIs where required.
- [ ] Add operational metrics for event lag, queue depth, rejected events,
  connector versions, stale heartbeats, hourly job duration, summary failures,
  and API errors (NFR-005).
- [ ] Run the 50-developer load test and record dashboard/API p95 results
  (NFR-003).
- [ ] Define and monitor the 99.5% pilot availability SLO (NFR-004).
- [ ] Add automated accessibility checks and complete a WCAG 2.1 AA review
  (NFR-007).
- [ ] Add production infrastructure-as-code, environment separation, secret
  management, and deployment/rollback automation (NFR-008).
- [ ] Execute and record backup/restore, rollback, incident-response, and
  disaster-recovery drills using `docs/ops/runbook.md`.
- [ ] Package and sign macOS/Windows connectors and move local credentials to
  the OS keychain.
- [ ] Complete the remaining ADRs for identity, privacy, storage,
  sessionization, hourly aggregation, and live updates.
- [ ] Implement Codex/Gemini adapters only after Claude Code passes the real
  pilot; configure Cursor/Copilot Tier B pullers only with approved Enterprise
  credentials.

---

## Policy & gates (unchanged — human/legal)

| Item | Status |
|------|--------|
| Monitoring notice approved (SEC-007) | Draft only (shown in Policy) |
| Legal / HR (SEC-010) | Not done |
| Section 21 open decisions | Partial — `docs/policy/open-decisions.md` |
| Phase 0 live Claude validation | Not done |
| 7-day pilot + report (§20) | Not done |
| Definition of Done (§22) | Not met (legal + production ops) |

---

## Prototype portals (resolved this pass)

| Role | Sees | Cannot see |
|------|------|------------|
| **Administrator** | Users, connector register/revoke, policy/retention, audit, team overview | Other organizations |
| **Manager** | Team overview (all org developers), hourly timelines, filters, in-app alerts, CSV/PDF export | User admin, credential issue/revoke, audit log |
| **Developer** | Own connector, own events, own hourly cards, pause/resume, collection notice | Other developers (e.g. Sam vs Alex), exports, audit, user admin |
| **Auditor** | Live `audit_log`, connector health (read), policy/retention | Developer timelines, hourly drill-down, exports, mutations |

---

## Functional requirements — remaining (not prototype-local)

| ID | Status |
|----|--------|
| FR-001 | **Partial** — JWT portals; production SSO/OIDC still pending |
| FR-006 | **Partial** — Claude hooks; Cursor companion/daily only; Codex/Gemini adapters pending |
| FR-007 | **Done locally** — register/revoke, token hash, activation key binding, API Ed25519 verification |
| FR-024 | **Deferred** — UI explains deterministic metrics only |
| FR-027 | **Partial** — in-app alerts including repeated upload failure and update required; no email/Slack |
| FR-028 | **Done locally** — CSV event list and a real PDF summary (not a billing layout) |

FR-020, FR-021, FR-022, and the session filters in FR-026 are done in the local
prototype. FR-025 session drill-down is done. Production SSO, live Claude
validation, and the seven-day pilot remain open.

FR-002/003/004/005 are implemented for the local prototype (RBAC on routes, org-scoped queries, developer self-view, pause → coverage gap).

---

## Security / NFR / ops — remaining

- SEC-003 TLS + encryption at rest (prod)
- SEC-004 support access workflow
- SEC-006 append-only audit **DB role** enforcement
- NFR-003–005 load/SLO/OTel metrics
- NFR-007 WCAG 2.1 AA audit
- NFR-008 Terraform and executed backup/restore/rollback/incident drills

---

## Tests (§19) — remaining integration

Automated: interval overlap merge, idle exclusion from the interactive span,
session classification, null (not zero) token totals, coverage-gap detection,
date-range resolution, secrets, unassigned, provider-missing, timesheet reject,
unauthorized developer view, auditor denied timeline, secret scan.

Also automated: encrypted queue peek/ack semantics, exact-body Ed25519
verification with tamper rejection, and in-process duplicate-event replay
rejection.

Still need **live integration**: offline connector, long idle, late event E2E, heartbeat stop, pause E2E, replay against API, provider-missing full UI.

---

## Tier B & packaging

- Schedule Cursor/Copilot pullers in worker with real Enterprise tokens
- macOS/Windows signed connector, OS keychain (`keytar`)
- Full OTLP pipeline

---

## Deliverables

- Remaining ADRs and executed ops/DR evidence
- `docs/ops/runbook.md` is the local baseline; production drills are not done.
- `docs/pilot-report-template.md` exists; the seven-day pilot has not started.
