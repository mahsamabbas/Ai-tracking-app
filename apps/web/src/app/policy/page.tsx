"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import { fetchOrgPolicy } from "@/lib/client-api";

export default function PolicyPage() {
  const { token, user } = useAuth();
  const [policy, setPolicy] = useState<{
    timezone?: string;
    retentionEventsDays?: number;
    retentionSummariesDays?: number;
    staleHeartbeatMinutes?: number;
    monitoringNoticeStatus?: string;
  } | null>(null);

  useEffect(() => {
    if (!token) return;
    void fetchOrgPolicy(token).then(({ json }) => setPolicy(json));
  }, [token]);

  return (
    <AppShell
      title="Collection notice"
      subtitle="What is monitored — developer transparency (FR-004, SEC-007)"
    >
      <div className="prose prose-slate max-w-none space-y-6 text-sm text-slate-700">
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
          <strong>Draft.</strong> Legal and HR must approve before employee
          deployment (SEC-010). Status:{" "}
          {policy?.monitoringNoticeStatus ?? "draft"}.
        </p>

        <section className="card">
          <h3 className="text-base font-semibold text-slate-900">Purpose</h3>
          <p className="mt-2">
            Operational visibility into activity performed through connected AI
            coding agents. This is not timekeeping, payroll, or billing approval.
          </p>
        </section>

        <section className="card">
          <h3 className="text-base font-semibold text-slate-900">
            What we collect
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Session boundaries and model/tool timing (metadata only)</li>
            <li>Token totals when the provider exposes them</li>
            <li>Test, build, and lint outcomes from the connector</li>
            <li>File-change metadata (paths or categories, not file bodies)</li>
            <li>Connector health: version, heartbeat, pause state</li>
          </ul>
        </section>

        <section className="card">
          <h3 className="text-base font-semibold text-slate-900">
            What we do not collect by default
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Keystrokes, screenshots, or private messages</li>
            <li>Complete prompts, responses, source files, or shell commands</li>
            <li>Secrets (redacted locally before upload)</li>
          </ul>
        </section>

        <section className="card">
          <h3 className="text-base font-semibold text-slate-900">
            Pause and coverage gaps
          </h3>
          <p className="mt-2">
            You may pause collection from the IDE companion or My activity.
            Pauses appear as coverage gaps — the dashboard will not treat them
            as proof you were inactive.
          </p>
        </section>

        <section className="card">
          <h3 className="text-base font-semibold text-slate-900">
            Retention and access
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Detailed events: {policy?.retentionEventsDays ?? 90} days
            </li>
            <li>
              Hourly summaries and audit: {policy?.retentionSummariesDays ?? 365}{" "}
              days
            </li>
            <li>Reporting timezone: {policy?.timezone ?? "UTC"}</li>
            <li>
              Stale heartbeat: {policy?.staleHeartbeatMinutes ?? 5} minutes
            </li>
            <li>
              Managers see authorized team metadata. Developers see the same
              records collected about themselves. Auditors see access history
              and configuration, not timelines.
            </li>
          </ul>
        </section>

        {user?.role === "developer" ? (
          <Link
            href="/my-activity"
            className="inline-flex min-h-[44px] items-center text-indigo-600 hover:underline"
          >
            View my activity →
          </Link>
        ) : null}
      </div>
    </AppShell>
  );
}
