export interface ProviderMeta {
  id: string;
  label: string;
  color: string;
  soft: string;
  ink: string;
  note?: string;
}

const META: Record<string, ProviderMeta> = {
  cursor: {
    id: "cursor",
    label: "Cursor",
    color: "#4f46e5",
    soft: "#eef2ff",
    ink: "#3730a3",
    note: "Observed through the local connector running inside Cursor.",
  },
  claude_code: {
    id: "claude_code",
    label: "Claude Code",
    color: "#d97706",
    soft: "#fffbeb",
    ink: "#92400e",
    note: "Observed through Claude Code hooks — full session, model, and tool telemetry.",
  },
  codex: { id: "codex", label: "Codex", color: "#0d9488", soft: "#f0fdfa", ink: "#115e59" },
  gemini: { id: "gemini", label: "Gemini CLI", color: "#0ea5e9", soft: "#f0f9ff", ink: "#075985" },
  github_copilot: {
    id: "github_copilot",
    label: "GitHub Copilot",
    color: "#64748b",
    soft: "#f8fafc",
    ink: "#334155",
    note: "Tier B: GitHub reports aggregate per day, so session-level metrics are unavailable.",
  },
  vscode: {
    id: "vscode",
    label: "VS Code companion",
    color: "#7c3aed",
    soft: "#f5f3ff",
    ink: "#5b21b6",
    note: "Companion extension: file and task-context signals only.",
  },
};

const FALLBACK: ProviderMeta = {
  id: "unknown",
  label: "Unknown tool",
  color: "#94a3b8",
  soft: "#f1f5f9",
  ink: "#475569",
};

export function providerMeta(id: string | null | undefined): ProviderMeta {
  if (!id) return FALLBACK;
  return META[id] ?? { ...FALLBACK, id, label: id };
}

export function providerLabel(id: string | null | undefined): string {
  return providerMeta(id).label;
}
