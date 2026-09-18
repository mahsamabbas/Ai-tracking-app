"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AlertBanner } from "@/components/AlertBanner";
import { StatCard } from "@/components/StatCard";
import { API_BASE, DEV_ID } from "@/lib/api";
import { fetchTimeline } from "@/lib/client-api";
import type { HourlySnapshot } from "@/lib/types";
import { CapabilityBanner } from "@/components/CapabilityBanner";
import { formatDuration } from "@/lib/analytics";
import { useAuth } from "@/lib/auth-context";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function DeveloperDayPage() {
  const { token, user } = useAuth();
  const developerId = user?.developerId ?? DEV_ID;
  const [cards, setCards] = useState<HourlySnapshot[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchTimeline(token, developerId)
      .then((j) => setCards(j.hourlyCards ?? []))
      .catch(() => setError("Could not load timeline — check API and database."));
  }, [token, developerId]);

  const chartData = cards.map((c) => {
    const m = c.metrics ?? {};
    const hour =
      c.hourStart ?? c.hour_start
        ? new Date((c.hourStart ?? c.hour_start) as string).toLocaleTimeString(
            [],
            { hour: "2-digit", minute: "2-digit" },
          )
        : "—";
    return {
      hour,
      model: Math.round((m.modelDurationMs ?? 0) / 1000),
      tools: Math.round((m.toolDurationMs ?? 0) / 1000),
      merged: Math.round((m.mergedActiveDurationMs ?? 0) / 1000),
    };
  });

  return (
    <AppShell
      title="Developer day"
      subtitle="One card per clock hour — five durations stay separate (PRD §11)"
    >
      {error ? (
        <AlertBanner variant="warning" title={error} />
      ) : cards.length === 0 ? (
        <>
          <CapabilityBanner provider="cursor" />
          <AlertBanner
            variant="info"
            title="No hourly summaries yet"
            detail="The worker finalizes each hour at :05 UTC. Cursor is Tier B — model/tool duration may stay 'not available from provider'."
          />
        </>
      ) : null}

      {cards.length > 0 && (
        <>
          <section className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatCard label="Hours captured" value={cards.length} accent="teal" />
            <StatCard
              label="Latest version"
              value={cards[cards.length - 1]?.version ?? 1}
              hint="Late events create a new version"
            />
            <StatCard
              label="Completeness"
              value={cards[cards.length - 1]?.completeness ?? "—"}
              accent="emerald"
            />
          </section>

          <div className="card mb-8 h-[280px] min-w-0">
            <h3 className="text-sm font-semibold">Durations by hour (seconds)</h3>
            <p className="text-xs text-slate-500">
              Model, tool, and merged active — never shown as one metric
            </p>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="model" fill="#818cf8" name="Model" />
                <Bar dataKey="tools" fill="#34d399" name="Tools" />
                <Bar dataKey="merged" fill="#fbbf24" name="Merged active" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <div className="space-y-4">
        {cards.map((c, i) => {
          const m = c.metrics ?? {};
          const hourLabel = c.hourStart ?? c.hour_start;
          return (
            <article key={c.id ?? i} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-ink-900">
                  {hourLabel
                    ? new Date(hourLabel as string).toLocaleString()
                    : `Hour ${i + 1}`}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="badge-muted">v{c.version ?? 1}</span>
                  {c.id ? (
                    <Link
                      href={`/hourly/${c.id}`}
                      className="text-xs font-medium text-indigo-600 hover:underline"
                    >
                      Drill down
                    </Link>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  ["Model duration", m.modelDurationMs],
                  ["Tool duration", m.toolDurationMs],
                  ["Merged active", m.mergedActiveDurationMs],
                  ["Interactive span", m.interactiveSpanMs],
                  ["Elapsed span", m.elapsedSessionSpanMs],
                ].map(([label, ms]) => (
                  <div
                    key={label as string}
                    className="rounded-lg bg-slate-50 px-3 py-2"
                  >
                    <p className="text-xs text-slate-500">{label as string}</p>
                    <p className="font-mono text-sm font-medium">
                      {formatDuration(ms as number)}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
      <p className="mt-4 hidden text-xs text-slate-400">{API_BASE}</p>
    </AppShell>
  );
}
