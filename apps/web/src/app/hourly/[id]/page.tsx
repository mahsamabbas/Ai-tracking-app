"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { EventsTable } from "@/components/EventsTable";
import { fetchHourlySnapshot } from "@/lib/api";
import type { ActivityEventRow } from "@/lib/types";
import { formatDuration } from "@/lib/analytics";

const METRIC_ROWS: { key: string; label: string }[] = [
  { key: "modelDurationMs", label: "Model duration" },
  { key: "toolDurationMs", label: "Tool duration" },
  { key: "mergedActiveDurationMs", label: "Merged active" },
  { key: "interactiveSpanMs", label: "Interactive span" },
  { key: "elapsedSessionSpanMs", label: "Elapsed session span" },
  { key: "tokenInput", label: "Token input" },
  { key: "tokenOutput", label: "Token output" },
  { key: "testsCompleted", label: "Tests completed" },
  { key: "buildsCompleted", label: "Builds completed" },
  { key: "fileChanges", label: "File changes" },
  { key: "eventCount", label: "Event count" },
];

function formatMetric(key: string, value: unknown): string {
  if (value === undefined || value === null) return "Not available from provider";
  if (key.endsWith("Ms")) return formatDuration(value as number);
  if (typeof value === "number" && value === 0 && key.includes("Duration")) {
    return "Not available from provider";
  }
  return String(value);
}

export default function HourlyDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<{
    snapshot?: {
      hourStart: string;
      version: number;
      metrics: Record<string, unknown>;
      recalcReason?: string | null;
      completeness?: string;
    };
    sourceEvents?: ActivityEventRow[];
    versions?: { id: string; version: number; recalcReason: string | null }[];
  } | null>(null);

  useEffect(() => {
    void fetchHourlySnapshot(id).then(setData);
  }, [id]);

  const metrics = data?.snapshot?.metrics ?? {};
  const versions = data?.versions ?? [];

  return (
    <AppShell
      title="Hourly detail"
      subtitle="Drill-down: metrics, versions, source events (FR-025)"
    >
      <p className="mb-4 text-sm text-slate-600">
        <Link href="/developer-day" className="text-indigo-600 hover:underline">
          ← Back to developer day
        </Link>
      </p>

      {!data?.snapshot ? (
        <p className="text-sm text-slate-500">Loading or snapshot not found…</p>
      ) : (
        <>
          <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">
              Hour:{" "}
              <span className="font-medium text-slate-900">
                {new Date(data.snapshot.hourStart).toLocaleString()}
              </span>
              {" · "}
              Version {data.snapshot.version}
              {data.snapshot.recalcReason
                ? ` (${data.snapshot.recalcReason})`
                : null}
            </p>
            {data.snapshot.completeness ? (
              <p className="mt-1 text-xs text-slate-500">
                Completeness: {data.snapshot.completeness}
              </p>
            ) : null}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {METRIC_ROWS.map(({ key, label }) => (
                <div key={key} className="rounded-md bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatMetric(key, metrics[key])}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {versions.length > 1 ? (
            <section className="mb-6">
              <h3 className="mb-2 text-sm font-semibold text-slate-800">
                Snapshot versions (late recalc)
              </h3>
              <ul className="text-sm text-slate-600">
                {versions.map((v) => (
                  <li key={v.id}>
                    <Link
                      href={`/hourly/${v.id}`}
                      className="text-indigo-600 hover:underline"
                    >
                      v{v.version}
                    </Link>
                    {v.recalcReason ? ` — ${v.recalcReason}` : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <EventsTable events={data.sourceEvents ?? []} />
          </section>
        </>
      )}
    </AppShell>
  );
}
