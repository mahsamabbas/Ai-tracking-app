import type { DeveloperOverviewRow } from "@/lib/types";
import { formatTime } from "@/lib/analytics";
import { providerLabel } from "@/lib/providers";

function stateBadge(state?: string) {
  if (state === "online") return <span className="badge-ok">Online</span>;
  if (state === "paused") return <span className="badge-warn">Paused</span>;
  return <span className="badge-error">Stale</span>;
}

export function TeamOverviewTable({
  rows,
}: {
  rows: DeveloperOverviewRow[];
}) {
  if (rows.length === 0) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-slate-800">Team status</h3>
        <p className="mt-2 text-sm text-slate-500">
          No registered connectors — start the local connector with{" "}
          <code className="rounded bg-slate-100 px-1">pnpm dev</code>.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: cards */}
      <div className="space-y-3 md:hidden">
        {rows.map((d) => (
          <article key={d.deviceId} className="card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {providerLabel(d.provider ?? undefined)}
                </p>
                <p className="font-mono text-xs text-slate-500">
                  {d.deviceId?.slice(0, 14)}…
                </p>
              </div>
              {stateBadge(d.connectorState)}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-slate-500">Last event</dt>
                <dd className="font-medium text-slate-800">
                  {formatTime(d.lastEventAt ?? undefined)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">This hour</dt>
                <dd className="font-medium tabular-nums text-slate-800">
                  {d.eventsThisHour ?? 0} events
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-500">Task context</dt>
                <dd className="font-medium text-slate-800">
                  {d.currentSession?.unassigned || !d.currentSession?.projectId
                    ? "Unassigned"
                    : `Project ${d.currentSession.projectId?.slice(0, 8)}…`}
                </dd>
              </div>
              {d.coverageWarning ? (
                <div className="col-span-2 text-amber-800">
                  Coverage warning — do not infer inactivity
                </div>
              ) : null}
            </dl>
          </article>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="card hidden overflow-hidden p-0 md:block">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-800">Team status</h3>
          <p className="text-xs text-slate-500">
            Connector state, context, and current-hour activity (FR-020)
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Connector</th>
                <th className="px-4 py-3">Context</th>
                <th className="px-4 py-3">Session</th>
                <th className="px-4 py-3">Last event</th>
                <th className="px-4 py-3">Hour</th>
                <th className="px-4 py-3">Coverage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((d) => (
                <tr key={d.deviceId} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium">
                    {providerLabel(d.provider ?? undefined)}
                  </td>
                  <td className="px-4 py-3">{stateBadge(d.connectorState)}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {d.currentSession?.unassigned ||
                    !d.currentSession?.projectId
                      ? "Unassigned"
                      : "Assigned"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {d.currentSession?.sessionId?.slice(0, 8) ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {formatTime(d.lastEventAt ?? undefined)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {d.eventsThisHour ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    {d.coverageWarning ? (
                      <span className="badge-warn">Gap risk</span>
                    ) : (
                      <span className="badge-ok">OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
