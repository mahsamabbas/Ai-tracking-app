import { describe, expect, it } from "vitest";
import { resolveRange } from "./range.js";

const NOW = new Date("2026-09-18T14:30:00.000Z");
const DAY = 86_400_000;

describe("resolveRange", () => {
  it("anchors 'today' on the current clock day", () => {
    const { range, preset } = resolveRange({ preset: "today", now: NOW });
    expect(preset).toBe("today");
    expect(range.from.toISOString()).toBe("2026-09-18T00:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-09-19T00:00:00.000Z");
  });

  it("includes today in the 7-day window", () => {
    const { range } = resolveRange({ preset: "7d", now: NOW });
    expect(range.from.toISOString()).toBe("2026-09-12T00:00:00.000Z");
    expect(range.to.getTime() - range.from.getTime()).toBe(7 * DAY);
  });

  it("defaults to 7 days when the preset is unknown", () => {
    expect(resolveRange({ preset: "nonsense", now: NOW }).preset).toBe("7d");
  });

  it("prefers explicit from/to over any preset", () => {
    const { range, preset } = resolveRange({
      preset: "today",
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-02-01T00:00:00.000Z",
      now: NOW,
    });
    expect(preset).toBe("custom");
    expect(range.from.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("falls back to the preset when from is not a valid date", () => {
    expect(resolveRange({ preset: "30d", from: "not-a-date", now: NOW }).preset).toBe("30d");
  });
});
