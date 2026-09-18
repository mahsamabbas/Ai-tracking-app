CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC'
);

CREATE TABLE IF NOT EXISTS activity_events (
  event_id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  developer_id UUID NOT NULL,
  device_id UUID NOT NULL,
  session_id UUID,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS hourly_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  developer_id UUID NOT NULL,
  hour_start TIMESTAMPTZ NOT NULL,
  version INT NOT NULL DEFAULT 1,
  metrics JSONB NOT NULL,
  completeness TEXT NOT NULL DEFAULT 'complete',
  recalc_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  actor_id UUID,
  action TEXT NOT NULL,
  detail JSONB,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS connector_health (
  device_id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  last_heartbeat TIMESTAMPTZ,
  version TEXT,
  queue_depth INT,
  paused INT DEFAULT 0
);

INSERT INTO organizations (id, name) VALUES
  ('550e8400-e29b-41d4-a716-446655440010', 'Techlio')
ON CONFLICT DO NOTHING;
