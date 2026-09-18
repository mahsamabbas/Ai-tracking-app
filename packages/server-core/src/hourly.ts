import {
  computeHourlyDurations,
  DEFAULT_IDLE_THRESHOLD_MS,
  type TimeInterval,
} from "@techlio/aggregation";
import { randomUUID } from "node:crypto";
import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "./db.js";
import { activityEvents, hourlySnapshots } from "./schema.js";

function hourStartUtc(d: Date): Date {
  return new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      d.getUTCHours(),
    ),
  );
}

export async function finalizeHourForDeveloper(
  organizationId: string,
  developerId: string,
  hour: Date,
  version = 1,
  recalcReason?: string,
): Promise<void> {
  const hourStart = hourStartUtc(hour);
  const hourEnd = new Date(hourStart.getTime() + 3600_000);

  const rows = await db
    .select()
    .from(activityEvents)
    .where(
      and(
        eq(activityEvents.organizationId, organizationId),
        eq(activityEvents.developerId, developerId),
        gte(activityEvents.occurredAt, hourStart),
        lt(activityEvents.occurredAt, hourEnd),
      ),
    );

  const modelIntervals: TimeInterval[] = [];
  const toolIntervals: TimeInterval[] = [];
  const sessionTimes = new Map<string, number[]>();

  for (const row of rows) {
    const p = row.payload as {
      event_type?: string;
      occurred_at?: string;
      duration_ms?: number;
      session_id?: string;
    };
    const start = new Date(p.occurred_at ?? row.occurredAt).getTime();
    const end = start + (p.duration_ms ?? 0);
    if (p.event_type?.includes("model")) {
      modelIntervals.push({ startMs: start, endMs: end });
    }
    if (p.event_type?.includes("tool")) {
      toolIntervals.push({ startMs: start, endMs: end });
    }
    const sid = p.session_id ?? row.sessionId ?? "unknown";
    const arr = sessionTimes.get(sid) ?? [];
    arr.push(start);
    sessionTimes.set(sid, arr);
  }

  const metrics = computeHourlyDurations({
    hourStartMs: hourStart.getTime(),
    modelIntervals,
    toolIntervals,
    sessions: [...sessionTimes.entries()].map(([sessionId, eventTimesMs]) => ({
      sessionId,
      eventTimesMs,
    })),
    idleThresholdMs: DEFAULT_IDLE_THRESHOLD_MS,
  });

  await db.insert(hourlySnapshots).values({
    id: randomUUID(),
    organizationId,
    developerId,
    hourStart,
    version,
    metrics,
    completeness: rows.length === 0 ? "partial" : "complete",
    recalcReason: recalcReason ?? null,
    createdAt: new Date(),
  });
}
