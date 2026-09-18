import { sql } from "drizzle-orm";
import { db } from "./db.js";

/**
 * Seeded telemetry is static, so connector heartbeats would drift into "stale"
 * within minutes of seeding and every connector would look broken.
 *
 * This keeps the *intended* demo states (online / stale / paused / offline)
 * stable by re-anchoring heartbeats to the current time. It touches connector
 * health only — never events, sessions, or any metric.
 *
 * Off in production, and off entirely with DEMO_CONNECTOR_KEEPALIVE=0.
 */
export function startDemoConnectorKeepalive(): (() => void) | null {
  const enabled =
    process.env.DEMO_CONNECTOR_KEEPALIVE === "1" ||
    (process.env.DEMO_CONNECTOR_KEEPALIVE !== "0" &&
      process.env.NODE_ENV !== "production");
  if (!enabled) return null;

  const tick = async () => {
    try {
      await db.execute(sql`
        UPDATE connector_health
        SET last_heartbeat = CASE demo_state
              WHEN 'online' THEN NOW() - (random() * INTERVAL '90 seconds')
              WHEN 'stale'  THEN NOW() - INTERVAL '40 minutes'
              WHEN 'paused' THEN NOW() - (random() * INTERVAL '90 seconds')
              ELSE last_heartbeat
            END
        WHERE demo_state IS NOT NULL AND demo_state <> 'offline'
      `);
    } catch {
      /* database not ready yet — the next tick retries */
    }
  };

  void tick();
  const handle = setInterval(() => void tick(), 60_000);
  handle.unref?.();
  return () => clearInterval(handle);
}
