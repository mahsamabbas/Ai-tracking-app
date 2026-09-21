import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { EventTypes, SCHEMA_VERSION } from "@techlio/event-schema";

vi.mock("./db.js", () => {
  const returning = vi.fn(async (value: { eventId: string }) => [value]);
  const onConflictDoNothing = vi.fn(() => ({ returning }));
  const values = vi.fn(() => ({ onConflictDoNothing }));
  return {
    db: {
      insert: vi.fn(() => ({ values })),
    },
  };
});

vi.mock("./sessionize.js", () => ({
  applySessionization: vi.fn(async () => undefined),
}));

vi.mock("./devices.js", () => ({
  recordLiveHeartbeat: vi.fn(async () => undefined),
}));

import { ingestBatch } from "./ingest.js";

describe("ingest replay protection", () => {
  it("rejects a repeated event id without changing aggregates twice", async () => {
    const organizationId = "550e8400-e29b-41d4-a716-446655440010";
    const deviceId = "550e8400-e29b-41d4-a716-446655440012";
    const event = {
      event_id: randomUUID(),
      schema_version: SCHEMA_VERSION,
      organization_id: organizationId,
      developer_id: "550e8400-e29b-41d4-a716-446655440011",
      device_id: deviceId,
      provider: "claude_code",
      connector_version: "0.1.0",
      event_type: EventTypes.session_started,
      occurred_at: new Date().toISOString(),
      consent_version: "1",
    };

    await expect(
      ingestBatch(organizationId, { events: [event] }, deviceId),
    ).resolves.toMatchObject({ accepted: 1, rejected: 0 });
    await expect(
      ingestBatch(organizationId, { events: [event] }, deviceId),
    ).resolves.toMatchObject({
      accepted: 0,
      rejected: 1,
      reasons: ["replay"],
    });
  });
});
