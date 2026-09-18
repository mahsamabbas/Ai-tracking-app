"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import { fetchAuditLog } from "@/lib/client-api";

type AuditRow = {
  id: string;
  action: string;
  actorId?: string | null;
  detail?: Record<string, unknown> | null;
  createdAt: string;
};

export default function AuditPage() {
  const { token } = useAuth();
  const [entries, setEntries] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    void fetchAuditLog(token).then(({ ok, json }) => {
      if (!ok) {
        setError("Audit history is limited to administrators and auditors.");
        return;
      }
      setEntries(json.entries ?? []);
    });
  }, [token]);

  return (
    <AppShell
      title="Audit history"
      subtitle="Logins, connector credentials, pauses, exports, and policy actions"
    >
      {error ? <p className="mb-4 text-sm text-rose-600">{error}</p> : null}
      <div className="card overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={4}>
                  No audit records yet for this organization.
                </td>
              </tr>
            ) : (
              entries.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{r.action}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {r.actorId ? `${r.actorId.slice(0, 8)}…` : "system"}
                  </td>
                  <td className="max-w-sm truncate px-4 py-3 text-xs text-slate-500">
                    {r.detail ? JSON.stringify(r.detail) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
