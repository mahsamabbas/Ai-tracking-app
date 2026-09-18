CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  developer_id UUID NOT NULL,
  token_hash TEXT NOT NULL,
  public_key TEXT,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  external_ref TEXT
);

CREATE TABLE IF NOT EXISTS work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  project_id UUID REFERENCES projects(id),
  title TEXT NOT NULL,
  external_ref TEXT
);

CREATE TABLE IF NOT EXISTS agent_sessions (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  developer_id UUID NOT NULL,
  device_id UUID NOT NULL,
  provider TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  project_id UUID,
  work_item_id UUID,
  unassigned BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS session_context_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES agent_sessions(id),
  organization_id UUID NOT NULL,
  project_id UUID,
  work_item_id UUID,
  label TEXT,
  version INT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  requested_by UUID,
  format TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready',
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO devices (id, organization_id, developer_id, token_hash) VALUES
  (
    '550e8400-e29b-41d4-a716-446655440012',
    '550e8400-e29b-41d4-a716-446655440010',
    '550e8400-e29b-41d4-a716-446655440011',
    encode(digest('dev-device-token', 'sha256'), 'hex')
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO projects (id, organization_id, name) VALUES
  ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440010', 'Techlio Platform'),
  ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440010', 'Internal Tools')
ON CONFLICT DO NOTHING;

INSERT INTO work_items (id, organization_id, project_id, title) VALUES
  ('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440010', '660e8400-e29b-41d4-a716-446655440001', 'Activity dashboard MVP')
ON CONFLICT DO NOTHING;
