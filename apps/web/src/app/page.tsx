"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AlertBanner } from "@/components/AlertBanner";
import { StatCard } from "@/components/StatCard";
import {
  DonutChart,
  EngineeringChecksChart,
  EventTypesChart,
  EventsTimelineChart,
  HourlyInteractionChart,
  InteractionMixChart,
  ProviderPieChart,
} from "@/components/ActivityCharts";
import { EventsTable } from "@/components/EventsTable";
import { ConnectorCards } from "@/components/ConnectorCards";
import { CapabilityBanner } from "@/components/CapabilityBanner";
import { AlertsPanel } from "@/components/AlertsPanel";
import { TeamOverviewTable } from "@/components/TeamOverviewTable";
import { FilterBar, type DashboardFilters } from "@/components/FilterBar";
import { API_BASE, DEV_ID, streamUrl } from "@/lib/api";
import { createExport, fetchTeamDashboard } from "@/lib/client-api";
import type { TeamResponse, ActivityEventRow } from "@/lib/types";
import {
  assignedVsUnassigned,
  coverageVsActivity,
  engineeringOutcomes,
  eventsByHour,
  eventsByType,
  hourlyInteractionSeries,
  interactionBuckets,
  outcomesSplit,
  providerSplit,
  toolCategories,
} from "@/lib/analytics";
import { useAuth } from "@/lib/auth-context";

