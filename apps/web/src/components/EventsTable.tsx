import type { ActivityEventRow } from "@/lib/types";
import { formatTime } from "@/lib/analytics";
import { providerLabel } from "@/lib/providers";

export function EventsTable({ events }: { events: ActivityEventRow[] }) {
  if (events.length === 0) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-slate-800">Recent activity</h3>
        <p className="mt-4 text-sm text-slate-500">No activity observed</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden p-0">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-800">Recent activity</h3>
        <p className="text-xs text-slate-500">Newest events first</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Time</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Provider</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Session</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {events.slice(0, 15).map((e, i) => (
              <tr key={e.event_id ?? i} className="hover:bg-slate-50/80">
                <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                  {formatTime(e.occurred_at)}
                </td>
                <td className="px-5 py-3 font-mono text-xs text-indigo-700">
                  {e.event_type ?? "—"}
                </td>
                <td className="px-5 py-3 text-slate-700">
                  {providerLabel(e.provider)}
                </td>
                <td className="px-5 py-3">
                  <span className="badge-muted">{e.status ?? "—"}</span>
                </td>
                <td className="max-w-[120px] truncate px-5 py-3 font-mono text-xs text-slate-500">
                  {e.session_id?.slice(0, 8) ?? "—"}…
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
