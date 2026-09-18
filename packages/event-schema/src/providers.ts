/** Provider ids used on events (FR-006 / FR-012). */
export const Providers = {
  claude_code: "claude_code",
  codex: "codex",
  gemini: "gemini",
  cursor: "cursor",
  github_copilot: "github_copilot",
  vscode: "vscode",
} as const;

export type ProviderId = (typeof Providers)[keyof typeof Providers];

export type ProviderTier = "A" | "B";

export interface ProviderCapability {
  id: ProviderId;
  label: string;
  tier: ProviderTier;
  hourly: boolean;
  /** Event catalog areas this provider cannot supply (FR-012). */
  missing: string[];
  emptyState: string;
  /** Extra context shown next to the tool in the dashboard. */
  note?: string;
}

export const PROVIDER_CAPABILITIES: Record<string, ProviderCapability> = {
  claude_code: {
    id: "claude_code",
    label: "Claude Code",
    tier: "A",
    hourly: true,
    missing: [],
    emptyState: "",
    note: "Observed through Claude Code hooks — full session, model, and tool telemetry.",
  },
  codex: {
    id: "codex",
    label: "Codex",
    tier: "A",
    hourly: true,
    missing: ["token_totals"],
    emptyState: "Some token totals are not available from Codex.",
  },
  gemini: {
    id: "gemini",
    label: "Gemini CLI",
    tier: "A",
    hourly: true,
    missing: ["token_totals"],
    emptyState: "Some token totals are not available from Gemini.",
  },
  cursor: {
    id: "cursor",
    label: "Cursor",
    tier: "A",
    hourly: true,
    missing: [],
    emptyState: "",
    note:
      "Observed through the local connector running inside Cursor. The Cursor Admin API is a separate daily-only feed and is not the source of these session metrics.",
  },
  github_copilot: {
    id: "github_copilot",
    label: "GitHub Copilot",
    tier: "B",
    hourly: false,
    missing: [
      "session_boundaries",
      "model_request",
      "tool_calls",
      "hourly_summary",
    ],
    emptyState:
      "Provider does not expose this metric. Copilot organization reports are daily-only.",
    note: "Tier B: GitHub reports aggregate per day, so hourly and session metrics are unavailable.",
  },
  vscode: {
    id: "vscode",
    label: "VS Code companion",
    tier: "B",
    hourly: false,
    missing: ["model_request", "tool_calls"],
    emptyState:
      "VS Code companion records file and task metadata only — not model sessions.",
    note: "Companion extension: file and task-context signals only.",
  },
};

export function providerLabel(id: string | undefined): string {
  if (!id) return "Unknown";
  return PROVIDER_CAPABILITIES[id]?.label ?? id;
}

export function providerCapability(id: string | undefined): ProviderCapability | undefined {
  if (!id) return undefined;
  return PROVIDER_CAPABILITIES[id];
}

/** Map a host IDE name (e.g. vscode.env.appName) to a provider id. */
export function providerFromHostApp(appName: string | undefined): ProviderId {
  const n = (appName ?? "").toLowerCase();
  if (n.includes("cursor")) return "cursor";
  if (n.includes("visual studio code") || n === "vscode") return "vscode";
  if (n.includes("claude")) return "claude_code";
  return "cursor";
}
