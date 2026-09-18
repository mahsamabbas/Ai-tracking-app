import { describe, expect, it } from "vitest";
import { sanitizeEvent } from "./redaction.js";
import { EventTypes, SCHEMA_VERSION, type ActivityEvent } from "@techlio/event-schema";

const base: ActivityEvent = {
  event_id: "550e8400-e29b-41d4-a716-446655440099",
  schema_version: SCHEMA_VERSION,
  organization_id: "550e8400-e29b-41d4-a716-446655440010",
  developer_id: "550e8400-e29b-41d4-a716-446655440011",
  device_id: "550e8400-e29b-41d4-a716-446655440012",
  provider: "claude_code",
  connector_version: "0.1.0",
  event_type: EventTypes.session_started,
  occurred_at: new Date().toISOString(),
  consent_version: "1",
};

describe("sanitizeEvent", () => {
  it("rejects events with secrets in payload", () => {
    expect(
      sanitizeEvent({
        ...base,
        metadata: { tool_name: "ghp_abcdefghijklmnopqrstuvwxyz123456", tool_category: "other" },
      }),
    ).toBeNull();
  });
});
