-- Optional per-org monthly token budgets for Cursor and Claude (in+out combined).
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS ai_plan_limits jsonb;

COMMENT ON COLUMN organizations.ai_plan_limits IS
  'e.g. {"cursor":{"monthlyTokenBudget":5000000},"claude_code":{"monthlyTokenBudget":2000000}}';
