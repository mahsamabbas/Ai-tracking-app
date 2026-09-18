import type { ActivityEventRow } from "@/lib/types";
import { formatTime } from "@/lib/analytics";
import { formatEventContext, formatEventStatus } from "@/lib/event-display";
import { providerLabel } from "@/lib/providers";

export function EventsTable({ events }: { events: ActivityEventRow[] }) {
  if (events.length === 0) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-slate-800">Recent activity</h3>
        <p className="mt-4 text-sm text-slate-500">
          No activity observed — not the same as zero work. Check connector
          health or coverage gaps.
        </p>
      </div>
    );
  }

  const slice = events.slice(0, 15);

  return (
    <div className="card overflow-hidden p-0">
      <div className="border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
        <h3 className="text-sm font-semibold text-slate-800">Recent activity</h3>
        <p className="text-xs text-slate-500">Newest events first</p>
      </div>

      <ul className="divide-y divide-slate-100 md:hidden">
        {slice.map((e, i) => (
          <li key={e.event_id ?? i} className="px-4 py-3">
            <p className="font-mono text-xs text-indigo-700">
              {e.event_type ?? "—"}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {formatTime(e.occurred_at)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {providerLabel(e.provider)} · {formatEventContext(e)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Status: {formatEventStatus(e)}
            </p>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Context</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {slice.map((e, i) => (
              <tr key={e.event_id ?? i} className="hover:bg-slate-50/80">
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {formatTime(e.occurred_at)}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-indigo-700">
                  {e.event_type ?? "—"}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {providerLabel(e.provider)}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formatEventContext(e)}
                </td>
                <td className="px-4 py-3">
                  <span className="badge-muted">{formatEventStatus(e)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
