"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { Callout } from "@/components/ui/Callout";
import { claimLocalConnector } from "@/components/domain/ConnectThisComputer";
import { providerLabel } from "@/lib/providers";

const SETUP: Record<string, string[]> = {
  cursor: [
    "Keep the Techlio connector running (pnpm dev).",
    "In Cursor: Extensions → Install from VSIX → Techlio companion (apps/extension).",
  ],
  claude_code: [
    "Keep the Techlio connector running.",
    "Point Claude Code hooks at http://127.0.0.1:9477/hooks/claude",
  ],
  vscode: [
    "Keep the Techlio connector running.",
    "In VS Code: Extensions → Install from VSIX → Techlio companion.",
  ],
  gemini: [
    "Keep the Techlio connector running.",
    "Send OTLP traces to http://127.0.0.1:9477/v1/traces",
  ],
  codex: [
    "Keep the Techlio connector running.",
    "Send OTLP traces to http://127.0.0.1:9477/v1/traces",
  ],
};

export function ActivateConnectorForm({
  displayName,
  onActivated,
}: {
  displayName?: string;
  onActivated?: () => void;
}) {
  const { token } = useAuth();
  const [deviceId, setDeviceId] = useState("");
  const [deviceToken, setDeviceToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    setOk(false);
    const res = await claimLocalConnector({
      accessToken: token,
      deviceId: deviceId.trim(),
      deviceToken: deviceToken.trim(),
      displayName,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setOk(true);
    setDeviceId("");
    setDeviceToken("");
    onActivated?.();
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <label className="block">
        <span className="label mb-1 block">Device ID</span>
        <input
          className="field font-mono text-xs"
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          placeholder="Assigned by your administrator"
          required
          autoComplete="off"
        />
      </label>
      <label className="block">
        <span className="label mb-1 block">Connector token</span>
        <input
          className="field font-mono text-xs"
          type="password"
          value={deviceToken}
          onChange={(e) => setDeviceToken(e.target.value)}
          placeholder="Shown once when the admin issued the key"
          required
          autoComplete="off"
        />
      </label>
      <p className="hint">
        You can only activate a key your administrator assigned to you. You cannot create new
        connectors or pick extra AI tools here.
      </p>
      <button type="submit" className="btn-primary w-full" disabled={busy || !token}>
        {busy ? "Activating…" : "Activate on this computer"}
      </button>
      {error ? <Callout tone="bad" title={error} /> : null}
      {ok ? (
        <Callout tone="info" title="This computer is now using your assigned key">
          Activity from this machine is attributed to you. Keep the local connector running.
        </Callout>
      ) : null}
    </form>
  );
}

export function connectorSetupSteps(provider: string | null | undefined): string[] {
  if (!provider) return SETUP.cursor;
  return SETUP[provider] ?? [
    `Keep the Techlio connector running for ${providerLabel(provider)}.`,
  ];
}
