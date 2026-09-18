import { EventBatchSchema, type ActivityEvent } from "@techlio/event-schema";
import { desc, eq } from "drizzle-orm";
import { db } from "./db.js";
import { activityEvents, auditLog, connectorHealth } from "./schema.js";

const seenEvents = new Set<string>();

export async function ingestBatch(
  organizationId: string,
  body: unknown,
): Promise<{ accepted: number; rejected: number }> {
  const parsed = EventBatchSchema.safeParse(body);
  if (!parsed.success) return { accepted: 0, rejected: 1 };

  let accepted = 0;
  let rejected = 0;

  for (const event of parsed.data.events) {
    if (event.organization_id !== organizationId) {
      rejected++;
      continue;
    }
    if (seenEvents.has(event.event_id)) {
      rejected++;
      continue;
    }
    try {
      await db
        .insert(activityEvents)
        .values({
          eventId: event.event_id,
          organizationId: event.organization_id,
          developerId: event.developer_id,
          deviceId: event.device_id,
          sessionId: event.session_id ?? null,
          eventType: event.event_type,
          occurredAt: new Date(event.occurred_at),
          receivedAt: new Date(),
          payload: event,
        })
        .onConflictDoNothing();
      seenEvents.add(event.event_id);
      accepted++;

      if (event.event_type === "heartbeat_sent") {
        await db
          .insert(connectorHealth)
          .values({
            deviceId: event.device_id,
            organizationId: event.organization_id,
            lastHeartbeat: new Date(),
            version: event.connector_version,
            queueDepth: 0,
            paused: 0,
          })
          .onConflictDoUpdate({
            target: connectorHealth.deviceId,
            set: {
              lastHeartbeat: new Date(),
              version: event.connector_version,
            },
          });
      }
    } catch {
      rejected++;
    }
  }

  await db.insert(auditLog).values({
    organizationId,
    action: "events.batch_ingest",
    detail: { accepted, rejected },
    createdAt: new Date(),
  });

  return { accepted, rejected };
}

export async function listRecentEvents(
  organizationId: string,
  limit = 50,
): Promise<ActivityEvent[]> {
  const rows = await db
    .select({ payload: activityEvents.payload })
    .from(activityEvents)
    .where(eq(activityEvents.organizationId, organizationId))
    .orderBy(desc(activityEvents.receivedAt))
    .limit(limit);
  return rows.map((r) => r.payload as ActivityEvent);
}
