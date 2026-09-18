import type { ActivityEventRow } from "@/lib/types";
import { providerLabel } from "@/lib/providers";

function fmt(n: unknown): string {
  if (typeof n === "number" && !Number.isNaN(n)) return String(n);
  return "—";
}

export function ProviderTierBSummary({ events }: { events: ActivityEventRow[] }) {
  const rows = events
    .filter((e) => e.event_type === "provider_daily_aggregate")
    .slice(0, 12);

  if (rows.length === 0) return null;

  return (
    <section className="card mb-6 overflow-hidden p-0">
      <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
        <h3 className="text-sm font-semibold text-slate-800">
          Provider daily metrics (Tier B)
        </h3>
        <p className="text-xs text-slate-500">
          From Cursor Admin / Analytics API and GitHub Copilot org reports — not
          hourly agent sessions.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Provider</th>
              <th className="px-4 py-2">Day</th>
              <th className="px-4 py-2">Kind</th>
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Signals</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((e, i) => {
              const m = e.metadata ?? {};
              const signals: string[] = [];
              if (m.completions_count != null)
                signals.push(`completions ${fmt(m.completions_count)}`);
              if (m.chat_requests_count != null)
                signals.push(`chat ${fmt(m.chat_requests_count)}`);
              if (m.lines_added != null)
                signals.push(`+${fmt(m.lines_added)} lines`);
              if (m.lines_deleted != null)
                signals.push(`-${fmt(m.lines_deleted)} lines`);
              if (m.dau != null) signals.push(`DAU ${fmt(m.dau)}`);
              if (m.total_accepts != null)
                signals.push(`accepts ${fmt(m.total_accepts)}`);
              if (m.suggestions_count != null)
                signals.push(`suggestions ${fmt(m.suggestions_count)}`);
              if (m.acceptances_count != null)
                signals.push(`acceptances ${fmt(m.acceptances_count)}`);
              const user =
                (m.external_login as string) ||
                (m.provider_user_id as string) ||
                "—";
              return (
                <tr key={e.event_id ?? i}>
                  <td className="px-4 py-2">{providerLabel(e.provider)}</td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {(m.aggregate_day as string) ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {(m.aggregate_kind as string) ?? "aggregate"}
                  </td>
                  <td className="px-4 py-2 text-xs">{user}</td>
                  <td className="px-4 py-2 text-xs text-slate-600">
                    {signals.length ? signals.join(" · ") : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
