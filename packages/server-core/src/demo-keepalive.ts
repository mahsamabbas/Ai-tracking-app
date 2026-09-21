import { sql } from "drizzle-orm";
import { db } from "./db.js";
import { DEV_DEVELOPER_ALEX } from "./users.js";

/**
 * Seeded telemetry is static, so connector heartbeats would drift into "stale"
 * within minutes of seeding and every connector would look broken.
 *
 * This keeps the *intended* demo states (online / stale / paused / offline)
 * stable by re-anchoring heartbeats to the current time. It touches connector
 * health only — never events, sessions, or any metric.
 *
 * It never fakes a tool on the local live identity (Alex): those rows stay
 * offline unless a real connector heartbeats. Off in production, and off
 * Off unless DEMO_CONNECTOR_KEEPALIVE=1. Local `pnpm dev` is live tracking
 * for this machine — it does not fake other tools or employees as online.
 */
export function startDemoConnectorKeepalive(): (() => void) | null {
  const enabled = process.env.DEMO_CONNECTOR_KEEPALIVE === "1";

  const freezeLiveIdentitySamples = async () => {
    await db.execute(sql`
      UPDATE connector_health AS ch
      SET last_heartbeat = NULL,
          demo_state = 'offline'
      FROM devices AS d
      WHERE d.id = ch.device_id
        AND d.developer_id = ${DEV_DEVELOPER_ALEX}
        AND ch.demo_state IS NOT NULL
        AND ch.demo_state <> 'offline'
    `);
  };

  const tick = async () => {
    try {
      await freezeLiveIdentitySamples();
      if (!enabled) return;

      await db.execute(sql`
        UPDATE connector_health
        SET last_heartbeat = CASE demo_state
              WHEN 'online' THEN NOW() - (random() * INTERVAL '90 seconds')
              WHEN 'stale'  THEN NOW() - INTERVAL '40 minutes'
              WHEN 'paused' THEN NOW() - (random() * INTERVAL '90 seconds')
              ELSE last_heartbeat
            END
        WHERE demo_state IS NOT NULL AND demo_state <> 'offline'
          AND NOT EXISTS (
            SELECT 1
            FROM devices d_self
            JOIN devices d_live ON d_live.developer_id = d_self.developer_id
            JOIN connector_health live ON live.device_id = d_live.id
            WHERE d_self.id = connector_health.device_id
              AND live.demo_state IS NULL
              AND live.last_heartbeat IS NOT NULL
              AND live.last_heartbeat > NOW() - INTERVAL '5 minutes'
          )
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
