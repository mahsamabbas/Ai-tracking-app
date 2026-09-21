import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "./db.js";
import { resolveRange } from "./range.js";
import { renderSummaryPdf } from "./pdf.js";
import { activityEvents, activityExports, auditLog } from "./schema.js";

export async function createActivityExport(input: {
  organizationId: string;
  requestedBy?: string;
  format: "csv" | "pdf";
  developerId?: string;
  preset?: string;
  from?: Date;
  to?: Date;
}): Promise<{ exportId: string; downloadUrl: string }> {
  const resolved = resolveRange({
    preset: input.preset,
    from: input.from?.toISOString(),
    to: input.to?.toISOString(),
  });
  const conditions = [eq(activityEvents.organizationId, input.organizationId)];
  if (input.developerId) {
    conditions.push(eq(activityEvents.developerId, input.developerId));
  }
  conditions.push(gte(activityEvents.occurredAt, resolved.range.from));
  conditions.push(lte(activityEvents.occurredAt, resolved.range.to));

  const rows = await db
    .select()
    .from(activityEvents)
    .where(and(...conditions))
    .orderBy(desc(activityEvents.occurredAt))
    .limit(5000);

  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;

  let content: string;
  if (input.format === "pdf") {
    const byType = new Map<string, number>();
    for (const row of rows) {
      byType.set(row.eventType, (byType.get(row.eventType) ?? 0) + 1);
    }
    const typeLines = [...byType.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 18)
      .map(([type, count]) => `${type}: ${count}`);
    const pdf = renderSummaryPdf([
      "Techlio activity summary",
      "Operational review. Not a timesheet and not a billing record.",
      `Generated: ${new Date().toISOString()}`,
      `Range: ${resolved.range.from.toISOString()} to ${resolved.range.to.toISOString()}`,
      `Events in range: ${rows.length}${rows.length === 5000 ? " (capped)" : ""}`,
      "",
      "Events by type",
      ...(typeLines.length > 0 ? typeLines : ["No events in this range."]),
      "",
      "Use the CSV export for the full structured event list.",
    ]);
    content = pdf.toString("base64");
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
