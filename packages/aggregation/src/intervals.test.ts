import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { mergeIntervals, totalDurationMs } from "./intervals.js";
import { computeHourlyDurations } from "./hourly.js";

describe("mergeIntervals", () => {
  it("merges overlaps without double counting", () => {
    const merged = mergeIntervals([
      { startMs: 0, endMs: 100 },
      { startMs: 50, endMs: 150 },
    ]);
    expect(totalDurationMs(merged)).toBe(150);
  });

  it("property: merged duration <= sum of parts", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            startMs: fc.integer({ min: 0, max: 1000 }),
            endMs: fc.integer({ min: 0, max: 2000 }),
          }),
          { maxLength: 20 },
        ),
        (raw) => {
          const intervals = raw
            .map((i) => ({
              startMs: i.startMs,
              endMs: Math.max(i.startMs, i.endMs),
            }))
            .filter((i) => i.endMs > i.startMs);
          const sum = intervals.reduce((s, i) => s + (i.endMs - i.startMs), 0);
          const merged = totalDurationMs(mergeIntervals(intervals));
          return merged <= sum;
        },
      ),
    );
  });
});

describe("computeHourlyDurations", () => {
  it("keeps five metrics separate", () => {
    const hour = Date.UTC(2026, 0, 1, 10, 0, 0);
    const d = computeHourlyDurations({
      hourStartMs: hour,
      modelIntervals: [{ startMs: hour + 1000, endMs: hour + 5000 }],
      toolIntervals: [{ startMs: hour + 2000, endMs: hour + 8000 }],
      sessions: [
        {
          sessionId: "s1",
          eventTimesMs: [hour + 1000, hour + 600_000, hour + 700_000],
        },
      ],
      idleThresholdMs: 10 * 60 * 1000,
    });
    expect(d.modelDurationMs).toBe(4000);
    expect(d.toolDurationMs).toBe(6000);
    expect(d.mergedActiveDurationMs).toBe(7000);
    expect(d.interactiveSpanMs).not.toBe(d.mergedActiveDurationMs);
  });
});
