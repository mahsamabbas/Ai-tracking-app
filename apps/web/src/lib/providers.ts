export type ProviderTier = "A" | "B";

const LABELS: Record<string, { label: string; tier: ProviderTier; hourly: boolean; empty: string }> =
  {
    cursor: {
      label: "Cursor",
      tier: "B",
      hourly: false,
      empty:
        "Provider does not expose this metric. Cursor is Tier B (daily Admin API only) — hourly session, model, and tool duration are not available.",
    },
    claude_code: {
      label: "Claude Code",
      tier: "A",
      hourly: true,
      empty: "",
    },
    codex: {
      label: "Codex",
      tier: "A",
      hourly: true,
      empty: "Some token totals are not available from Codex.",
    },
    gemini: {
      label: "Gemini CLI",
      tier: "A",
      hourly: true,
      empty: "Some token totals are not available from Gemini.",
    },
    github_copilot: {
      label: "GitHub Copilot",
      tier: "B",
      hourly: false,
      empty:
        "Provider does not expose this metric. Copilot reports are daily-only.",
    },
    vscode: {
      label: "VS Code companion",
      tier: "B",
      hourly: false,
      empty: "Companion records file and task metadata only — not model sessions.",
    },
    companion: {
      label: "IDE companion",
      tier: "B",
      hourly: false,
      empty: "Companion records file and task metadata only.",
    },
  };

export function providerLabel(id: string | undefined): string {
  if (!id) return "Unknown";
  return LABELS[id]?.label ?? id;
}

export function providerMeta(id: string | undefined) {
  if (!id) return undefined;
  return LABELS[id];
}

export function isTierB(id: string | undefined): boolean {
  return LABELS[id ?? ""]?.hourly === false;
}
