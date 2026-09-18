# Pending work vs PRD v0.2

Source: [requirements.md](requirements.md).  
Last reviewed: 2026-09-18 (monitoring-product refactor).

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
| FR-006 | **Partial** — Claude hooks; Codex/Gemini OTLP adapters pending |
| FR-007 | **Partial** — register/revoke + hash; API Ed25519 verify not enforced |
| FR-024 | **Deferred** — UI explains deterministic metrics only |
| FR-027 | **Partial** — in-app health notifications; no email/Slack delivery |
| FR-028 | **Partial** — CSV + text export (not full PDF layout) |

FR-020/021/022/025/026 are **done**: the employee directory, 30s live polling,
hourly cards, the full Organisation → Employees → Employee → AI tool → Sessions →
Session → source-events drill-down, and date/team/tool/activity/project/connector
filters on every relevant screen.

FR-002/003/004/005 are implemented for the local prototype (RBAC on routes, org-scoped queries, developer self-view, pause → coverage gap).

---

## Security / NFR / ops — remaining

- SEC-003 TLS + encryption at rest (prod)
- SEC-004 support access workflow
- SEC-006 append-only audit **DB role** enforcement
- NFR-003–005 load/SLO/OTel metrics
- NFR-007 WCAG 2.1 AA audit
- NFR-008 Terraform, runbooks, backup/restore drills

---

## Tests (§19) — remaining integration

Automated: interval overlap merge, idle exclusion from the interactive span,
session classification, null (not zero) token totals, coverage-gap detection,
date-range resolution, secrets, unassigned, provider-missing, timesheet reject,
unauthorized developer view, auditor denied timeline, secret scan.

Still need **live integration**: offline connector, long idle, late event E2E, heartbeat stop, pause E2E, replay against API, provider-missing full UI.

---

## Tier B & packaging

- Schedule Cursor/Copilot pullers in worker with real Enterprise tokens
- macOS/Windows signed connector, OS keychain (`keytar`)
- Full OTLP pipeline

---

## Deliverables

- Remaining ADRs, full ops docs, pilot report
