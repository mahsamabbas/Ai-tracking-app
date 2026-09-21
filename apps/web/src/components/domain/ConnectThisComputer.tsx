"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Callout } from "@/components/ui/Callout";

export const CONNECTOR_LOCAL = "http://127.0.0.1:9477";

export async function claimLocalConnector(input: {
  accessToken: string;
  developerId: string;
  displayName?: string;
  provider?: string;
  label?: string;
}): Promise<{ ok: true } | { ok: false; offline: boolean; message: string }> {
  try {
    const r = await fetch(`${CONNECTOR_LOCAL}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken: input.accessToken,
        developerId: input.developerId,
        displayName: input.displayName,
        provider: input.provider,
        label: input.label,
        apiBaseUrl: API_BASE,
      }),
    });
    const json = (await r.json().catch(() => ({}))) as { error?: string };
    if (!r.ok) {
      return {
        ok: false,
        offline: false,
        message: json.error?.replace(/_/g, " ") ?? "Could not pair this computer",
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      offline: true,
      message:
        "The connector is not running on this computer. Keep pnpm dev running, then try again.",
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
        Start it with pnpm dev, then add a connector from My connectors in your portal.
      </Callout>
    );
  }

  if (state.kind === "unpaired") {
    return (
      <Callout tone="warn" title="This computer is not paired">
        Open My connectors and add the AI tool you use on this Mac.
      </Callout>
    );
  }

  return (
    <Callout
      tone="info"
      title={`This computer is paired as ${state.displayName ?? "you"}`}
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
      Agent sessions on this Mac are attributed to you
      {state.providers?.length ? ` · tools: ${state.providers.join(", ")}` : ""}. Unpair or add
      another tool from My connectors.
    </Callout>
  );
}

export function ConnectThisComputer({
  developerId,
  displayName,
}: {
  developerId: string;
  displayName?: string;
}) {
  const { token } = useAuth();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<"ok" | "err" | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  async function connect() {
    if (!token) return;
    setBusy(true);
    setResult(null);
    setDetail(null);
    const res = await claimLocalConnector({
      accessToken: token,
      developerId,
      displayName,
    });
    setBusy(false);
    if (res.ok) {
      setResult("ok");
      setDetail(`${displayName ?? "This person"} is now linked to Cursor on this computer.`);
    } else {
      setResult("err");
      setDetail(res.message);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        className="btn-ghost h-8 text-xs"
        disabled={busy || !token}
        onClick={() => void connect()}
      >
        {busy ? "Connecting…" : "Connect this computer"}
      </button>
      {detail ? (
        <p className={result === "ok" ? "hint text-teal-700" : "hint text-rose-700"}>{detail}</p>
      ) : null}
    </div>
  );
}
