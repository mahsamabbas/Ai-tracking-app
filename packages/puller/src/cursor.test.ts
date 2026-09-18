import { describe, expect, it } from "vitest";
import { cursorRowToEvent } from "./cursor.js";

describe("cursorRowToEvent", () => {
  it("marks Tier B daily aggregate", () => {
    const e = cursorRowToEvent(
      { userId: 1, day: "2026-09-01", chatRequests: 5 },
      {
        organizationId: "550e8400-e29b-41d4-a716-446655440010",
        developerId: "550e8400-e29b-41d4-a716-446655440011",
        deviceId: "550e8400-e29b-41d4-a716-446655440012",
        connectorVersion: "0.1.0",
        consentVersion: "1",
      },
    );
    expect(e.metadata?.tier).toBe("B");
    expect(e.metadata?.daily_only).toBe(true);
  });
});
