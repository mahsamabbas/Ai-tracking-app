"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState, ErrorState, LoadingBlock, StatSkeleton } from "@/components/ui/States";
import { Pagination } from "@/components/ui/Pagination";
import { SessionTable } from "@/components/domain/SessionTable";
import {
  ActiveFilters,
  FilterBar,
  SelectFilter,
} from "@/components/filters/FilterBar";
import { RangePicker, rangeLabel, rangeParams, type RangeValue } from "@/components/filters/RangePicker";
import { useApi } from "@/lib/use-api";
import { qs } from "@/lib/api";
import { formatDuration, formatNumber } from "@/lib/format";
import { providerLabel } from "@/lib/providers";
import { CLASSIFICATION } from "@/lib/vocab";
import type { EmployeeProfile, FilterMeta, SessionRow } from "@/lib/types";

const PAGE_SIZE = 25;

const CLASSIFICATION_OPTIONS = Object.entries(CLASSIFICATION).map(([value, v]) => ({
  value,
  label: v.label,
}));

function SessionsInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const [range, setRange] = useState<RangeValue>({ preset: "30d" });
  const [provider, setProvider] = useState(searchParams.get("provider") ?? "");
  const [classification, setClassification] = useState("");
  const [projectId, setProjectId] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [range, provider, classification, projectId]);

  const meta = useApi<FilterMeta>("/v1/meta/filters");
  const query = useApi<{
    employee: EmployeeProfile;
    sessions: SessionRow[];
    total: number;
    page: number;
    pageSize: number;
  }>(
    `/v1/employees/${id}/sessions${qs({
      ...rangeParams(range),
      provider: provider || undefined,
      classification: classification || undefined,
      projectId: projectId || undefined,
      page,
      pageSize: PAGE_SIZE,
    })}`,
  );

  const rows = query.data?.sessions ?? [];
  const projectNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of meta.data?.projects ?? []) map[p.id] = p.name;
    return map;
  }, [meta.data?.projects]);

  const pageTotals = useMemo(() => {
    const active = rows.reduce((s, r) => s + r.activeDurationMs, 0);
    const files = rows.reduce((s, r) => s + r.fileChanges, 0);
    const tests = rows.reduce((s, r) => s + r.testsRun, 0);
    return { active, files, tests };
  }, [rows]);

  const chips = [
    provider ? { label: `Tool: ${providerLabel(provider)}`, onRemove: () => setProvider("") } : null,
    classification
      ? {
          label: `Activity: ${CLASSIFICATION[classification as keyof typeof CLASSIFICATION]?.label ?? classification}`,
          onRemove: () => setClassification(""),
        }
      : null,
    projectId
      ? { label: `Project: ${projectNames[projectId] ?? projectId}`, onRemove: () => setProjectId("") }
      : null,
  ].filter(Boolean) as { label: string; onRemove: () => void }[];

  const clearAll = () => {
    setProvider("");
    setClassification("");
    setProjectId("");
  };

  return (
    <AppShell
      breadcrumbs={
        <Breadcrumbs
          items={[
            { label: "Employees", href: "/employees" },
            { label: query.data?.employee.displayName ?? "Employee", href: `/employees/${id}` },
            { label: "Sessions" },
          ]}
        />
      }
      title="Session history"
      subtitle={`${query.data?.employee.displayName ?? "Employee"} · ${rangeLabel(range)}`}
      actions={
        <Link href={`/employees/${id}`} className="btn-ghost">
          Back to analytics
        </Link>
      }
    >
      <FilterBar>
        <RangePicker value={range} onChange={setRange} />
        <SelectFilter
          label="AI tool"
          value={provider}
          onChange={setProvider}
          allLabel="All AI tools"
          width="w-[170px]"
          options={(meta.data?.providers ?? []).map((p) => ({ value: p.id, label: p.label }))}
        />
        <SelectFilter
          label="Activity type"
          value={classification}
          onChange={setClassification}
          allLabel="All activity"
          width="w-[180px]"
          options={CLASSIFICATION_OPTIONS}
        />
        <SelectFilter
          label="Project"
          value={projectId}
          onChange={setProjectId}
          allLabel="All projects"
          width="w-[190px]"
          options={(meta.data?.projects ?? []).map((p) => ({ value: p.id, label: p.name }))}
        />
      </FilterBar>

      <ActiveFilters chips={chips} onClear={clearAll} />

      {query.loading ? (
        <StatSkeleton count={3} />
      ) : (
        <section className="grid gap-3 sm:grid-cols-3" aria-label="Page summary">
          <StatTile
            label="Sessions matched"
            value={formatNumber(query.data?.total ?? 0)}
            hint={`showing ${rows.length} on this page`}
            accent="brand"
          />
          <StatTile
            label="Agent active (this page)"
            value={formatDuration(pageTotals.active, { compact: true })}
            hint="merged model + tool time"
            accent="teal"
          />
          <StatTile
            label="Output (this page)"
            value={formatNumber(pageTotals.files)}
            unit="file changes"
            hint={`${pageTotals.tests} tests run`}
            accent="slate"
          />
        </section>
      )}

      <div className="mt-5">
        <Card>
          <CardHeader
            title="Sessions"
            subtitle="Start and end time, duration, activity, project context, and outcome"
          />
          {query.error ? (
            <ErrorState title="Could not load sessions" detail={query.error} onRetry={query.reload} />
          ) : query.loading ? (
            <LoadingBlock rows={8} />
          ) : rows.length === 0 ? (
            <EmptyState
              variant={chips.length > 0 ? "no-results" : "no-activity"}
              action={
                chips.length > 0 ? (
                  <button type="button" className="btn-ghost" onClick={clearAll}>
                    Clear filters
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setRange({ preset: "90d" })}
                  >
                    Widen to 90 days
                  </button>
                )
              }
            />
          ) : (
            <>
              <SessionTable sessions={rows} projectNames={projectNames} />
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={query.data?.total ?? 0}
                onPage={setPage}
              />
            </>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

export default function EmployeeSessionsPage() {
  return (
    <Suspense
      fallback={
        <AppShell title="Session history">
          <LoadingBlock rows={8} />
        </AppShell>
      }
    >
      <SessionsInner />
    </Suspense>
  );
}
