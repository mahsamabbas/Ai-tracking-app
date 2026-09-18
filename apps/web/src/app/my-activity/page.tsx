"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { EventsTable } from "@/components/EventsTable";
import {
  DonutChart,
  HourlyInteractionChart,
  InteractionMixChart,
} from "@/components/ActivityCharts";
import { DEV_ID } from "@/lib/api";
import { fetchTeamDashboard } from "@/lib/client-api";
import type { ActivityEventRow } from "@/lib/types";
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

  useEffect(() => {
    if (!token) return;
    void fetchTeamDashboard(token, {
      developerId: user?.developerId ?? DEV_ID,
    }).then(({ json }) => {
      setEvents(json.recentEvents ?? []);
    });
  }, [token, user?.developerId]);

  const first = user?.displayName?.split(" ")[0] ?? "you";

  return (
    <AppShell
      title={`${first}'s activity`}
      subtitle="The same metadata collected about you — not prompts or source"
    >
      <p className="mb-6 text-sm text-slate-600">
        Pause collection from the IDE companion whenever you need a coverage
        gap rather than silent missing data.
      </p>
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
