import type { ActivityEventRow } from "./types";

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
  return hours.filter((h) => h.events > 0).length > 0
    ? hours.filter((h) => parseInt(h.hour, 10) >= 6)
    : hours.slice(8, 20);
}

export function providerSplit(events: ActivityEventRow[]) {
  const map = new Map<string, number>();
  for (const e of events) {
    const p = e.provider ?? "unknown";
    map.set(p, (map.get(p) ?? 0) + 1);
  }
  return [...map.entries()].map(([name, value]) => ({ name, value }));
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
