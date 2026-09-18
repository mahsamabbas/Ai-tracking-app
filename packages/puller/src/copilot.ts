import type { ActivityEvent } from "@techlio/event-schema";
import { EventTypes, SCHEMA_VERSION } from "@techlio/event-schema";
import { deterministicEventId } from "./idempotency.js";
import { cleanMetadata } from "./metadata.js";

export interface CopilotReportLink {
  download_url?: string;
}

/** Fetches signed download URL for org daily user metrics (Tier B). */
export async function fetchCopilotUsersReportUrl(
  token: string,
  org: string,
  day: string,
): Promise<string | null> {
  const url = `https://api.github.com/orgs/${org}/copilot/metrics/reports/users-1-day?day=${day}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { report_download_url?: string };
  return json.report_download_url ?? null;
}

export async function downloadCopilotUsersReport(
  reportUrl: string,
): Promise<string> {
  const res = await fetch(reportUrl);
  if (!res.ok) throw new Error(`Copilot report download ${res.status}`);
  return res.text();
}

export interface CopilotUserDayRow {
  day: string;
  login: string;
  total_suggestions_count?: number;
  total_acceptances_count?: number;
  total_lines_suggested?: number;
  total_lines_accepted?: number;
  total_active_users?: number;
  total_chat_turns?: number;
  total_chat_insertions?: number;
}

function pickNum(obj: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
  }
  return undefined;
}

function pickStr(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v) return v;
  }
  return undefined;
}

/** Parses GitHub Copilot users-1-day NDJSON or JSON array. */
export function parseCopilotUserDayReport(text: string): CopilotUserDayRow[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    const arr = JSON.parse(trimmed) as Record<string, unknown>[];
    return arr.map(normalizeCopilotRow).filter((r) => r.login);
  }
  const rows: CopilotUserDayRow[] = [];
  for (const line of trimmed.split("\n")) {
    const l = line.trim();
    if (!l) continue;
    try {
      const obj = JSON.parse(l) as Record<string, unknown>;
      const row = normalizeCopilotRow(obj);
      if (row.login) rows.push(row);
    } catch {
      /* skip bad line */
    }
  }
  return rows;
}

function normalizeCopilotRow(obj: Record<string, unknown>): CopilotUserDayRow {
  const day =
    pickStr(obj, "day", "date") ?? new Date().toISOString().slice(0, 10);
  const login = pickStr(obj, "login", "user_login", "username") ?? "";
  return {
    day: day.slice(0, 10),
    login,
    total_suggestions_count: pickNum(
      obj,
      "total_suggestions_count",
      "suggestions_count",
      "total_suggestions",
    ),
    total_acceptances_count: pickNum(
      obj,
      "total_acceptances_count",
      "acceptances_count",
      "total_acceptances",
    ),
    total_lines_suggested: pickNum(
      obj,
      "total_lines_suggested",
      "lines_suggested",
    ),
    total_lines_accepted: pickNum(
      obj,
      "total_lines_accepted",
      "lines_accepted",
    ),
    total_chat_turns: pickNum(obj, "total_chat_turns", "chat_turns"),
    total_chat_insertions: pickNum(
      obj,
      "total_chat_insertions",
      "chat_insertions",
    ),
  };
}

export function copilotRowToEvent(
  row: CopilotUserDayRow,
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
  const seed = `copilot:user_day:${day}:${row.login}:${ctx.organizationId}`;
  return {
    event_id: deterministicEventId(seed),
    schema_version: SCHEMA_VERSION,
    organization_id: ctx.organizationId,
    developer_id: ctx.developerId,
    device_id: ctx.deviceId,
    provider: "github_copilot",
    connector_version: ctx.connectorVersion,
    event_type: EventTypes.provider_daily_aggregate,
    occurred_at: occurredAt,
    consent_version: ctx.consentVersion,
    metadata: cleanMetadata({
      tier: "B",
      daily_only: true,
      aggregate_kind: "copilot_user_day",
      aggregate_day: day,
      external_login: row.login.slice(0, 64),
      suggestions_count: row.total_suggestions_count,
      acceptances_count: row.total_acceptances_count,
      lines_suggested: row.total_lines_suggested,
      lines_accepted: row.total_lines_accepted,
      chat_turns: row.total_chat_turns,
      chat_insertions: row.total_chat_insertions,
    }),
  };
}
