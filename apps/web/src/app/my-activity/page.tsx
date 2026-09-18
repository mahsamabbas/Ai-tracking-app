"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { EventsTable } from "@/components/EventsTable";
import { ConnectorCards } from "@/components/ConnectorCards";
import {
  DonutChart,
  HourlyInteractionChart,
  InteractionMixChart,
} from "@/components/ActivityCharts";
import { DEV_ID } from "@/lib/api";
import {
  fetchTeamDashboard,
  pauseConnector,
  resumeConnector,
} from "@/lib/client-api";
import type { ActivityEventRow, ConnectorRow } from "@/lib/types";
import {
  assignedVsUnassigned,
  hourlyInteractionSeries,
  interactionBuckets,
  outcomesSplit,
} from "@/lib/analytics";
import { useAuth } from "@/lib/auth-context";

export default function MyActivityPage() {
  const { token, user } = useAuth();
  const [events, setEvents] = useState<ActivityEventRow[]>([]);
  const [connectors, setConnectors] = useState<ConnectorRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    const { json } = await fetchTeamDashboard(token, {
      developerId: user?.developerId ?? DEV_ID,
    });
    setEvents(json.recentEvents ?? []);
    setConnectors(Array.isArray(json.connectors) ? json.connectors : []);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.developerId]);

  const deviceId =
    connectors[0]?.deviceId ?? connectors[0]?.device_id ?? null;
  const paused = (connectors[0]?.paused ?? 0) > 0;

  async function togglePause() {
    if (!token || !deviceId) return;
    const fn = paused ? resumeConnector : pauseConnector;
    const { ok } = await fn(token, deviceId);
    setMessage(
      ok
        ? paused
          ? "Collection resumed."
          : "Collection paused — a coverage gap was recorded."
        : "Could not update collection state.",
    );
    await load();
  }

  const first = user?.displayName?.split(" ")[0] ?? "you";

  return (
    <AppShell
      title={`${first}'s activity`}
      subtitle="The same metadata collected about you — not prompts or source"
    >
      <p className="mb-4 text-sm text-slate-600">
        Managers in your organization can review this same metadata. Other
        developers cannot.
      </p>

      <section className="mb-6 grid gap-4 lg:grid-cols-2">
        <div>
          <ConnectorCards connectors={connectors} />
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-ink-900">Collection</h3>
          <p className="mt-2 text-sm text-slate-600">
            Pause creates a visible coverage gap rather than silent missing
            data. This is not treated as inactivity.
          </p>
          <button
            type="button"
            className="btn-primary mt-4"
            onClick={() => void togglePause()}
            disabled={!deviceId}
          >
            {paused ? "Resume collection" : "Pause collection"}
          </button>
          {message ? (
            <p className="mt-3 text-sm text-slate-700">{message}</p>
          ) : null}
        </div>
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <HourlyInteractionChart data={hourlyInteractionSeries(events)} />
        </div>
        <div className="min-w-0">
          <InteractionMixChart data={interactionBuckets(events)} />
        </div>
      </section>
      <section className="mb-6 grid gap-4 lg:grid-cols-2">
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
      <EventsTable events={events} />
    </AppShell>
  );
}
