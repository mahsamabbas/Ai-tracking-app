import type { ActivityEventRow } from "./types";

const CONNECTOR_TYPES = new Set([
  "heartbeat_sent",
  "connector_started",
  "connector_stopped",
  "connector_paused",
  "connector_resumed",
  "telemetry_gap_started",
  "telemetry_gap_ended",
  "upload_failed",
  "upload_recovered",
]);

export function formatEventContext(e: ActivityEventRow): string {
  if (e.event_type === "provider_daily_aggregate" && e.metadata) {
    const m = e.metadata;
    const parts: string[] = [];
    if (m.aggregate_kind) parts.push(String(m.aggregate_kind));
    if (m.aggregate_day) parts.push(String(m.aggregate_day));
    if (m.external_login) parts.push(String(m.external_login));
    else if (m.provider_user_id) parts.push(`user ${m.provider_user_id}`);
    return parts.join(" · ") || "Provider aggregate";
  }

  if (e.project_id || e.work_item_id) {
    const parts: string[] = [];
    if (e.project_id) parts.push(`Project ${e.project_id.slice(0, 8)}…`);
    if (e.work_item_id) parts.push(`Work ${e.work_item_id.slice(0, 8)}…`);
    return parts.join(" · ");
  }

  const label = e.metadata?.path_category;
  if (typeof label === "string" && label && label !== "workspace") {
    return label;
  }

  if (CONNECTOR_TYPES.has(e.event_type ?? "")) {
    return "—";
  }

  if (
    e.event_type === "session_started" ||
    e.event_type === "file_modified" ||
    e.event_type === "file_created" ||
    e.event_type?.includes("tool") ||
    e.event_type?.includes("model")
  ) {
    return "Unassigned";
  }

  return "—";
}

export function formatEventStatus(e: ActivityEventRow): string {
  if (e.status) return e.status;

  const t = e.event_type ?? "";
  if (t === "heartbeat_sent") return "ok";
  if (t === "connector_paused" || t === "session_paused") return "paused";
  if (t === "telemetry_gap_started") return "gap";
  if (t === "upload_failed") return "failed";
  if (
    t.endsWith("_completed") ||
    t === "connector_resumed" ||
    t === "telemetry_gap_ended" ||
    t === "upload_recovered" ||
    t === "session_started"
  ) {
    return "succeeded";
  }
  if (t.endsWith("_started")) return "started";

  return "—";
}
