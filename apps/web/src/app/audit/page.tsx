import { AppShell } from "@/components/AppShell";

const ROWS = [
  { action: "events.batch_ingest", role: "connector", note: "Append-only ingest" },
  { action: "connector.pause", role: "developer", note: "Creates coverage gap" },
  { action: "login", role: "all", note: "OIDC — pilot pending" },
];

export default function AuditPage() {
  return (
    <AppShell
      title="Audit history"
      subtitle="Security and policy actions (read-only pilot view)"
    >
      <div className="card overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">Action</th>
              <th className="px-5 py-3">Actor</th>
              <th className="px-5 py-3">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ROWS.map((r) => (
              <tr key={r.action}>
                <td className="px-5 py-3 font-mono text-xs">{r.action}</td>
                <td className="px-5 py-3">{r.role}</td>
                <td className="px-5 py-3 text-slate-600">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Full audit stream from <code>audit_log</code> will appear after database
        connectivity is enabled.
      </p>
    </AppShell>
  );
}
