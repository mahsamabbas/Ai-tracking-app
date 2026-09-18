import type { ActivityEvent } from "@techlio/event-schema";
import { and, eq, sql } from "drizzle-orm";
import { db } from "./db.js";
import { agentSessions, sessionContextVersions } from "./schema.js";

const SESSION_END = new Set(["session_ended", "connector_stopped"]);

/**
 * FR-017 — groups events into sessions by developer, device, provider, and
 * context. Any session-bearing event opens the session so that a dropped
 * `session_started` never loses the activity that follows it.
 */
export async function applySessionization(event: ActivityEvent): Promise<void> {
  const sessionId = event.session_id;
  if (!sessionId) return;

  await db
    .insert(agentSessions)
    .values({
      id: sessionId,
      organizationId: event.organization_id,
      developerId: event.developer_id,
      deviceId: event.device_id,
      provider: event.provider,
      startedAt: new Date(event.occurred_at),
      lastEventAt: new Date(event.occurred_at),
      endedAt: null,
      projectId: event.project_id ?? null,
      workItemId: event.work_item_id ?? null,
      unassigned: !event.project_id,
    })
    .onConflictDoNothing();

  if (event.event_type === "task_context_changed") {
    const existing = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sessionContextVersions)
      .where(eq(sessionContextVersions.sessionId, sessionId));
    await db.insert(sessionContextVersions).values({
      sessionId,
      organizationId: event.organization_id,
      projectId: event.project_id ?? null,
      workItemId: event.work_item_id ?? null,
      label: event.metadata?.path_category ?? null,
      version: (existing[0]?.count ?? 0) + 1,
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
      .where(
        and(
          eq(agentSessions.id, sessionId),
          eq(agentSessions.organizationId, event.organization_id),
        ),
      );
  }
}
