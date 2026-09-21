# Seven-day pilot report

Status: **not started**  
This template is not evidence that the PRD pilot has completed.

## Approval and scope

- Pilot owner:
- Start/end timestamps:
- Approved organization and participants:
- Selected provider and exact version:
- Connector version and operating systems:
- Legal/HR approval reference:
- Monitoring notice and consent version:
- Approved retention and access policy:

## Provider coverage observed

For every expected catalog area, record whether it was directly observed,
provider-derived, inferred, unavailable, or not tested:

- Session boundaries:
- Model request start/completion:
- Tool start/completion:
- Tests/builds/lint/type-check:
- File-change metadata:
- Token/cache totals:
- Connector health and queue depth:
- Task context:

Attach sanitized event IDs and timestamps, never raw prompts, responses, source
bodies, command text, screenshots, credentials, or private messages.

## Reliability scenarios

- Offline queue and recovery:
- Duplicate/replay handling:
- Invalid signature rejection:
- Heartbeat stop and stale alert:
- Pause/resume and coverage gap:
- Late event and snapshot version:
- Unsupported capability display:
- Revoked credential rejection:

## Freshness and performance

- Accepted-event-to-dashboard latency: median / p95 / maximum
- Hour-end-to-finalized-snapshot latency: median / p95 / maximum
- 24-hour team dashboard latency at pilot load: median / p95
- API errors and rejected-event counts:
- Queue depth and oldest queued event:
- Availability and approved maintenance:

## Privacy, access, and accessibility findings

- Secret/redaction test results:
- Organization-isolation test results:
- Developer self-view parity:
- Audit event coverage:
- Keyboard/focus/label/contrast review:
- Participant questions or disputes:

## Data quality and summary findings

- Hours complete / partial:
- Coverage-gap causes:
- Unassigned activity:
- Provider-missing metrics:
- Late recalculation count:
- Deterministic metric reconciliation:
- Generated-summary quality (only if FR-024 is enabled):

Use “the agent performed,” not “the developer worked,” in every summary.

## Incidents and corrective actions

Record incident ID, impact, coverage gap, root cause, corrective action, owner,
and due date. Do not infer inactivity or employee performance from missing
telemetry.

## Exit recommendation

- Proceed, extend pilot, or stop:
- Proven capabilities:
- Unavailable metrics:
- Required fixes before deployment:
- Legal/security/operations approvals:
- Additional providers permitted only after the first provider is accepted:
