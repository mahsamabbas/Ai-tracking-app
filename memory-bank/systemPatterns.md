# System patterns

1. **Allowlist metadata** at connector; schema strict in `@techlio/event-schema`.
2. **Idempotent ingest** via `event_id` + `ON CONFLICT DO NOTHING`.
3. **Five duration metrics** never merged in UI — use `@techlio/aggregation`.
4. **Hour assignment** by `occurred_at`; late events → new snapshot `version`.
5. **Coverage gaps** explicit; never infer inactivity from offline connector.
6. **RBAC** on every API route; audit log on sensitive writes.
