import { describe, expect, it } from "vitest";
import {
  providerCapability,
  providerFromHostApp,
  providerLabel,
} from "./providers.js";

describe("providerFromHostApp", () => {
  it("maps Cursor IDE to cursor, not claude_code", () => {
    expect(providerFromHostApp("Cursor")).toBe("cursor");
    expect(providerLabel("cursor")).toBe("Cursor");
  });

  it("maps VS Code distinctly", () => {
    expect(providerFromHostApp("Visual Studio Code")).toBe("vscode");
  });

  it("does not claim unavailable adapters provide hourly telemetry", () => {
    expect(providerCapability("cursor")).toMatchObject({
      tier: "B",
      hourly: false,
    });
    expect(providerCapability("codex")?.hourly).toBe(false);
    expect(providerCapability("gemini")?.hourly).toBe(false);
  });
});
