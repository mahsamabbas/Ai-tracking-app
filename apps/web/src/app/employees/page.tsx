"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState, ErrorState, LoadingBlock, StatSkeleton } from "@/components/ui/States";
import { Sparkline } from "@/components/charts/Sparkline";
import { ConnectorBadge, ProviderBadge } from "@/components/domain/Badges";
import {
  ActiveFilters,
  FilterBar,
  SearchFilter,
  SelectFilter,
} from "@/components/filters/FilterBar";
import {
  RangePicker,
  rangeLabel,
  rangeParams,
  type RangeValue,
} from "@/components/filters/RangePicker";
import { useApi } from "@/lib/use-api";
import { qs } from "@/lib/api";
import { formatDuration, formatNumber, formatRelative, initialsOf } from "@/lib/format";
import { providerLabel } from "@/lib/providers";
import type { EmployeeRow, FilterMeta } from "@/lib/types";

type SortKey = "activity" | "sessions" | "recent" | "name";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "activity", label: "Most AI usage" },
  { value: "sessions", label: "Most sessions" },
  { value: "recent", label: "Recently active" },
  { value: "name", label: "Name (A–Z)" },
];

const CONNECTOR_STATES = [
  { value: "online", label: "Online" },
  { value: "stale", label: "Stale" },
  { value: "paused", label: "Paused" },
  { value: "offline", label: "Offline" },
];

