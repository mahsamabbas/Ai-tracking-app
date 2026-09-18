-- 005 — Employee directory + per-session computed metrics.
--
-- PRD alignment:
--   §13 data model  — developers / agent_sessions / projects
--   §11 aggregation — the five durations stay separate columns, never summed into one
--   §12 views       — directory, employee detail, tool drill-down, session history
--
-- Nothing here stores prompts, responses, source bodies, or command text (SEC-001).

-- ---------------------------------------------------------------------------
-- Employees (the monitored people). `id` IS the developer_id carried on events.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
  id              UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  display_name    TEXT NOT NULL,
  email           TEXT,
  team            TEXT,
  title           TEXT,
  status          TEXT NOT NULL DEFAULT 'active',   -- active | inactive
  joined_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS employees_org_idx  ON employees (organization_id);
CREATE INDEX IF NOT EXISTS employees_team_idx ON employees (organization_id, team);

-- ---------------------------------------------------------------------------
-- agent_sessions — computed metrics (FR-017 / FR-018 / §11)
-- ---------------------------------------------------------------------------
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS model_duration_ms   BIGINT NOT NULL DEFAULT 0;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS tool_duration_ms    BIGINT NOT NULL DEFAULT 0;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS active_duration_ms  BIGINT NOT NULL DEFAULT 0;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS interactive_span_ms BIGINT NOT NULL DEFAULT 0;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS elapsed_span_ms     BIGINT NOT NULL DEFAULT 0;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS idle_duration_ms    BIGINT NOT NULL DEFAULT 0;

ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS event_count     INT NOT NULL DEFAULT 0;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS model_requests  INT NOT NULL DEFAULT 0;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS tool_calls      INT NOT NULL DEFAULT 0;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS tests_run       INT NOT NULL DEFAULT 0;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS tests_passed    INT NOT NULL DEFAULT 0;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS tests_failed    INT NOT NULL DEFAULT 0;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS builds_run      INT NOT NULL DEFAULT 0;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS builds_failed   INT NOT NULL DEFAULT 0;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS file_changes    INT NOT NULL DEFAULT 0;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS failures        INT NOT NULL DEFAULT 0;

ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS token_input  BIGINT;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS token_output BIGINT;

ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS models_used      JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS tool_categories  JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Evidence-based label for *observed agent activity* — never a person score (SEC-009, §3).
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS classification TEXT NOT NULL DEFAULT 'exploration';
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS coverage_state TEXT NOT NULL DEFAULT 'complete';
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS last_event_at  TIMESTAMPTZ;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS metrics_at     TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS agent_sessions_org_dev_started_idx
  ON agent_sessions (organization_id, developer_id, started_at DESC);
CREATE INDEX IF NOT EXISTS agent_sessions_provider_idx
  ON agent_sessions (organization_id, provider);

-- ---------------------------------------------------------------------------
-- Event lookups used by every analytics query
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS activity_events_org_dev_occurred_idx
  ON activity_events (organization_id, developer_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS activity_events_session_idx
  ON activity_events (session_id, occurred_at);
CREATE INDEX IF NOT EXISTS activity_events_type_idx
  ON activity_events (organization_id, event_type);

-- ---------------------------------------------------------------------------
-- Provider registration per employee (which AI tools they are connected to)
-- ---------------------------------------------------------------------------
ALTER TABLE devices ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS label    TEXT;

CREATE INDEX IF NOT EXISTS devices_org_dev_idx ON devices (organization_id, developer_id);

-- Backfill employees from whatever identity rows already exist.
INSERT INTO employees (id, organization_id, display_name, email, team, title, status, joined_at)
SELECT pu.developer_id, pu.organization_id, pu.display_name, pu.email, 'Engineering', 'Engineer', 'active', NOW()
FROM portal_users pu
WHERE pu.role = 'developer' AND pu.developer_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;
