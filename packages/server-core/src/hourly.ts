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
): Promise<string> {
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
  const eventIds: string[] = [];
  let tokenInput = 0;
  let tokenOutput = 0;
  let testsCompleted = 0;
  let buildsCompleted = 0;
  let fileChanges = 0;

  for (const row of rows) {
    eventIds.push(row.eventId);
    const p = row.payload as {
      event_type?: string;
      occurred_at?: string;
      duration_ms?: number;
      session_id?: string;
      metadata?: {
        token_input?: number;
        token_output?: number;
      };
    };
    const start = new Date(p.occurred_at ?? row.occurredAt).getTime();
    const end = start + (p.duration_ms ?? 0);
    if (p.event_type?.includes("model")) {
      modelIntervals.push({ startMs: start, endMs: end });
    }
    if (p.event_type?.includes("tool")) {
      toolIntervals.push({ startMs: start, endMs: end });
    }
    tokenInput += p.metadata?.token_input ?? 0;
    tokenOutput += p.metadata?.token_output ?? 0;
    if (p.event_type === "test_completed") testsCompleted++;
    if (p.event_type === "build_completed") buildsCompleted++;
    if (
      p.event_type === "file_created" ||
      p.event_type === "file_modified" ||
      p.event_type === "file_deleted"
    ) {
      fileChanges++;
    }
    const sid = p.session_id ?? row.sessionId ?? "unknown";
    const arr = sessionTimes.get(sid) ?? [];
    arr.push(start);
    sessionTimes.set(sid, arr);
  }

  const durations = computeHourlyDurations({
    hourStartMs: hourStart.getTime(),
    modelIntervals,
    toolIntervals,
    sessions: [...sessionTimes.entries()].map(([sessionId, eventTimesMs]) => ({
      sessionId,
      eventTimesMs,
    })),
    idleThresholdMs: DEFAULT_IDLE_THRESHOLD_MS,
  });

  const metrics = {
    ...durations,
    tokenInput,
    tokenOutput,
    testsCompleted,
    buildsCompleted,
    fileChanges,
    eventIds,
    eventCount: rows.length,
  };

  const snapshotId = randomUUID();
  await db.insert(hourlySnapshots).values({
    id: snapshotId,
    organizationId,
    developerId,
    hourStart,
    version,
    metrics,
    completeness: rows.length === 0 ? "partial" : "complete",
    recalcReason: recalcReason ?? null,
    createdAt: new Date(),
  });

  return snapshotId;
}
