import { describe, expect, it } from "vitest";
import { renderSummaryPdf } from "./pdf.js";

describe("renderSummaryPdf", () => {
  it("starts with a PDF header and closes the file", () => {
    const pdf = renderSummaryPdf(["Techlio activity summary", "Events: 3"]);
    const text = pdf.toString("latin1");
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("Techlio activity summary");
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
  });
});
