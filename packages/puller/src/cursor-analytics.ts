import type { ActivityEvent } from "@techlio/event-schema";
import { EventTypes, SCHEMA_VERSION } from "@techlio/event-schema";
import { deterministicEventId } from "./idempotency.js";
import { cleanMetadata } from "./metadata.js";

const API_BASE = "https://api.cursor.com";

function authHeader(apiKey: string): string {
  return `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;
}

async function cursorGet<T>(
  apiKey: string,
  path: string,
  query?: Record<string, string>,
): Promise<T | null> {
  const qs = query
    ? `?${new URLSearchParams(query).toString()}`
    : "";
  const res = await fetch(`${API_BASE}${path}${qs}`, {
    headers: { Authorization: authHeader(apiKey) },
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

type AnalyticsSeries = {
  data?: Array<Record<string, unknown>>;
  results?: Array<Record<string, unknown>>;
};

function seriesRows(json: unknown): Record<string, unknown>[] {
  if (!json || typeof json !== "object") return [];
  const o = json as AnalyticsSeries;
  if (Array.isArray(o.data)) return o.data;
  if (Array.isArray(o.results)) return o.results;
  if (Array.isArray(json)) return json as Record<string, unknown>[];
  return [];
}

function dayFromRow(row: Record<string, unknown>): string {
  const d =
    row.date ??
    row.day ??
    row.timestamp ??
    row.startDate ??
    row.bucketStart;
  if (typeof d === "string") return d.slice(0, 10);
  if (typeof d === "number") return new Date(d).toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

function num(row: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
  }
  return undefined;
}

type AnalyticsKind = "team_dau" | "team_agent_edits" | "user_agent_edits";

export function analyticsRowToEvent(
  row: Record<string, unknown>,
  aggregateKind: AnalyticsKind,
  ctx: {
    organizationId: string;
    developerId: string;
    deviceId: string;
    connectorVersion: string;
    consentVersion: string;
  },
): ActivityEvent {
  const day = dayFromRow(row);
  const occurredAt = new Date(`${day}T12:00:00.000Z`).toISOString();
  const userId = row.userId ?? row.user_id ?? row.email;
  const seed = `cursor:${aggregateKind}:${day}:${String(userId ?? "team")}:${ctx.organizationId}`;
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
      aggregate_kind: aggregateKind,
      aggregate_day: day,
      provider_user_id:
        userId !== undefined ? String(userId).slice(0, 64) : undefined,
      dau: num(row, "dau", "totalDau", "count"),
      cli_dau: num(row, "cliDau", "cli_dau"),
      cloud_agent_dau: num(row, "cloudAgentDau", "cloud_agent_dau"),
      total_accepts: num(row, "totalAccepts", "accepts", "total_accepts"),
      total_rejects: num(row, "totalRejects", "rejects", "total_rejects"),
      completions_count: num(row, "completions", "totalCompletions"),
      chat_requests_count: num(row, "chatRequests", "chat_requests"),
      lines_added: num(row, "linesAdded", "lines_added"),
      lines_deleted: num(row, "linesDeleted", "lines_deleted"),
    }),
  };
}

/** Enterprise Analytics API — team DAU (daily points). */
export async function fetchCursorTeamDau(
  apiKey: string,
  startDate = "7d",
  endDate = "now",
): Promise<Record<string, unknown>[]> {
  const json = await cursorGet<unknown>(apiKey, "/analytics/team/dau", {
    startDate,
    endDate,
  });
  return seriesRows(json);
}

/** Enterprise Analytics API — agent edit accepts/rejects (daily). */
export async function fetchCursorTeamAgentEdits(
  apiKey: string,
  startDate = "7d",
  endDate = "now",
): Promise<Record<string, unknown>[]> {
  const json = await cursorGet<unknown>(apiKey, "/analytics/team/agent-edits", {
    startDate,
    endDate,
  });
  return seriesRows(json);
}

/** By-user agent edits when enterprise exposes per-user pagination. */
export async function fetchCursorUserAgentEdits(
  apiKey: string,
  startDate = "7d",
  endDate = "now",
): Promise<Record<string, unknown>[]> {
  const json = await cursorGet<unknown>(apiKey, "/analytics/by-user/agent-edits", {
    startDate,
    endDate,
  });
  return seriesRows(json);
}
