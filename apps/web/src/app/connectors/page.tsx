"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ConnectorCards } from "@/components/ConnectorCards";
import { API_BASE, DEVICE_ID } from "@/lib/api";
import { fetchTeamDashboard } from "@/lib/client-api";
import type { ConnectorRow } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";

export default function ConnectorsPage() {
  const { token } = useAuth();
  const [connectors, setConnectors] = useState<ConnectorRow[]>([]);
  const [deviceHealth, setDeviceHealth] = useState<Record<string, unknown> | null>(
    null,
  );

  useEffect(() => {
    if (!token) return;
    fetchTeamDashboard(token).then(({ json }) => {
      setConnectors(Array.isArray(json.connectors) ? json.connectors : []);
    });
    fetch(`${API_BASE}/v1/connectors/${DEVICE_ID}/health`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setDeviceHealth)
      .catch(() => setDeviceHealth(null));
  }, [token]);

  return (
    <AppShell
      title="Connector health"
      subtitle="Version, heartbeat, queue depth, capabilities, and pause"
    >
      <ConnectorCards connectors={connectors} />

      <section className="mt-8 card">
        <h3 className="text-sm font-semibold text-slate-800">
          Device health payload
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Device {DEVICE_ID.slice(0, 8)}…
        </p>
        <pre className="mt-4 overflow-x-auto rounded-2xl bg-[#16141f] p-4 text-xs text-amber-100">
          {JSON.stringify(deviceHealth ?? { status: "unknown" }, null, 2)}
        </pre>
      </section>

      <section className="mt-6 card border-l-4 border-l-amber-400">
        <h3 className="text-sm font-semibold">Local connector</h3>
        <p className="mt-2 text-sm text-slate-600">
          Runs at{" "}
          <code className="rounded bg-[#f4f1ea] px-1">http://127.0.0.1:9477</code>
          . Health:{" "}
          <a
            className="text-indigo-600 underline"
            href="http://127.0.0.1:9477/health"
            target="_blank"
            rel="noreferrer"
          >
            /health
          </a>
        </p>
      </section>
    </AppShell>
  );
}
