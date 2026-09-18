import { describe, expect, it } from "vitest";
import { providerFromHostApp, providerLabel } from "./providers.js";

describe("providerFromHostApp", () => {
  it("maps Cursor IDE to cursor, not claude_code", () => {
    expect(providerFromHostApp("Cursor")).toBe("cursor");
    expect(providerLabel("cursor")).toBe("Cursor");
  });

  it("maps VS Code distinctly", () => {
    expect(providerFromHostApp("Visual Studio Code")).toBe("vscode");
  });
});