export default function HomePage() {
  const { token, user } = useAuth();
  const [data, setData] = useState<TeamResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<DashboardFilters>({
    eventType: "",
    provider: "",
    coverageOnly: false,
    connectorState: "",
  });
  const [liveAt, setLiveAt] = useState<string | null>(null);
  const [banner, setBanner] = useState<{
    variant: "error" | "warning" | "info";
    title: string;
    detail?: string;
  } | null>(null);

  const isDeveloper = user?.role === "developer";
  const canExport =
    user?.role === "manager" ||
    user?.role === "administrator" ||
    user?.role === "auditor";

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const { ok, status, json } = await fetchTeamDashboard(token, {
          eventType: filters.eventType || undefined,
          provider: filters.provider || undefined,
          developerId: isDeveloper
            ? user?.developerId ?? DEV_ID
            : undefined,
        });
        const team: TeamResponse = {
          connectors: Array.isArray(json.connectors) ? json.connectors : [],
          developers: Array.isArray(json.developers) ? json.developers : [],
          alerts: Array.isArray(json.alerts) ? json.alerts : [],
          recentEvents: Array.isArray(json.recentEvents)
            ? json.recentEvents
            : [],
          dbAvailable: json.dbAvailable,
          hint: json.hint,
        };
        setData(team);

        if (!ok) {
          setBanner({
            variant: "error",
            title: status === 401 ? "Session expired" : "Request failed",
            detail: json.message as string | undefined,
          });
        } else if (json.dbAvailable === false) {
          setBanner({
            variant: "warning",
            title: "Database not connected",
            detail:
              json.hint ??
              "Start Docker Desktop, then: docker compose up -d postgres redis",
          });
        } else {
          setBanner(null);
        }
      } catch {
        setBanner({
          variant: "error",
          title: "Cannot reach API",
          detail: `Is the API running at ${API_BASE}?`,
        });
        setData({
          connectors: [],
          developers: [],
          alerts: [],
          recentEvents: [],
        });
      } finally {
        setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [filters.eventType, filters.provider, token, isDeveloper, user?.developerId]);

  useEffect(() => {
    const es = new EventSource(streamUrl());
    es.onmessage = (ev) => {
      try {
        const parsed = JSON.parse(ev.data) as { at?: string };
        if (parsed.at) setLiveAt(parsed.at);
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
  }, []);

  const events = (data?.recentEvents ?? []) as ActivityEventRow[];
  const connectors = data?.connectors ?? [];
  const developers = useMemo(() => {
    let rows = data?.developers ?? [];
    if (filters.coverageOnly) {
      rows = rows.filter((d) => d.coverageWarning);
    }
    if (filters.connectorState) {
      rows = rows.filter((d) => d.connectorState === filters.connectorState);
    }
    return rows;
  }, [data?.developers, filters.coverageOnly, filters.connectorState]);

  const onlineCount = connectors.filter((c) => {
    const last = c.lastHeartbeat ?? c.last_heartbeat;
    if (!last) return false;
    return Date.now() - new Date(last).getTime() < 5 * 60 * 1000;
  }).length;

  const primaryProvider =
    connectors.find((c) => c.provider)?.provider ??
    events.find((e) => e.provider)?.provider;

  const mix = interactionBuckets(events);
  const agentVisible = mix
    .filter((m) => m.name !== "Connector")
    .reduce((s, m) => s + m.count, 0);

  const title = isDeveloper
    ? `${user?.displayName?.split(" ")[0] ?? "Your"} overview`
    : "Team overview";
  const subtitle = isDeveloper
    ? "What the agent performed in your connected tools — the same metadata managers see"
    : `Near-live connector status and agent-visible activity for ${user?.displayName ?? "your org"}`;

  return (
    <AppShell title={title} subtitle={subtitle}>
      <CapabilityBanner provider={primaryProvider} />

      {canExport ? (
        <FilterBar
          filters={filters}
          onChange={setFilters}
          liveAt={liveAt}
          onExportCsv={() =>
            void createExport(token, "csv").then((r) => {
              if (r.downloadUrl) window.open(`${API_BASE}${r.downloadUrl}`, "_blank");
            })
          }
          onExportPdf={() =>
            void createExport(token, "pdf").then((r) => {
              if (r.downloadUrl) window.open(`${API_BASE}${r.downloadUrl}`, "_blank");
            })
          }
        />
      ) : (
        <p className="mb-4 text-xs text-slate-500">
          {liveAt ? `Live · ${new Date(liveAt).toLocaleTimeString()}` : "Refreshing every 30s"}
        </p>
      )}

      {banner ? (
        <AlertBanner
          variant={banner.variant}
          title={banner.title}
          detail={banner.detail}
        />
      ) : null}

      {loading && !data ? (
        <p className="text-sm text-slate-500">Loading dashboard…</p>
      ) : (
        <>
          <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Agent-visible events"
              value={agentVisible}
              hint="Excludes connector heartbeats"
              accent="indigo"
            />
            <StatCard
              label="Connectors online"
              value={`${onlineCount} / ${connectors.length || 0}`}
              hint="Heartbeat within 5 min"
              accent="emerald"
            />
            <StatCard
              label="Coverage alerts"
              value={data?.alerts?.length ?? 0}
              hint="Gaps, pause, stale — not inactivity"
              accent="amber"
            />
            <StatCard
              label="Unassigned sessions"
              value={
                assignedVsUnassigned(events).find((d) => d.name === "Unassigned")
                  ?.value ?? 0
              }
              hint="No project / work item"
            />
          </section>

          {!isDeveloper ? (
            <section className="mb-6 grid gap-4 lg:grid-cols-2">
              <TeamOverviewTable rows={developers} />
              <AlertsPanel alerts={data?.alerts ?? []} />
            </section>
          ) : (
            <section className="mb-6">
              <AlertsPanel alerts={data?.alerts ?? []} />
            </section>
          )}

          <section className="mb-6 grid gap-4 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2">
              <HourlyInteractionChart data={hourlyInteractionSeries(events)} />
            </div>
            <div className="min-w-0">
              <InteractionMixChart data={mix} />
            </div>
          </section>

          <section className="mb-6 grid gap-4 lg:grid-cols-3">
            <EventsTimelineChart data={eventsByHour(events)} />
            <DonutChart
              title="Task context"
              subtitle="Assigned vs unassigned (FR-011)"
              data={assignedVsUnassigned(events)}
            />
            <DonutChart
              title="Outcomes"
              subtitle="Succeeded / started / failed"
              data={outcomesSplit(events)}
            />
          </section>

          <section className="mb-6 grid gap-4 lg:grid-cols-2">
            <EventTypesChart data={eventsByType(events)} />
            <EngineeringChecksChart data={engineeringOutcomes(events)} />
          </section>

          <section className="mb-6 grid gap-4 lg:grid-cols-3">
            <DonutChart
              title="Tool categories"
              subtitle="file_read, shell, test, build… when present"
              data={toolCategories(events).map((d) => ({
                name: d.name,
                value: d.count,
              }))}
            />
            <DonutChart
              title="Coverage vs activity"
              subtitle="Missing telemetry is not zero work"
              data={coverageVsActivity(events)}
            />
            <ProviderPieChart data={providerSplit(events)} />
          </section>

          <section className="mb-6">
            {!isDeveloper ? (
              <div>
                <h3 className="mb-3 font-serif text-lg text-slate-900">
                  Connectors
                </h3>
                <ConnectorCards connectors={connectors} />
              </div>
            ) : (
              <div className="card">
                <h3 className="font-serif text-lg text-slate-900">
                  Your collection
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Pause from the IDE companion. Pauses show as coverage gaps,
                  never as proof you were inactive.
                </p>
              </div>
            )}
          </section>

          <section>
            <EventsTable events={events} />
          </section>
        </>
      )}
    </AppShell>
  );
}
