import { describe, expect, it } from "vitest";
import { claudeHookToEvents, type ConnectorContext } from "./claude-hook.js";

const ctx: ConnectorContext = {
  organizationId: "550e8400-e29b-41d4-a716-446655440010",
  developerId: "550e8400-e29b-41d4-a716-446655440011",
  deviceId: "550e8400-e29b-41d4-a716-446655440012",
  connectorVersion: "0.1.0",
  consentVersion: "1",
  provider: "claude_code",
};

describe("claudeHookToEvents", () => {
  it("maps a finished tool call without keeping the tool input", () => {
    const [event] = claudeHookToEvents(
      {
        hook_event_name: "PostToolUse",
        session_id: "550e8400-e29b-41d4-a716-446655440099",
        tool_name: "Edit",
        cwd: "/tmp/TechlioTrackingApp",
        file_path: "/tmp/TechlioTrackingApp/apps/web/src/app/page.tsx",
        duration_ms: 1200,
      },
      ctx,
    );
    expect(event?.event_type).toBe("tool_completed");
    expect(event?.metadata?.tool_category).toBe("file_write");
    expect(event?.metadata?.file_path).toBe("apps/web/src/app/page.tsx");
    expect(event?.metadata?.path_category).toBe("TechlioTrackingApp");
    expect(event?.duration_ms).toBe(1200);
    expect(JSON.stringify(event)).not.toContain("prompt");
  });

  it("maps Cursor stop and prompt hooks onto model events", () => {
    const started = claudeHookToEvents(
      { hook_event_name: "beforeSubmitPrompt", session_id: "abc" },
      { ...ctx, provider: "cursor" },
    );
    const finished = claudeHookToEvents(
      { hook_event_name: "stop", model: "composer" },
      { ...ctx, provider: "cursor" },
    );
    expect(started[0]?.event_type).toBe("model_request_started");
    expect(started[0]?.provider).toBe("cursor");
    expect(finished[0]?.event_type).toBe("model_request_completed");
    expect(finished[0]?.metadata?.model_name).toBe("composer");
  });

  it("ignores unknown hook names", () => {
    expect(claudeHookToEvents({ hook_event_name: "afterAgentThought" }, ctx)).toEqual([]);
  });
});
