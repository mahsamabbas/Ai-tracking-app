import { describe, expect, it } from "vitest";
import { ActivityEventSchema } from "./event.js";

describe("ActivityEventSchema", () => {
  it("rejects unknown metadata keys", () => {
    const base = {
      event_id: "550e8400-e29b-41d4-a716-446655440000",
      schema_version: "1.0.0",
      organization_id: "550e8400-e29b-41d4-a716-446655440001",
      developer_id: "550e8400-e29b-41d4-a716-446655440002",
      device_id: "550e8400-e29b-41d4-a716-446655440003",
      provider: "claude_code",
      connector_version: "0.1.0",
      event_type: "session_started",
      occurred_at: new Date().toISOString(),
      consent_version: "1",
    };
    expect(
      ActivityEventSchema.safeParse({
        ...base,
        metadata: { secret_key: "leak" },
      }).success,
    ).toBe(false);
  });
});
