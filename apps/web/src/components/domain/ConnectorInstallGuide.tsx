"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import {
  CONNECTOR_INSTALL_SCRIPT_PATH,
  connectorInstallCommand,
  detectConnectorPlatform,
  useConnectorOnline,
  useConnectorSetupPhase,
} from "@/lib/connector-local";

function StepBadge({ done, n }: { done: boolean; n: number }) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        done
          ? "bg-emerald-600 text-white"
          : "border border-ink-300 bg-surface-50 text-ink-600 dark:border-ink-600 dark:bg-ink-900"
      }`}
      aria-hidden
    >
      {done ? "✓" : n}
    </span>
  );
}

export function ConnectorInstallGuide({ compact = false }: { compact?: boolean }) {
  const { online, refresh } = useConnectorOnline(compact ? 12_000 : 5_000);
  const { phase } = useConnectorSetupPhase(4_000);
  const platform = detectConnectorPlatform();
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const installCmd = useMemo(() => connectorInstallCommand(origin), [origin]);

  async function copyCommand() {
    await navigator.clipboard.writeText(installCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const step1Done = phase === "unpaired" || phase === "ready";
  const step3Done = phase === "ready";

  if (compact && step3Done) return null;

  const steps = (
    <ol className="space-y-4">
      <li className="flex gap-3">
        <StepBadge done={step1Done} n={1} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-900 dark:text-ink-50">
            Install the local agent on this computer
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-600 dark:text-ink-400">
            The dashboard runs in the cloud, but AI tools (Cursor, Claude) only talk to a small
            program on <strong>your</strong> Mac or PC. Each teammate installs once on their own
            machine — your install does not track anyone else.
          </p>
          {platform === "mac" ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={CONNECTOR_INSTALL_SCRIPT_PATH} download className="btn-primary h-9 text-xs">
                Download macOS installer
              </a>
              <button type="button" className="btn-ghost h-9 text-xs" onClick={() => void copyCommand()}>
                {copied ? "Copied" : "Copy Terminal command"}
              </button>
              <button type="button" className="btn-ghost h-9 text-xs" onClick={() => void refresh()}>
                Check if running
              </button>
            </div>
          ) : platform === "windows" ? (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
              Windows installer is coming soon. For now, clone the repo and run{" "}
              <code className="font-mono">pnpm dev:connector</code> while you work.
            </p>
          ) : (
            <p className="mt-2 text-xs text-ink-500">
              Use macOS for the one-click installer, or run{" "}
              <code className="font-mono">pnpm dev:connector</code> from the project repo.
            </p>
          )}
          {online === false ? (
            <p className="mt-2 text-xs font-medium text-amber-800 dark:text-amber-200">
              Not detected yet on 127.0.0.1:9477 — complete the install, then click “Check if running”.
            </p>
          ) : null}
          {online === true ? (
            <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Local agent is running.
            </p>
          ) : null}
          {!compact ? (
            <pre className="mt-2 overflow-x-auto rounded-lg bg-ink-900 px-3 py-2 text-[11px] text-ink-100">
              {installCmd}
            </pre>
          ) : null}
        </div>
      </li>

      <li className="flex gap-3">
        <StepBadge done={false} n={2} />
        <div>
          <p className="text-sm font-semibold text-ink-900 dark:text-ink-50">
            Get your connector key from your administrator
          </p>
          <p className="mt-1 text-xs text-ink-600 dark:text-ink-400">
            They create a <strong>device ID</strong> and <strong>token</strong> for you on Access /
            Connectors. You cannot make your own key.
          </p>
        </div>
      </li>

      <li className="flex gap-3">
        <StepBadge done={step3Done} n={3} />
        <div>
          <p className="text-sm font-semibold text-ink-900 dark:text-ink-50">
            Activate on this computer
          </p>
          <p className="mt-1 text-xs text-ink-600 dark:text-ink-400">
            Open <Link href="/my-connectors" className="font-medium text-brand-600 underline">My connectors</Link>,
            paste your key, accept consent, and activate. Activity then uploads to your organisation’s
            dashboard.
          </p>
          {step1Done && !step3Done ? (
            <Link href="/my-connectors" className="btn-primary mt-3 inline-flex h-9 text-xs">
              Go to My connectors — required
            </Link>
          ) : null}
          {step3Done ? (
            <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Setup complete — the dashboard will open automatically.
            </p>
          ) : null}
        </div>
      </li>
    </ol>
  );

  if (compact) {
    return (
      <div className="text-sm">
        <p className="font-medium">Set up tracking on this computer</p>
        <p className="mt-1 text-xs opacity-90">
          One-time local install, then activate your admin-issued key.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link href="/setup-connector" className="btn-primary h-8 text-xs">
            Open setup guide
          </Link>
          {platform === "mac" ? (
            <a href={CONNECTOR_INSTALL_SCRIPT_PATH} download className="btn-ghost h-8 text-xs">
              Download installer
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Set up this computer"
        subtitle="Follow these steps once per machine. Sharing the dashboard link alone does not install the agent on someone else’s PC."
      />
      <CardBody>{steps}</CardBody>
    </Card>
  );
}
