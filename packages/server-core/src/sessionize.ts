import type { ActivityEvent } from "@techlio/event-schema";
import { eq } from "drizzle-orm";
import { db } from "./db.js";
import { agentSessions, sessionContextVersions } from "./schema.js";

const SESSION_START = new Set([
  "session_started",
  "model_request_started",
  "tool_started",
]);

const SESSION_END = new Set(["session_ended", "connector_stopped"]);

export async function applySessionization(event: ActivityEvent): Promise<void> {
  const sessionId = event.session_id;
  if (!sessionId) {
    if (
      event.event_type === "unassigned_activity_detected" ||
      (SESSION_START.has(event.event_type) && !event.project_id)
    ) {
      /* tracked via events only */
    }
    return;
  }

  if (SESSION_START.has(event.event_type) || event.event_type === "session_started") {
    await db
      .insert(agentSessions)
      .values({
        id: sessionId,
        organizationId: event.organization_id,
        developerId: event.developer_id,
        deviceId: event.device_id,
        provider: event.provider,
        startedAt: new Date(event.occurred_at),
        endedAt: null,
        projectId: event.project_id ?? null,
        workItemId: event.work_item_id ?? null,
        unassigned: !event.project_id,
      })
      .onConflictDoNothing();
  }

  if (event.event_type === "task_context_changed") {
    const existing = await db
      .select()
      .from(sessionContextVersions)
      .where(eq(sessionContextVersions.sessionId, sessionId));
    const version = existing.length + 1;
    await db.insert(sessionContextVersions).values({
      sessionId,
      organizationId: event.organization_id,
      projectId: event.project_id ?? null,
      workItemId: event.work_item_id ?? null,
      label: event.metadata?.path_category ?? null,
      version,
      recordedAt: new Date(event.occurred_at),
    });
    await db
      .update(agentSessions)
      .set({
        projectId: event.project_id ?? null,
        workItemId: event.work_item_id ?? null,
        unassigned: !event.project_id,
      })
      .where(eq(agentSessions.id, sessionId));
  }

  if (SESSION_END.has(event.event_type)) {
    await db
      .update(agentSessions)
      .set({ endedAt: new Date(event.occurred_at) })
      .where(eq(agentSessions.id, sessionId));
  }
}
