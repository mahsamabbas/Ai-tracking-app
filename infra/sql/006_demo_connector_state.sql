-- 006 — Records the state a seeded connector is meant to demonstrate.
--
-- Seeded telemetry is static, so heartbeats would drift into "stale" minutes
-- after seeding and every connector would look broken. The demo keepalive
-- re-anchors heartbeats to this intent. Real connectors leave it NULL and are
-- never touched.
ALTER TABLE connector_health ADD COLUMN IF NOT EXISTS demo_state TEXT;
