export interface TimeInterval {
  startMs: number;
  endMs: number;
}

/** Merge overlapping intervals (sweep-line). */
export function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals]
    .filter((i) => i.endMs > i.startMs)
    .sort((a, b) => a.startMs - b.startMs);
  const out: TimeInterval[] = [];
  let cur = { ...sorted[0] };
  for (let i = 1; i < sorted.length; i++) {
    const n = sorted[i];
    if (n.startMs <= cur.endMs) {
      cur.endMs = Math.max(cur.endMs, n.endMs);
    } else {
      out.push(cur);
      cur = { ...n };
    }
  }
  out.push(cur);
  return out;
}

export function totalDurationMs(intervals: TimeInterval[]): number {
  return mergeIntervals(intervals).reduce(
    (sum, i) => sum + (i.endMs - i.startMs),
    0,
  );
}

export function clipToHour(
  interval: TimeInterval,
  hourStartMs: number,
): TimeInterval | null {
  const hourEnd = hourStartMs + 60 * 60 * 1000;
  const start = Math.max(interval.startMs, hourStartMs);
  const end = Math.min(interval.endMs, hourEnd);
  if (end <= start) return null;
  return { startMs: start, endMs: end };
}

export function clipIntervalsToHour(
  intervals: TimeInterval[],
  hourStartMs: number,
): TimeInterval[] {
  return intervals
    .map((i) => clipToHour(i, hourStartMs))
    .filter((i): i is TimeInterval => i !== null);
}
