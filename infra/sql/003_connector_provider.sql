ALTER TABLE connector_health
  ADD COLUMN IF NOT EXISTS provider TEXT;
