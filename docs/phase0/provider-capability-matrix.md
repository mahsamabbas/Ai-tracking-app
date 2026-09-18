# Provider capability matrix (FR-012)

Phase 0 telemetry feasibility. Primary MVP connector target: **Claude Code**.

| Catalog area | Claude Code | Codex CLI | Gemini CLI | Cursor | GitHub Copilot |
|--------------|-------------|-----------|------------|--------|----------------|
| Tier | A (hourly) | A | A | B (daily) | B (daily) |
| Session boundaries | Hooks + OTel | Rollout JSONL / notify | OTel | No | No |
| Model start/complete | OTel logs/metrics | OTel events | OTel | Daily aggregates | Daily user reports |
| Tool start/complete | Hooks + `claude_code.tool_result` | `codex.tool_result` | OTel | No | No |
| Token totals | `claude_code.token.usage` | Partial | Partial | filtered-usage-events (Enterprise) | User daily NDJSON |
| Test/build/lint | Via tool categories + extension | Via tools | Via tools | No | No |
| File metadata | Via tools (path only) | Via tools | Via tools | lines added/deleted daily | No |
| Heartbeat / connector health | Connector daemon | Connector daemon | Connector daemon | API poll lag | API poll lag |
| Hourly summary support | Yes | Yes (after adapter) | Yes (after adapter) | No — show empty state | No — show empty state |

## Ingested in this repo (Tier B puller + companion)

| Source | Worker env | Stored as |
|--------|------------|-----------|
| Cursor `POST /teams/daily-usage-data` | `CURSOR_API_KEY` | `provider_daily_aggregate` (`daily_usage`: lines, completions, chat requests) |
| Cursor Analytics `team/dau`, `team/agent-edits`, `by-user/agent-edits` | `CURSOR_API_KEY` (Enterprise) | `provider_daily_aggregate` with `aggregate_kind` |
| GitHub Copilot users-1-day report | `GITHUB_TOKEN`, `GITHUB_ORG` | `provider_daily_aggregate` (`copilot_user_day`) |
| IDE companion (Cursor/VS Code) | `pnpm dev` connector | session, file paths, task context, engineering tasks |
| Claude Code hooks | `/hooks/claude` on connector | Tier A session/model/tool (when hooks configured) |

## Verification checklist

- [ ] Techlio Cursor plan: Enterprise Admin API (`POST /teams/daily-usage-data`)
- [ ] GitHub org: `View Organization Copilot Metrics` permission
- [ ] Pilot: Claude Code with `CLAUDE_CODE_ENABLE_TELEMETRY=1` → local OTLP receiver on connector port

## Spike collector (local)

See `infra/otel-collector-spike.yaml`. Point Claude Code OTLP exporter to `http://127.0.0.1:4318`.
