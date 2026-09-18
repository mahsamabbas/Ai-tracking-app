import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "./db.js";
import { activityEvents, activityExports, auditLog } from "./schema.js";

export async function createActivityExport(input: {
  organizationId: string;
  requestedBy?: string;
  format: "csv" | "pdf";
  developerId?: string;
  from?: Date;
  to?: Date;
}): Promise<{ exportId: string; downloadUrl: string }> {
  const conditions = [eq(activityEvents.organizationId, input.organizationId)];
  if (input.developerId) {
    conditions.push(eq(activityEvents.developerId, input.developerId));
  }
  if (input.from) {
    conditions.push(gte(activityEvents.occurredAt, input.from));
  }
  if (input.to) {
    conditions.push(lte(activityEvents.occurredAt, input.to));
  }

  const rows = await db
    .select()
    .from(activityEvents)
    .where(and(...conditions))
    .orderBy(desc(activityEvents.occurredAt))
    .limit(5000);

  let content: string;
  if (input.format === "pdf") {
    content = `Activity summary export\nEvents: ${rows.length}\n(Use CSV for structured data; PDF is a minimal stub.)`;
  } else {
    const header =
      "event_id,event_type,occurred_at,developer_id,provider,session_id\n";
    const lines = rows.map(
      (r) =>
        `${r.eventId},${r.eventType},${r.occurredAt.toISOString()},${r.developerId},${(r.payload as { provider?: string }).provider ?? ""},${r.sessionId ?? ""}`,
    );
    content = header + lines.join("\n");
  }

  const exportId = randomUUID();
  await db.insert(activityExports).values({
    id: exportId,
    organizationId: input.organizationId,
    requestedBy: input.requestedBy ?? null,
    format: input.format,
    status: "ready",
    content,
    createdAt: new Date(),
  });

  await db.insert(auditLog).values({
    organizationId: input.organizationId,
    actorId: input.requestedBy ?? null,
    action: "activity.export",
    detail: { exportId, format: input.format, rowCount: rows.length },
    createdAt: new Date(),
  });

  return {
    exportId,
    downloadUrl: `/v1/activity-exports/${exportId}`,
  };
}

export async function getActivityExport(
  organizationId: string,
  exportId: string,
): Promise<{ format: string; content: string } | null> {
  const rows = await db
    .select()
    .from(activityExports)
    .where(
      and(
        eq(activityExports.id, exportId),
        eq(activityExports.organizationId, organizationId),
      ),
    );
  const row = rows[0];
  if (!row || !row.content) return null;
  return { format: row.format, content: row.content };
}
