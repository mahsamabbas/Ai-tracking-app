"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { Callout } from "@/components/ui/Callout";
import { CONNECTOR_LOCAL, claimLocalConnector } from "@/components/domain/ConnectThisComputer";
import { providerLabel } from "@/lib/providers";

export const SELF_SERVE_TOOLS = [
  {
    id: "cursor",
    label: "Cursor",
    setup: [
      "Keep the Techlio connector running on this computer (pnpm dev).",
      "In Cursor: Extensions → Install from VSIX → the Techlio companion in apps/extension.",
    ],
  },
  {
    id: "claude_code",
    label: "Claude Code",
    setup: [
      "Keep the Techlio connector running on this computer.",
      "Point Claude Code hooks at http://127.0.0.1:9477/hooks/claude",
    ],
  },
  {
    id: "vscode",
    label: "VS Code companion",
    setup: [
      "Keep the Techlio connector running on this computer.",
      "In VS Code: Extensions → Install from VSIX → the Techlio companion.",
    ],
  },
  {
    id: "gemini",
    label: "Gemini CLI",
    setup: [
      "Keep the Techlio connector running on this computer.",
      "Send OTLP traces to http://127.0.0.1:9477/v1/traces (Gemini session detail is still partial).",
    ],
  },
  {
    id: "codex",
    label: "Codex",
    setup: [
      "Keep the Techlio connector running on this computer.",
      "Send OTLP traces to http://127.0.0.1:9477/v1/traces (Codex session detail is still partial).",
    ],
  },
  {
    id: "github_copilot",
    label: "GitHub Copilot (org reports)",
    setup: [],
    orgOnly: true,
  },
] as const;

function toolOf(id: string) {
  return SELF_SERVE_TOOLS.find((t) => t.id === id);
}

export function AddConnectorForm({
  developerId,
  displayName,
  onAdded,
}: {
  developerId: string;
  displayName?: string;
  onAdded?: () => void;
}) {
  const { token } = useAuth();
  const [provider, setProvider] = useState("cursor");
  const [label, setLabel] = useState("This computer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  const tool = toolOf(provider);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    setAdded(null);

    if (tool && "orgOnly" in tool && tool.orgOnly) {
      setBusy(false);
      setError(
        "GitHub Copilot is an organisation daily report, not a connector you install. Ask an administrator to enable the Copilot puller.",
      );
      return;
    }

    try {
      const identityRes = await fetch(`${CONNECTOR_LOCAL}/identity`);
      const identity = (await identityRes.json()) as {
        paired?: boolean;
        providers?: string[];
      };

      if (identity.paired) {
        const enable = await fetch(`${CONNECTOR_LOCAL}/enable-tool`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider }),
        });
        if (!enable.ok) {
          throw new Error("Could not add that tool on this computer");
        }
        setAdded(provider);
        onAdded?.();
      } else {
        const res = await claimLocalConnector({
          accessToken: token,
          developerId,
          displayName,
          provider,
          label,
        });
        if (!res.ok) {
          setError(res.message);
        } else {
          setAdded(provider);
          onAdded?.();
        }
      }
    } catch {
      setError(
        "The connector is not running on this computer. Keep pnpm dev running, then add the tool again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const setup = added ? toolOf(added)?.setup : null;

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <label className="block">
        <span className="label mb-1 block">Connector name</span>
        <input
          className="field"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Work Mac"
          maxLength={80}
        />
      </label>
      <label className="block">
        <span className="label mb-1 block">AI tool</span>
        <select
          className="field"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
        >
          {SELF_SERVE_TOOLS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <p className="hint">
        This computer is linked to you when you add the first tool. Add Cursor, Claude Code, or
        another tool on the same form — you do not paste environment variables.
      </p>
      <button type="submit" className="btn-primary w-full" disabled={busy || !token}>
        {busy ? "Adding…" : "Add connector on this computer"}
      </button>
      {error ? (
        <Callout tone="bad" title={error} />
      ) : null}
      {setup && setup.length > 0 ? (
        <Callout
          tone="info"
          title={`${providerLabel(added)} is enabled on this computer`}
        >
          <ol className="mt-1 list-decimal space-y-1 pl-4">
            {setup.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </Callout>
      ) : null}
    </form>
  );
}
