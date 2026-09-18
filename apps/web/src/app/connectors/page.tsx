"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ConnectorCards } from "@/components/ConnectorCards";
import { DEVICE_ID, API_BASE } from "@/lib/api";
import {
  fetchOrgDevelopers,
  fetchTeamDashboard,
  registerConnector,
  revokeConnector,
} from "@/lib/client-api";
import type { ConnectorRow } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { canManageConnectors } from "@/lib/permissions";

export default function ConnectorsPage() {
  const { token, user } = useAuth();
  const isAdmin = canManageConnectors(user?.role);
  const [connectors, setConnectors] = useState<ConnectorRow[]>([]);
  const [deviceHealth, setDeviceHealth] = useState<Record<string, unknown> | null>(
    null,
  );
  const [developers, setDevelopers] = useState<
    { developerId: string; displayName: string }[]
  >([]);
  const [developerId, setDeveloperId] = useState("");
  const [issued, setIssued] = useState<{ deviceId: string; token: string } | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    const team = await fetchTeamDashboard(token);
    setConnectors(Array.isArray(team.json.connectors) ? team.json.connectors : []);
    const { json } = await fetchOrgDevelopers(token);
    const rows = json.developers ?? [];
    setDevelopers(rows);
    if (!developerId && rows[0]) setDeveloperId(rows[0].developerId);
    const healthRes = await fetch(
      `${API_BASE}/v1/connectors/${DEVICE_ID}/health`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    setDeviceHealth(await healthRes.json().catch(() => null));
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function onRegister(e: FormEvent) {
    e.preventDefault();
    if (!token || !developerId) return;
    const { ok, json } = await registerConnector(token, developerId);
    if (!ok) {
      setMessage("Register failed — administrators issue device credentials.");
      return;
    }
    setIssued({ deviceId: json.deviceId, token: json.token });
    setMessage("Credential issued. Copy the token now — it is shown once.");
    await load();
  }

  async function onRevoke(deviceId: string) {
    if (!token) return;
    const { ok } = await revokeConnector(token, deviceId);
    setMessage(ok ? "Credential revoked." : "Revoke failed.");
    await load();
  }

  return (
    <AppShell
      title="Connector health"
      subtitle="Version, heartbeat, queue depth, capabilities, and pause"
    >
      {isAdmin ? (
        <section className="card mb-6">
          <h3 className="text-sm font-semibold text-ink-900">
            Register a connector
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Issues a revocable device credential bound to one developer (FR-007).
          </p>
          <form className="mt-4 flex flex-wrap gap-3" onSubmit={onRegister}>
            <select
              className="min-h-[40px] rounded-lg border border-slate-300 px-3 text-sm"
              value={developerId}
              onChange={(e) => setDeveloperId(e.target.value)}
            >
              {developers.map((d) => (
                <option key={d.developerId} value={d.developerId}>
                  {d.displayName}
                </option>
              ))}
            </select>
            <button type="submit" className="btn-primary">
              Issue credential
            </button>
          </form>
          {issued ? (
            <pre className="mt-4 overflow-x-auto rounded-lg bg-ink-950 p-4 text-xs text-teal-100">
              {JSON.stringify(issued, null, 2)}
            </pre>
          ) : null}
        </section>
      ) : (
        <p className="mb-4 text-sm text-slate-600">
          Read-only connector health. Administrators register and revoke
          credentials.
        </p>
      )}

      {message ? <p className="mb-4 text-sm text-slate-700">{message}</p> : null}

      <ConnectorCards connectors={connectors} />

      {isAdmin && connectors.length > 0 ? (
        <section className="mt-6 card">
          <h3 className="text-sm font-semibold">Revoke a device</h3>
          <ul className="mt-3 space-y-2">
            {connectors.map((c) => {
              const id = c.deviceId ?? c.device_id;
              if (!id) return null;
              return (
                <li key={id} className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs">{id.slice(0, 18)}…</span>
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    onClick={() => void onRevoke(id)}
                  >
                    Revoke
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="mt-8 card">
        <h3 className="text-sm font-semibold text-slate-800">
          Default local device health
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Device {DEVICE_ID.slice(0, 8)}… (Alex’s seeded connector)
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-ink-950 p-4 text-xs text-teal-100">
          {JSON.stringify(deviceHealth ?? { status: "unknown" }, null, 2)}
        </pre>
      </section>
    </AppShell>
  );
}
