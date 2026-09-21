"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Callout } from "@/components/ui/Callout";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/States";
import { ConnectorBadge, ProviderBadge } from "@/components/domain/Badges";
import { AddConnectorForm } from "@/components/domain/AddConnectorForm";
import { ThisComputerStatus } from "@/components/domain/ConnectThisComputer";
import { useApi } from "@/lib/use-api";
import { useAuth } from "@/lib/auth-context";
import { apiPost } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import { homePathForRole } from "@/lib/permissions";
import type { LiveStatus } from "@/lib/types";
import { useState } from "react";

export default function MyConnectorsPage() {
  const { token, user } = useAuth();
  const query = useApi<LiveStatus>("/v1/dashboard/live?limit=1", { pollMs: 15_000 });
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const developerId = user?.developerId;
  const mine = (query.data?.connectors ?? []).filter(
    (c) => !developerId || c.developerId === developerId,
  );

  async function toggle(deviceId: string, paused: boolean) {
    setBusy(deviceId);
    setNotice(null);
    try {
      await apiPost(`/v1/connectors/${deviceId}/${paused ? "resume" : "pause"}`, token);
      setNotice(paused ? "Collection resumed." : "Collection paused. A coverage gap was recorded.");
      query.reload();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not update the connector");
    } finally {
      setBusy(null);
    }
  }

  if (user && user.role !== "developer") {
    return (
      <AppShell title="My connectors">
        <Callout
          tone="info"
          title="Connector setup for developers"
          action={
            <Link href="/connectors" className="btn-ghost h-8 text-xs">
              Org connectors →
            </Link>
          }
        >
          Administrators manage organisation connector health. Developers add their own tools after
          they sign in.
        </Callout>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="My connectors"
      subtitle="Add the AI tools on this computer. Activity is attributed to you, not to a shared env file."
    >
      {notice ? (
        <div className="mb-5">
          <Callout tone="info" title={notice} />
        </div>
      ) : null}

      <div className="mb-5">
        <ThisComputerStatus />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader
            title="Add a connector"
            subtitle="Name it, pick the AI tool, and connect this computer"
          />
          <CardBody>
            {developerId ? (
              <AddConnectorForm
                developerId={developerId}
                displayName={user?.displayName}
                onAdded={() => query.reload()}
              />
            ) : (
              <p className="hint">This login is not a monitored developer account.</p>
            )}
            <p className="hint mt-4">
              To add a tool on another computer, sign in there and use this same screen. Each
              machine is paired separately.
            </p>
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader
            title="Your connectors"
            subtitle={mine.length ? `${mine.length} on record` : "None yet"}
            href={developerId ? `/employees/${developerId}` : homePathForRole("developer")}
            hrefLabel="My activity"
          />
          {query.error ? (
            <ErrorState title="Could not load connectors" detail={query.error} onRetry={query.reload} />
          ) : query.loading ? (
            <LoadingBlock rows={5} />
          ) : mine.length === 0 ? (
            <EmptyState
              variant="connector-offline"
              title="No connector yet"
              body="Use the form to add Cursor, Claude Code, or another tool on this computer. Signing in does not collect activity by itself."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>AI tool</th>
                    <th>State</th>
                    <th>Last heartbeat</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {mine.map((c) => (
                    <tr key={c.deviceId}>
                      <td className="text-sm font-medium text-ink-900">
                        {c.displayName}
                        <span className="hint block">{c.deviceId.slice(0, 8)}</span>
                      </td>
                      <td>
                        <ProviderBadge provider={c.provider} size="sm" />
                      </td>
                      <td>
                        <ConnectorBadge state={c.state} demo={c.isDemo} />
                      </td>
                      <td className="num text-sm text-ink-500">{formatRelative(c.lastHeartbeat)}</td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="btn-ghost h-8 text-xs"
                          disabled={busy === c.deviceId}
                          onClick={() => void toggle(c.deviceId, c.paused)}
                        >
                          {c.paused ? "Resume" : "Pause"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
