"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { TeamStatus } from "@/components/TeamStatus";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type TeamPayload = {
  connectors: unknown[];
  recentEvents: unknown[];
};

function normalizeTeamPayload(raw: unknown): TeamPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return {
    connectors: Array.isArray(o.connectors) ? o.connectors : [],
    recentEvents: Array.isArray(o.recentEvents) ? o.recentEvents : [],
  };
}

export default function HomePage() {
  const [data, setData] = useState<TeamPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | undefined>();

  useEffect(() => {
    const load = () => {
      fetch(`${API}/v1/dashboard/team`, { headers: { "x-role": "manager" } })
        .then(async (r) => {
          const json = await r.json();
          if (!r.ok) {
            setErrorDetail(
              typeof json?.message === "string" ? json.message : undefined,
            );
            setError(r.status >= 500 ? "api_unavailable" : "connector_offline");
            return;
          }
          const normalized = normalizeTeamPayload(json);
          if (!normalized) {
            setError("events_delayed");
            setErrorDetail(undefined);
            return;
          }
          if (
            json &&
            typeof json === "object" &&
            (json as { dbAvailable?: boolean }).dbAvailable === false
          ) {
            setError("api_unavailable");
            setErrorDetail(
              (json as { hint?: string }).hint ??
                "Database is not reachable.",
            );
            setData(normalized);
            return;
          }
          setError(null);
          setErrorDetail(undefined);
          setData(normalized);
        })
        .catch(() => {
          setError("api_unavailable");
          setErrorDetail(
            "Cannot reach the API at " +
              API +
              ". Run pnpm dev in the project folder.",
          );
        });
    };
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  if (error) {
    return <EmptyState kind={error} detail={errorDetail} />;
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
