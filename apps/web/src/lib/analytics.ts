import type { ActivityEventRow } from "./types";
import { providerLabel } from "./providers";

export function eventsByType(events: ActivityEventRow[]) {
  const map = new Map<string, number>();
  for (const e of events) {
    const t = e.event_type ?? "unknown";
    map.set(t, (map.get(t) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export function eventsByHour(events: ActivityEventRow[]) {
  const map = new Map<string, number>();
  for (const e of events) {
    if (!e.occurred_at) continue;
    const d = new Date(e.occurred_at);
    const key = `${d.getHours().toString().padStart(2, "0")}:00`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const hours = Array.from({ length: 24 }, (_, i) => {
    const key = `${i.toString().padStart(2, "0")}:00`;
    return { hour: key, events: map.get(key) ?? 0 };
  });
  return hours;
}

export function providerSplit(events: ActivityEventRow[]) {
  const skip = new Set([
    "heartbeat_sent",
    "connector_started",
    "connector_stopped",
    "connector_paused",
    "connector_resumed",
  ]);
  const agentEvents = events.filter((e) => !skip.has(e.event_type ?? ""));
  const source = agentEvents.length > 0 ? agentEvents : events;
  const map = new Map<string, number>();
  for (const e of source) {
    const p = e.provider ?? "unknown";
    map.set(p, (map.get(p) ?? 0) + 1);
  }
  return [...map.entries()].map(([name, value]) => ({
    name: providerLabel(name),
    id: name,
    value,
  }));
}

export function interactionBuckets(events: ActivityEventRow[]) {
  const buckets = {
    sessions: 0,
    model: 0,
    tools: 0,
    engineering: 0,
    files: 0,
    coverage: 0,
    connector: 0,
  };
  for (const e of events) {
    const t = e.event_type ?? "";
    if (t.startsWith("session_") || t === "task_context_changed") buckets.sessions++;
    else if (t.startsWith("model_")) buckets.model++;
    else if (t.startsWith("tool_")) buckets.tools++;
    else if (
      t.startsWith("test_") ||
      t.startsWith("build_") ||
      t.startsWith("lint_") ||
      t.startsWith("typecheck_")
    ) {
      buckets.engineering++;
    } else if (t.startsWith("file_")) buckets.files++;
    else if (t.includes("gap") || t.includes("unassigned") || t.includes("late")) {
      buckets.coverage++;
    } else buckets.connector++;
  }
  return [
    { name: "Sessions", count: buckets.sessions },
    { name: "Model calls", count: buckets.model },
    { name: "Tool use", count: buckets.tools },
    { name: "Tests / builds", count: buckets.engineering },
    { name: "File metadata", count: buckets.files },
    { name: "Coverage", count: buckets.coverage },
    { name: "Connector", count: buckets.connector },
  ];
}

export function toolCategories(events: ActivityEventRow[]) {
  const map = new Map<string, number>();
  for (const e of events) {
    if (!e.event_type?.startsWith("tool_")) continue;
    const cat = String(e.metadata?.tool_category ?? "other");
    map.set(cat, (map.get(cat) ?? 0) + 1);
  }
  if (map.size === 0) {
    return [];
  }
  return [...map.entries()].map(([name, count]) => ({ name, count }));
}

export function outcomesSplit(events: ActivityEventRow[]) {
  let succeeded = 0;
  let failed = 0;
  let started = 0;
  let other = 0;
  for (const e of events) {
    const t = e.event_type ?? "";
    const s = e.status;
    if (s === "failed" || t === "upload_failed" || t === "summary_failed") failed++;
    else if (s === "started" || t.endsWith("_started")) started++;
    else if (s === "succeeded" || t.endsWith("_completed") || t === "heartbeat_sent") {
      succeeded++;
    } else other++;
  }
  return [
    { name: "Succeeded", value: succeeded },
    { name: "Started", value: started },
    { name: "Failed", value: failed },
    { name: "Other", value: other },
  ].filter((d) => d.value > 0);
}

export function assignedVsUnassigned(events: ActivityEventRow[]) {
  let assigned = 0;
  let unassigned = 0;
  let nA = 0;
  for (const e of events) {
    if (
      e.event_type === "heartbeat_sent" ||
      e.event_type?.startsWith("connector_")
    ) {
      nA++;
      continue;
    }
    if (e.project_id || e.work_item_id || e.metadata?.path_category) assigned++;
    else unassigned++;
  }
  return [
    { name: "Has context", value: assigned },
    { name: "Unassigned", value: unassigned },
    { name: "Connector-only", value: nA },
  ].filter((d) => d.value > 0);
}

export function hourlyInteractionSeries(events: ActivityEventRow[]) {
  const hours = Array.from({ length: 24 }, (_, i) => {
    const hour = `${i.toString().padStart(2, "0")}:00`;
    return { hour, model: 0, tools: 0, files: 0, sessions: 0, tests: 0 };
  });
  for (const e of events) {
    if (!e.occurred_at) continue;
    const h = new Date(e.occurred_at).getHours();
    const t = e.event_type ?? "";
    if (t.startsWith("model_")) hours[h].model++;
    else if (t.startsWith("tool_")) hours[h].tools++;
    else if (t.startsWith("file_")) hours[h].files++;
    else if (t.startsWith("session_") || t === "task_context_changed") {
      hours[h].sessions++;
    } else if (
      t.startsWith("test_") ||
      t.startsWith("build_") ||
      t.startsWith("lint_") ||
      t.startsWith("typecheck_")
    ) {
      hours[h].tests++;
    }
  }
  return hours;
}

export function coverageVsActivity(events: ActivityEventRow[]) {
  let agent = 0;
  let coverage = 0;
  let connector = 0;
  for (const e of events) {
    const t = e.event_type ?? "";
    if (
      t.includes("gap") ||
      t === "unassigned_activity_detected" ||
      t === "late_events_received" ||
      t === "provider_capability_missing"
    ) {
      coverage++;
    } else if (t.startsWith("connector_") || t === "heartbeat_sent") {
      connector++;
    } else {
      agent++;
    }
  }
  return [
    { name: "Agent interactions", value: agent },
    { name: "Coverage signals", value: coverage },
    { name: "Connector health", value: connector },
  ].filter((d) => d.value > 0);
}

export function engineeringOutcomes(events: ActivityEventRow[]) {
  const map = new Map<string, number>([
    ["Tests", 0],
    ["Builds", 0],
    ["Lint", 0],
    ["Typecheck", 0],
  ]);
  for (const e of events) {
    const t = e.event_type ?? "";
    if (t.startsWith("test_")) map.set("Tests", (map.get("Tests") ?? 0) + 1);
    else if (t.startsWith("build_")) map.set("Builds", (map.get("Builds") ?? 0) + 1);
    else if (t.startsWith("lint_")) map.set("Lint", (map.get("Lint") ?? 0) + 1);
    else if (t.startsWith("typecheck_")) {
      map.set("Typecheck", (map.get("Typecheck") ?? 0) + 1);
    }
  }
  return [...map.entries()].map(([name, count]) => ({ name, count }));
}

export function formatDuration(ms?: number) {
  if (ms == null || ms === 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function formatTime(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
