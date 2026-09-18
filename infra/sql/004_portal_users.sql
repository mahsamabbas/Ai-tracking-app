CREATE TABLE IF NOT EXISTS portal_users (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL,
  developer_id UUID
);

-- SHA-256 of techlio:<password> (local demo only)
INSERT INTO portal_users (id, organization_id, email, password_hash, display_name, role, developer_id)
VALUES
  (
    '880e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440010',
    'manager@techlio.local',
    '7944d0e9050aaf0eb8b5440daf0680f4d40c243cd6893f7336d1c952758d7693',
    'Faisal',
    'manager',
    NULL
  ),
  (
    '880e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440010',
    'developer@techlio.local',
    '9b1da24f47b7c55ba48e11b72745280ab7c1f77300c525fcdb6eaa73d6adce68',
    'Alex',
    'developer',
    '550e8400-e29b-41d4-a716-446655440011'
  ),
  (
    '880e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440010',
    'sam@techlio.local',
    '9b1da24f47b7c55ba48e11b72745280ab7c1f77300c525fcdb6eaa73d6adce68',
    'Sam',
    'developer',
    '550e8400-e29b-41d4-a716-446655440021'
  ),
  (
    '880e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440010',
    'admin@techlio.local',
    'a797291477b881b7ce6e205716292b923b9ff1886725ab73e72d9326efee495e',
    'Mahsam',
    'administrator',
    NULL
  ),
  (
    '880e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440010',
    'auditor@techlio.local',
    '4851f4eb86fe570574aea226fd2a1aa1c0a71dd02826c3d01edb6d99c8f0a01a',
    'Priya',
    'auditor',
    NULL
  )
ON CONFLICT (email) DO NOTHING;
