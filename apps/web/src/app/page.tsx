"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { TeamStatus } from "@/components/TeamStatus";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type TeamPayload = {
  connectors: unknown[];
  recentEvents: unknown[];
};

export default function HomePage() {
  const [data, setData] = useState<TeamPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      fetch(`${API}/v1/dashboard/team`, { headers: { "x-role": "manager" } })
        .then((r) => r.json())
        .then(setData)
        .catch(() => setError("connector_offline"));
    };
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  if (error) {
    return <EmptyState kind="connector_offline" />;
  }

  if (!data) {
    return <EmptyState kind="events_delayed" />;
  }

  if (data.recentEvents.length === 0 && data.connectors.length === 0) {
    return <EmptyState kind="no_activity" />;
  }

  return (
    <main>
      <TeamStatus data={data} />
      <nav style={{ marginTop: 24 }}>
        <a href="/developer-day">Developer day</a>
        {" · "}
        <a href="/connectors">Connector health</a>
        {" · "}
        <a href="/audit">Audit history</a>
      </nav>
    </main>
  );
}
