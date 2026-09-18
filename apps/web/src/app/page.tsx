"use client";

import { useEffect, useState } from "react";
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
import { API_BASE, createExport, fetchTeamDashboard, streamUrl } from "@/lib/api";
import type { TeamResponse, ActivityEventRow } from "@/lib/types";
import {
  eventsByHour,
  eventsByType,
  providerSplit,
} from "@/lib/analytics";

export default function HomePage() {
  const [data, setData] = useState<TeamResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    eventType: "",
    provider: "",
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
        });
        const team: TeamResponse = {
          connectors: Array.isArray(json.connectors) ? json.connectors : [],
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
        setData({ connectors: [], recentEvents: [] });
      } finally {
        setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [filters.eventType, filters.provider]);

  useEffect(() => {
    const es = new EventSource(streamUrl());
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as { at?: string };
        if (data.at) setLiveAt(data.at);
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
  }, []);

  const events = (data?.recentEvents ?? []) as ActivityEventRow[];
  const connectors = data?.connectors ?? [];
  const onlineCount = connectors.filter((c) => {
    const last = c.lastHeartbeat ?? c.last_heartbeat;
    if (!last) return false;
    return Date.now() - new Date(last).getTime() < 5 * 60 * 1000;
  }).length;

  return (
    <AppShell
      title="Team overview"
      subtitle="Near-live connector status and agent-visible activity"
    >
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-sm text-slate-600">
          Event type
          <input
            className="ml-2 rounded border border-slate-300 px-2 py-1 text-sm"
            value={filters.eventType}
            onChange={(e) =>
              setFilters((f) => ({ ...f, eventType: e.target.value }))
            }
            placeholder="e.g. heartbeat_sent"
          />
        </label>
        <label className="text-sm text-slate-600">
          Provider
          <input
            className="ml-2 rounded border border-slate-300 px-2 py-1 text-sm"
            value={filters.provider}
            onChange={(e) =>
              setFilters((f) => ({ ...f, provider: e.target.value }))
            }
            placeholder="claude_code"
          />
        </label>
        <button
          type="button"
          className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
          onClick={() =>
            void createExport("csv").then((r) => {
              if (r.downloadUrl) {
                window.open(`${API_BASE}${r.downloadUrl}`, "_blank");
              }
            })
          }
        >
          Export CSV
        </button>
        {liveAt ? (
          <span className="text-xs text-emerald-700">
            SSE live · {new Date(liveAt).toLocaleTimeString()}
          </span>
        ) : null}
      </div>

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
          <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Recent events"
              value={events.length}
              hint="Last ingested batch window"
              accent="indigo"
            />
            <StatCard
              label="Connectors online"
              value={`${onlineCount} / ${connectors.length || 0}`}
              hint="Heartbeat within 5 min"
              accent="emerald"
            />
            <StatCard
              label="Event types"
              value={eventsByType(events).length}
              hint="Distinct in sample"
              accent="slate"
            />
            <StatCard
              label="Data store"
              value={data?.dbAvailable === false ? "Offline" : "Ready"}
              hint={data?.dbAvailable === false ? "Docker required" : "Postgres"}
              accent={data?.dbAvailable === false ? "amber" : "emerald"}
            />
          </section>

          <section className="mb-8 grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <EventsTimelineChart data={eventsByHour(events)} />
            </div>
            <ProviderPieChart data={providerSplit(events)} />
          </section>

          <section className="mb-8 grid gap-4 lg:grid-cols-2">
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
