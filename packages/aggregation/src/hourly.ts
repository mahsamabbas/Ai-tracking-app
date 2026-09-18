import {
  clipIntervalsToHour,
  mergeIntervals,
  totalDurationMs,
  type TimeInterval,
} from "./intervals.js";

export interface SessionSpanInput {
  sessionId: string;
  eventTimesMs: number[];
}

export interface HourlyMetricsInput {
  hourStartMs: number;
  modelIntervals: TimeInterval[];
  toolIntervals: TimeInterval[];
  sessions: SessionSpanInput[];
  idleThresholdMs: number;
}

export interface HourlyDurations {
  modelDurationMs: number;
  toolDurationMs: number;
  mergedActiveDurationMs: number;
  interactiveSpanMs: number;
  elapsedSessionSpanMs: number;
}

function interactiveSpanForSession(
  times: number[],
  idleThresholdMs: number,
): number {
  if (times.length === 0) return 0;
  const sorted = [...times].sort((a, b) => a - b);
  let spanStart = sorted[0];
  let spanEnd = sorted[0];
  let total = 0;
  for (let i = 1; i < sorted.length; i++) {
    const t = sorted[i];
    if (t - spanEnd > idleThresholdMs) {
      total += spanEnd - spanStart;
      spanStart = t;
      spanEnd = t;
    } else {
      spanEnd = t;
    }
  }
  total += spanEnd - spanStart;
  return total;
}

export function computeHourlyDurations(
  input: HourlyMetricsInput,
): HourlyDurations {
  const hour = input.hourStartMs;
  const modelClipped = clipIntervalsToHour(input.modelIntervals, hour);
  const toolClipped = clipIntervalsToHour(input.toolIntervals, hour);
  const merged = mergeIntervals([...modelClipped, ...toolClipped]);

  const modelDurationMs = totalDurationMs(modelClipped);
  const toolDurationMs = totalDurationMs(toolClipped);
  const mergedActiveDurationMs = totalDurationMs(merged);

  let interactiveSpanMs = 0;
  let elapsedSessionSpanMs = 0;
  for (const s of input.sessions) {
    const inHour = s.eventTimesMs.filter(
      (t) => t >= hour && t < hour + 3600_000,
    );
    if (inHour.length === 0) continue;
    interactiveSpanMs += interactiveSpanForSession(
      inHour,
      input.idleThresholdMs,
    );
    elapsedSessionSpanMs += Math.max(...inHour) - Math.min(...inHour);
  }

  return {
    modelDurationMs,
    toolDurationMs,
    mergedActiveDurationMs,
    interactiveSpanMs,
    elapsedSessionSpanMs,
  };
}

export const DEFAULT_IDLE_THRESHOLD_MS = 10 * 60 * 1000;
