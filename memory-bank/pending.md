# Pending work vs PRD v0.2

Source: [requirements.md](requirements.md).  
Last reviewed: 2026-09-18 (post engineering pass).

---

## Policy & gates (unchanged — human/legal)

| Item | Status |
|------|--------|
| Monitoring notice approved (SEC-007) | Draft only |
| Legal / HR (SEC-010) | Not done |
| Section 21 open decisions | Partial — `docs/policy/open-decisions.md` |
| Phase 0 live Claude validation | Not done |
| 7-day pilot + report (§20) | Not done |
| Definition of Done (§22) | Not met |

---

## Functional requirements — remaining

| ID | Status |
|----|--------|
| FR-001 | **Pending** — OIDC/SSO (still `x-role` dev auth) |
| FR-002 | **Partial** — guards on dashboard routes; not full Admin/Auditor UI |
| FR-003 | **Partial** — org header stub; not full tenant isolation |
| FR-006 | **Partial** — Claude hooks; Codex/Gemini OTLP adapters pending |
| FR-007 | **Partial** — register/revoke + hash; API Ed25519 verify not enforced |
| FR-024 | **Deferred** — LLM hourly narrative |
| FR-027 | **Pending** — manager notifications delivery |
| FR-028 | **Partial** — CSV + minimal PDF stub (not full report layout) |

Most other FRs have **local dev implementations** (pause/gaps, sessionization, drill-down, filters, SSE, exports, extension events). Verify against your DB after migration `002`.

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

Automated: overlap, secrets, unassigned, provider-missing, timesheet reject, unauthorized developer view, secret scan.

Still need **live integration**: offline connector, long idle, late event E2E, heartbeat stop, pause E2E, replay against API, provider-missing full UI.

---

## Tier B & packaging

- Schedule Cursor/Copilot pullers in worker with real Enterprise tokens
- macOS/Windows signed connector, OS keychain (`keytar`)
- Full OTLP pipeline

---

## Deliverables

- Remaining ADRs, full ops docs, pilot report
