import type { ActivityEvent } from "@techlio/event-schema";
import { EventTypes, SCHEMA_VERSION } from "@techlio/event-schema";
import { deterministicEventId } from "./idempotency.js";
import { cleanMetadata } from "./metadata.js";

export interface CursorDailyRow {
  userId: number;
  day: string;
  linesAdded?: number;
  linesDeleted?: number;
  completions?: number;
  chatRequests?: number;
}

export async function fetchCursorDailyUsage(
  apiKey: string,
  startDateMs: number,
  endDateMs: number,
): Promise<CursorDailyRow[]> {
  const res = await fetch("https://api.cursor.com/teams/daily-usage-data", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
    },
    body: JSON.stringify({ startDate: startDateMs, endDate: endDateMs }),
  });
  if (!res.ok) {
    throw new Error(`Cursor API ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { data?: CursorDailyRow[] };
  return json.data ?? [];
}

export function cursorRowToEvent(
  row: CursorDailyRow,
  ctx: {
    organizationId: string;
    developerId: string;
    deviceId: string;
    connectorVersion: string;
    consentVersion: string;
  },
): ActivityEvent {
  const day = row.day.slice(0, 10);
  const occurredAt = new Date(`${day}T12:00:00.000Z`).toISOString();
  const seed = `cursor:daily_usage:${day}:${row.userId}:${ctx.organizationId}`;
  return {
    event_id: deterministicEventId(seed),
    schema_version: SCHEMA_VERSION,
    organization_id: ctx.organizationId,
    developer_id: ctx.developerId,
    device_id: ctx.deviceId,
    provider: "cursor",
    connector_version: ctx.connectorVersion,
    event_type: EventTypes.provider_daily_aggregate,
    occurred_at: occurredAt,
    consent_version: ctx.consentVersion,
    metadata: cleanMetadata({
      tier: "B",
      daily_only: true,
      aggregate_kind: "daily_usage",
      aggregate_day: day,
      provider_user_id: String(row.userId),
      lines_added: row.linesAdded,
      lines_deleted: row.linesDeleted,
      completions_count: row.completions,
      chat_requests_count: row.chatRequests,
      token_input: row.completions,
      token_output: row.chatRequests,
    }),
  };
}
