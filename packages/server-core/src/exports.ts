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

  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;

  let content: string;
  if (input.format === "pdf") {
    const lines = [
      "Techlio activity summary (operational review — not timekeeping)",
      `Generated: ${new Date().toISOString()}`,
      `Event rows: ${rows.length}`,
      "",
      ...rows.slice(0, 200).map(
        (r) =>
          `${r.occurredAt.toISOString()}  ${r.eventType}  ${(r.payload as { provider?: string }).provider ?? ""}`,
      ),
    ];
    if (rows.length > 200) {
      lines.push("", `(Truncated — export CSV for full structured data.)`);
    }
    content = lines.join("\n");
  } else {
    const header =
      "event_id,event_type,occurred_at,developer_id,provider,session_id\n";
    const lines = rows.map((r) => {
      const provider =
        (r.payload as { provider?: string }).provider ?? "";
      return [
        esc(r.eventId),
        esc(r.eventType),
        esc(r.occurredAt.toISOString()),
        esc(r.developerId),
        esc(provider),
        esc(r.sessionId ?? ""),
      ].join(",");
    });
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

  try {
    await db.insert(auditLog).values({
      organizationId: input.organizationId,
      actorId: input.requestedBy ?? null,
      action: "activity.export",
      detail: { exportId, format: input.format, rowCount: rows.length },
      createdAt: new Date(),
    });
  } catch {
    /* audit table optional in minimal dev DB */
  }

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
