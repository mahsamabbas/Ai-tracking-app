import { describe, expect, it } from "vitest";
import { copilotRowToEvent, parseCopilotUserDayReport } from "./copilot.js";

describe("parseCopilotUserDayReport", () => {
  it("parses NDJSON lines", () => {
    const text = `{"day":"2026-09-01","login":"dev1","total_suggestions_count":10,"total_acceptances_count":3}\n`;
    const rows = parseCopilotUserDayReport(text);
    expect(rows).toHaveLength(1);
    expect(rows[0].login).toBe("dev1");
    expect(rows[0].total_suggestions_count).toBe(10);
  });
});

describe("copilotRowToEvent", () => {
  it("marks Tier B copilot aggregate", () => {
    const e = copilotRowToEvent(
      {
        day: "2026-09-01",
        login: "dev1",
        total_suggestions_count: 5,
      },
      {
        organizationId: "550e8400-e29b-41d4-a716-446655440010",
        developerId: "550e8400-e29b-41d4-a716-446655440011",
        deviceId: "550e8400-e29b-41d4-a716-446655440012",
        connectorVersion: "0.1.0",
        consentVersion: "1",
      },
    );
    expect(e.provider).toBe("github_copilot");
    expect(e.metadata?.aggregate_kind).toBe("copilot_user_day");
    expect(e.metadata?.suggestions_count).toBe(5);
  });
});
