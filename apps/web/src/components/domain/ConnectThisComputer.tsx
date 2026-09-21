"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import { CONNECTOR_LOCAL } from "@/lib/connector-local";
import { Callout } from "@/components/ui/Callout";

export { CONNECTOR_LOCAL };

export async function claimLocalConnector(input: {
  accessToken: string;
  deviceId: string;
  deviceToken: string;
  displayName?: string;
  consentAccepted: boolean;
}): Promise<{ ok: true } | { ok: false; offline: boolean; message: string }> {
  try {
    const r = await fetch(`${CONNECTOR_LOCAL}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken: input.accessToken,
        deviceId: input.deviceId,
        deviceToken: input.deviceToken,
        displayName: input.displayName,
        consentAccepted: input.consentAccepted,
        apiBaseUrl: API_BASE,
      }),
    });
    const json = (await r.json().catch(() => ({}))) as { error?: string };
    if (!r.ok) {
      return {
        ok: false,
        offline: false,
        message: json.error?.replace(/_/g, " ") ?? "Could not activate that key",
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      offline: true,
      message:
        "This page could not reach the connector at 127.0.0.1:9477. Use the install bar at the bottom of the dashboard (macOS) or run pnpm dev:connector, then try again.",
    };
  }
}

export async function unpairLocalConnector(): Promise<boolean> {
  try {
    const r = await fetch(`${CONNECTOR_LOCAL}/unpair`, { method: "POST" });
    return r.ok;
  } catch {
    return false;
  }
}

export function ThisComputerStatus() {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "offline" }
    | { kind: "unpaired" }
    | { kind: "paired"; displayName?: string; providers?: string[]; label?: string | null }
  >({ kind: "loading" });

  async function refresh() {
    try {
      const r = await fetch(`${CONNECTOR_LOCAL}/identity`);
      const json = (await r.json()) as {
        paired?: boolean;
        displayName?: string;
        providers?: string[];
        label?: string | null;
      };
      setState(
        json.paired
          ? {
              kind: "paired",
              displayName: json.displayName,
              providers: json.providers ?? [],
              label: json.label,
            }
          : { kind: "unpaired" },
      );
    } catch {
      setState({ kind: "offline" });
    }
  }

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 10_000);
    return () => clearInterval(t);
  }, []);

  if (state.kind === "loading") return null;

  if (state.kind === "offline") {
    return (
      <Callout tone="warn" title="Connector not running on this computer">
        Install the background connector from the bar at the bottom of the page, or run{" "}
        <code className="code-inline">pnpm dev:connector</code> from the repo, then activate your
        key.
      </Callout>
    );
  }

  if (state.kind === "unpaired") {
    return (
      <Callout tone="warn" title="This computer is not using an assigned key">
        Ask your administrator for a device ID and token, then enter them on My connectors.
      </Callout>
    );
  }

  return (
    <Callout
      tone="info"
      title={`This computer is using ${state.label ?? "your assigned connector"}`}
      action={
        <button
          type="button"
          className="btn-ghost h-8 text-xs"
          onClick={() => void unpairLocalConnector().then(() => refresh())}
        >
          Unpair
        </button>
      }
    >
      Activity is attributed to {state.displayName ?? "you"}
      {state.providers?.length ? ` · ${state.providers.join(", ")}` : ""}. Only an administrator
      can issue another key.
    </Callout>
  );
}
