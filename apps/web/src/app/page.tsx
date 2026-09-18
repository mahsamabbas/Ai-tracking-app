"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AlertBanner } from "@/components/AlertBanner";
import { StatCard } from "@/components/StatCard";
import {
  EventTypesChart,
  EventsTimelineChart,
  ProviderPieChart,
} from "@/components/ActivityCharts";
import { EventsTable } from "@/components/EventsTable";
import { ConnectorCards } from "@/components/ConnectorCards";
import { CapabilityBanner } from "@/components/CapabilityBanner";
import { AlertsPanel } from "@/components/AlertsPanel";
import { TeamOverviewTable } from "@/components/TeamOverviewTable";
import { FilterBar, type DashboardFilters } from "@/components/FilterBar";
import { API_BASE, createExport, fetchTeamDashboard, streamUrl } from "@/lib/api";
import type { TeamResponse, ActivityEventRow } from "@/lib/types";
import {
  eventsByHour,
  eventsByType,
  providerSplit,
} from "@/lib/analytics";
import { useRole } from "@/lib/role-context";

export default function HomePage() {
  const { role } = useRole();
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

  useEffect(() => {
    const load = async () => {
      try {
        const { ok, status, json } = await fetchTeamDashboard({
          eventType: filters.eventType || undefined,
          provider: filters.provider || undefined,
          role,
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
            title: status >= 500 ? "Backend unavailable" : "Request failed",
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
          detail: `Is the API running at ${API_BASE}? Run pnpm dev.`,
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
  }, [filters.eventType, filters.provider, role]);

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

  return (
    <AppShell
      title="Team overview"
      subtitle="Near-live connector status and agent-visible activity"
    >
      <CapabilityBanner provider={primaryProvider} />

      <FilterBar
        filters={filters}
        onChange={setFilters}
        liveAt={liveAt}
        onExportCsv={() =>
          void createExport("csv").then((r) => {
            if (r.downloadUrl) {
              window.open(`${API_BASE}${r.downloadUrl}`, "_blank");
            }
          })
        }
        onExportPdf={() =>
          void createExport("pdf").then((r) => {
            if (r.downloadUrl) {
              window.open(`${API_BASE}${r.downloadUrl}`, "_blank");
            }
          })
        }
      />

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
              label="Recent events"
              value={events.length}
              hint="Filtered sample"
              accent="indigo"
            />
            <StatCard
              label="Connectors online"
              value={`${onlineCount} / ${connectors.length || 0}`}
              hint="Heartbeat within 5 min"
              accent="emerald"
            />
            <StatCard
              label="Alerts"
              value={data?.alerts?.length ?? 0}
              hint="Connector & coverage"
              accent="amber"
            />
            <StatCard
              label="Data store"
              value={data?.dbAvailable === false ? "Offline" : "Ready"}
              hint={data?.dbAvailable === false ? "Docker required" : "Postgres"}
              accent={data?.dbAvailable === false ? "amber" : "emerald"}
            />
          </section>

          <section className="mb-6 grid gap-4 lg:grid-cols-2">
            <TeamOverviewTable rows={developers} />
            <AlertsPanel alerts={data?.alerts ?? []} />
          </section>

          <section className="mb-6 grid gap-4 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2">
              <EventsTimelineChart data={eventsByHour(events)} />
            </div>
            <div className="min-w-0">
              <ProviderPieChart data={providerSplit(events)} />
            </div>
          </section>

          <section className="mb-6 grid gap-4 lg:grid-cols-2">
            <EventTypesChart data={eventsByType(events)} />
            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">
                Connectors
              </h3>
              <ConnectorCards connectors={connectors} />
            </div>
          </section>

          <section>
            <EventsTable events={events} />
          </section>
        </>
      )}
    </AppShell>
  );
}
