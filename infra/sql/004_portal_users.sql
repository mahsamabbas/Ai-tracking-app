CREATE TABLE IF NOT EXISTS portal_users (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL,
  developer_id UUID
);

INSERT INTO portal_users (id, organization_id, email, password_hash, display_name, role, developer_id)
VALUES
  (
    '880e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440010',
    'manager@techlio.local',
    '$2b$10$8nQ0n1wG3Yh5vY3b7Q1eWeQe0c0F6s1v3Q1c0F6s1v3Q1c0F6s1v3u',
    'Faisal (Manager)',
    'manager',
    NULL
  )
ON CONFLICT (email) DO NOTHING;
