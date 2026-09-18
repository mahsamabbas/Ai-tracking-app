import type { DateRange } from "./analytics.js";

export type RangePreset = "today" | "yesterday" | "7d" | "30d" | "90d" | "custom";

export const RANGE_PRESETS: { id: RangePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
];

const DAY = 86_400_000;

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Resolves the dashboard date filter. Explicit from/to always wins; otherwise
 * the preset is anchored on "now" so "today" means the current clock day.
 */
export function resolveRange(input: {
  preset?: string;
  from?: string;
  to?: string;
  now?: Date;
}): { range: DateRange; preset: RangePreset } {
  const now = input.now ?? new Date();

  if (input.from) {
    const from = new Date(input.from);
    const to = input.to ? new Date(input.to) : now;
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
      return { range: { from, to }, preset: "custom" };
    }
  }

  const today = startOfDay(now);
  switch (input.preset) {
    case "today":
      return { range: { from: today, to: new Date(today.getTime() + DAY) }, preset: "today" };
    case "yesterday":
      return {
        range: { from: new Date(today.getTime() - DAY), to: today },
        preset: "yesterday",
      };
    case "90d":
      return {
        range: { from: new Date(today.getTime() - 89 * DAY), to: new Date(today.getTime() + DAY) },
        preset: "90d",
      };
    case "30d":
      return {
        range: { from: new Date(today.getTime() - 29 * DAY), to: new Date(today.getTime() + DAY) },
        preset: "30d",
      };
    case "7d":
    default:
      return {
        range: { from: new Date(today.getTime() - 6 * DAY), to: new Date(today.getTime() + DAY) },
        preset: "7d",
      };
  }
}
