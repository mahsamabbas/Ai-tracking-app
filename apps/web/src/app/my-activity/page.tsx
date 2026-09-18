"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { EventsTable } from "@/components/EventsTable";
import { API_BASE, DEV_ID, fetchTeamDashboard } from "@/lib/api";
import type { ActivityEventRow } from "@/lib/types";

export default function MyActivityPage() {
  const [events, setEvents] = useState<ActivityEventRow[]>([]);

  useEffect(() => {
    void fetchTeamDashboard({ developerId: DEV_ID, role: "developer" }).then(
      ({ json }) => {
        setEvents(json.recentEvents ?? []);
      },
    );
  }, []);

  return (
    <AppShell
      title="My activity"
      subtitle="Your own agent-visible signals (developer view)"
    >
      <p className="mb-4 text-sm text-slate-600">
        Policy and monitoring notice apply. This view shows metadata only — not
        prompts or source code.
      </p>
      <p className="mb-4 text-xs text-slate-500">
        API: {API_BASE} · developer {DEV_ID.slice(0, 8)}…
      </p>
      <EventsTable events={events} />
    </AppShell>
  );
}
