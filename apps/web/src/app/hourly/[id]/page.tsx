"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { EventsTable } from "@/components/EventsTable";
import { fetchHourlySnapshot } from "@/lib/api";
import type { ActivityEventRow } from "@/lib/types";

export default function HourlyDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<{
    snapshot?: {
      hourStart: string;
      version: number;
      metrics: Record<string, unknown>;
      recalcReason?: string | null;
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
      subtitle="Metrics, versions, and linked source events"
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
          <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
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
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                "activeDurationMs",
                "modelActiveDurationMs",
                "toolActiveDurationMs",
                "sessionSpanMs",
                "idleExcludedMs",
                "tokenInput",
                "tokenOutput",
                "testsCompleted",
                "buildsCompleted",
                "fileChanges",
                "eventCount",
              ].map((key) =>
                metrics[key] !== undefined ? (
                  <div key={key} className="rounded-md bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">{key}</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {String(metrics[key])}
                    </p>
                  </div>
                ) : null,
              )}
            </div>
          </section>

          {versions.length > 1 ? (
            <section className="mb-6">
              <h3 className="mb-2 text-sm font-semibold text-slate-800">
                Snapshot versions
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
            <h3 className="mb-3 text-sm font-semibold text-slate-800">
              Source events
            </h3>
            <EventsTable events={data.sourceEvents ?? []} />
          </section>
        </>
      )}
    </AppShell>
  );
}
