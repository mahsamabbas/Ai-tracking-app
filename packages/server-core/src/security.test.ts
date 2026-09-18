import { describe, expect, it } from "vitest";
import { scanEventForSecrets } from "./security.js";

describe("scanEventForSecrets", () => {
  it("rejects github tokens in metadata", () => {
    const hit = scanEventForSecrets({
      metadata: { tool_name: "ghp_abcdefghijklmnopqrstuvwxyz123456" },
    });
    expect(hit).toBeTruthy();
  });

  it("rejects forbidden keys", () => {
    expect(scanEventForSecrets({ prompt: "hello" })).toBe("forbidden_key:prompt");
  });
});
