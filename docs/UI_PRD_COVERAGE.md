# Dashboard UI vs PRD (FR mapping)

This tracks what the **web app** exposes today versus PRD v0.2. Backend gaps are listed in [memory-bank/pending.md](../memory-bank/pending.md).

## Implemented in UI

| PRD | Screen / component |
|-----|-------------------|
| FR-004 | `/my-activity`, `/policy` collection notice |
| FR-005 | Coverage banners; pause messaging in policy & alerts |
| FR-012 | `CapabilityBanner`, `ProviderTierBSummary`, connector Tier labels |
| FR-019 | Coverage warnings on team table; alerts panel |
| FR-020 | `TeamOverviewTable` — connector state, context, last event, hour count |
| FR-021 | SSE indicator + 30s poll on overview |
| FR-022–023 | Developer day hourly cards; version badge |
| FR-025 | `/hourly/[id]` drill-down with metrics + source events + versions |
| FR-026 | `FilterBar` — provider, event type, connector state, coverage-only |
| FR-027 | `AlertsPanel` (stale, paused, unassigned, gap events) |
| FR-028 | CSV + PDF export buttons on overview |
| Roles | JWT portals at `/login`; nav + APIs scoped by role |

## Responsive / mobile (NFR-007 partial)

- Viewport-locked shell; **main content scrolls**, sidebar fixed on desktop
- **Mobile drawer** menu (44px touch targets)
- Team table → **cards** on small screens
- Events → **card list** on mobile, table on `md+`
- Charts scale in single-column stack on narrow viewports
- Safe-area padding for notched devices

## Not in UI yet (by design or backend missing)

| PRD | Gap |
|-----|-----|
| FR-001 | Real SSO login screen |
| FR-002 | Full admin/auditor configuration screens |
| FR-024 | LLM hourly narrative (deferred) |
| FR-027 | Email/Slack notification delivery (UI shows alerts only) |
| FR-026 | Project/work-item/date-hour pickers (API exists; UI filters partial) |
| — | Live audit log from `audit_log` table (audit page is static pilot) |
| — | Developer ranking / timesheet (explicitly excluded) |

## How to verify

1. `pnpm dev` + Docker Postgres  
2. Resize browser to &lt;768px or use device emulation  
3. Overview should show team cards, filters, alerts, charts stacked vertically  
