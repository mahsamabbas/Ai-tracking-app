import type { DashboardAlert } from "@/lib/types";

export function AlertsPanel({ alerts }: { alerts: DashboardAlert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-slate-800">
          Health notifications
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          No active connector or coverage alerts.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-0">
      <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
        <h3 className="text-sm font-semibold text-slate-800">
          Health notifications
        </h3>
        <p className="text-xs text-slate-500">FR-027 — operational signals</p>
      </div>
      <ul className="divide-y divide-slate-100">
        {alerts.map((a, i) => (
          <li key={`${a.code}-${i}`} className="px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-start gap-2">
              <span
                className={
                  a.severity === "error"
                    ? "badge-error"
                    : a.severity === "warning"
                      ? "badge-warn"
                      : "badge-muted"
                }
              >
                {a.code}
              </span>
              <p className="min-w-0 flex-1 text-sm text-slate-700">
                {a.message}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