export default function EmployeesPage() {
  const router = useRouter();
  const [range, setRange] = useState<RangeValue>({ preset: "7d" });
  const [search, setSearch] = useState("");
  const [team, setTeam] = useState("");
  const [provider, setProvider] = useState("");
  const [connectorState, setConnectorState] = useState("");
  const [sort, setSort] = useState<SortKey>("activity");

  const meta = useApi<FilterMeta>("/v1/meta/filters");
  const query = useApi<{ employees: EmployeeRow[] }>(
    `/v1/employees${qs({
      ...rangeParams(range),
      search: search || undefined,
      team: team || undefined,
      provider: provider || undefined,
      connectorState: connectorState || undefined,
      sort,
    })}`,
  );

  const rows = query.data?.employees ?? [];

  const summary = useMemo(() => {
    const activeMs = rows.reduce((s, r) => s + r.activeMs, 0);
    const sessions = rows.reduce((s, r) => s + r.sessions, 0);
    const withActivity = rows.filter((r) => r.sessions > 0).length;
    const warnings = rows.filter((r) => r.coverageWarning).length;
    return { activeMs, sessions, withActivity, warnings };
  }, [rows]);

  const chips = [
    search ? { label: `Search: ${search}`, onRemove: () => setSearch("") } : null,
    team ? { label: `Team: ${team}`, onRemove: () => setTeam("") } : null,
    provider
      ? { label: `Tool: ${providerLabel(provider)}`, onRemove: () => setProvider("") }
      : null,
    connectorState
      ? { label: `Connector: ${connectorState}`, onRemove: () => setConnectorState("") }
      : null,
  ].filter(Boolean) as { label: string; onRemove: () => void }[];

  const clearAll = () => {
    setSearch("");
    setTeam("");
    setProvider("");
    setConnectorState("");
  };

  return (
    <AppShell
      title="Employees"
      subtitle={`AI tool usage per person · ${rangeLabel(range)}`}
    >
      <FilterBar
        right={
          <SelectFilter
            label="Sort"
            value={sort}
            onChange={(v) => setSort((v || "activity") as SortKey)}
            allLabel="Most AI usage"
            width="w-[170px]"
            options={SORTS.filter((s) => s.value !== "activity").map((s) => ({
              value: s.value,
              label: s.label,
            }))}
          />
        }
      >
        <SearchFilter
          value={search}
          onChange={setSearch}
          placeholder="Search name, email, team…"
        />
        <RangePicker value={range} onChange={setRange} />
        <SelectFilter
          label="Team"
          value={team}
          onChange={setTeam}
          allLabel="All teams"
          options={(meta.data?.teams ?? []).map((t) => ({ value: t, label: t }))}
        />
        <SelectFilter
          label="AI tool"
          value={provider}
          onChange={setProvider}
          allLabel="All AI tools"
          width="w-[170px]"
          options={(meta.data?.providers ?? []).map((p) => ({ value: p.id, label: p.label }))}
        />
        <SelectFilter
          label="Connector"
          value={connectorState}
          onChange={setConnectorState}
          allLabel="Any status"
          width="w-[140px]"
          options={CONNECTOR_STATES}
        />
      </FilterBar>

      <ActiveFilters chips={chips} onClear={clearAll} />

      {query.loading ? (
        <StatSkeleton />
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Directory summary">
          <StatTile
            label="Employees listed"
            value={rows.length}
            hint={`${summary.withActivity} with observed activity`}
            accent="brand"
          />
          <StatTile
            label="Combined AI active time"
            value={formatDuration(summary.activeMs, { compact: true })}
            hint="merged model + tool time"
            accent="teal"
          />
          <StatTile
            label="Sessions"
            value={formatNumber(summary.sessions)}
            hint="in the selected range"
            accent="slate"
          />
          <StatTile
            label="Coverage warnings"
            value={summary.warnings}
            hint="stale, paused, or offline connectors"
            accent={summary.warnings > 0 ? "amber" : "slate"}
          />
        </section>
      )}

      <div className="mt-5">
        <Card>
          <CardHeader
            title="Directory"
            subtitle="Click a row to open that employee's analytics"
            action={
              query.refreshing ? <span className="hint">Refreshing…</span> : null
            }
          />
          {query.error ? (
            <ErrorState
              title="Could not load the directory"
              detail={query.error}
              onRetry={query.reload}
            />
          ) : query.loading ? (
            <LoadingBlock rows={6} />
          ) : rows.length === 0 ? (
            <EmptyState
              variant={chips.length > 0 ? "no-results" : "no-activity"}
              action={
                chips.length > 0 ? (
                  <button type="button" className="btn-ghost" onClick={clearAll}>
                    Clear filters
                  </button>
                ) : null
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Connector</th>
                    <th>AI tools used</th>
                    <th className="text-right">AI active time</th>
                    <th className="text-right">Productive</th>
                    <th className="text-right">Sessions</th>
                    <th className="text-right">Avg session</th>
                    <th>Trend</th>
                    <th>Last active</th>
                    <th aria-label="Open" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const productivePct =
                      r.activeMs > 0 ? Math.round((r.productiveMs / r.activeMs) * 100) : 0;
                    return (
                      <tr
                        key={r.id}
                        className="row-link"
                        onClick={() => router.push(`/employees/${r.id}`)}
                      >
                        <td>
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-2xs font-semibold text-brand-700">
                              {initialsOf(r.displayName)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-ink-900">
                                {r.displayName}
                              </p>
                              <p className="hint truncate">
                                {r.title ?? "—"} · {r.team ?? "No team"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <ConnectorBadge state={r.connectorState} />
                        </td>
                        <td>
                          {r.tools.length === 0 ? (
                            <span className="hint">None observed</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {r.tools.slice(0, 3).map((t) => (
                                <ProviderBadge key={t.provider} provider={t.provider} size="sm" />
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="num whitespace-nowrap text-right font-medium text-ink-900">
                          {r.sessions === 0 ? (
                            <span className="hint font-sans font-normal">No activity</span>
                          ) : (
                            formatDuration(r.activeMs)
                          )}
                        </td>
                        <td className="whitespace-nowrap text-right">
                          {r.activeMs === 0 ? (
                            <span className="hint">—</span>
                          ) : (
                            <div className="inline-flex flex-col items-end gap-1">
                              <span className="num text-sm text-ink-700">{productivePct}%</span>
                              <span className="block h-1 w-14 overflow-hidden rounded-full bg-slate-100">
                                <span
                                  className="block h-full rounded-full bg-teal-500"
                                  style={{ width: `${productivePct}%` }}
                                />
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="num text-right text-ink-700">{r.sessions || "—"}</td>
                        <td className="num text-right text-ink-500">
                          {r.sessions ? formatDuration(r.avgSessionMs) : "—"}
                        </td>
                        <td>
                          <Sparkline points={r.trend.map((p) => p.activeMs)} />
                        </td>
                        <td className="whitespace-nowrap text-sm text-ink-500">
                          {formatRelative(r.lastActiveAt)}
                        </td>
                        <td className="text-right">
                          <Link
                            href={`/employees/${r.id}`}
                            className="text-xs font-medium text-brand-600 hover:text-brand-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Open
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <p className="mt-4 text-2xs leading-relaxed text-ink-400">
        Percentages describe observed agent activity only. Low AI usage is not evidence of low
        effort — planning, review, meetings, and manual coding are invisible to this system.
      </p>
    </AppShell>
  );
}
