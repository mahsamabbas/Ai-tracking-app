"use client";

import { providerLabel } from "@/lib/providers";

export type DashboardFilters = {
  eventType: string;
  provider: string;
  coverageOnly: boolean;
  connectorState: "" | "online" | "stale" | "paused";
};

export function FilterBar({
  filters,
  onChange,
  onExportCsv,
  onExportPdf,
  liveAt,
}: {
  filters: DashboardFilters;
  onChange: (f: DashboardFilters) => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
  liveAt: string | null;
}) {
  return (
    <div className="mb-6 space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Filters</h3>
        {liveAt ? (
          <span className="text-xs text-emerald-700">
            Live · {new Date(liveAt).toLocaleTimeString()}
          </span>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Event type
          <input
            className="min-h-[40px] rounded-lg border border-slate-300 px-3 text-sm"
            value={filters.eventType}
            onChange={(e) =>
              onChange({ ...filters, eventType: e.target.value })
            }
            placeholder="All types"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Provider
          <select
            className="min-h-[40px] rounded-lg border border-slate-300 px-3 text-sm"
            value={filters.provider}
            onChange={(e) =>
              onChange({ ...filters, provider: e.target.value })
            }
          >
            <option value="">All providers</option>
            {["cursor", "claude_code", "codex", "gemini", "github_copilot"].map(
              (id) => (
                <option key={id} value={id}>
                  {providerLabel(id)}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Connector state
          <select
            className="min-h-[40px] rounded-lg border border-slate-300 px-3 text-sm"
            value={filters.connectorState}
            onChange={(e) =>
              onChange({
                ...filters,
                connectorState: e.target.value as DashboardFilters["connectorState"],
              })
            }
          >
            <option value="">Any</option>
            <option value="online">Online</option>
            <option value="stale">Stale</option>
            <option value="paused">Paused</option>
          </select>
        </label>
        <label className="flex min-h-[40px] items-center gap-2 self-end text-sm text-slate-700">
          <input
            type="checkbox"
            checked={filters.coverageOnly}
            onChange={(e) =>
              onChange({ ...filters, coverageOnly: e.target.checked })
            }
            className="h-4 w-4 rounded border-slate-300"
          />
          Coverage warnings only
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="min-h-[40px] rounded-lg bg-slate-800 px-4 text-sm text-white hover:bg-slate-700"
          onClick={onExportCsv}
        >
          Export CSV
        </button>
        <button
          type="button"
          className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-800 hover:bg-slate-50"
          onClick={onExportPdf}
        >
          Export PDF
        </button>
      </div>
    </div>
  );
}
