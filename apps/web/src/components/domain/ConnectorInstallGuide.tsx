"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import {
  CONNECTOR_INSTALL_SCRIPT_PATH,
  CONNECTOR_INSTALL_SCRIPT_WINDOWS,
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
          : "border border-line bg-slate-100 text-ink-700 dark:bg-slate-800 dark:text-ink-700"
      }`}
      aria-hidden
    >
      {done ? "✓" : n}
    </span>
  );
}

export function ConnectorInstallGuide() {
  const { online, refresh } = useConnectorOnline(5_000);
  const { phase } = useConnectorSetupPhase(4_000);
  const platform = detectConnectorPlatform();
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const installCmd = useMemo(
    () => connectorInstallCommand(origin, platform === "windows" ? "windows" : "mac"),
    [origin, platform],
  );

  async function copyCommand() {
    await navigator.clipboard.writeText(installCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const step1Done = phase === "unpaired" || phase === "ready";
  const step3Done = phase === "ready";

  const steps = (
    <ol className="space-y-4">
      <li className="flex gap-3" data-onboarding="onboard-install">
        <StepBadge done={step1Done} n={1} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-900">Install the local agent on this computer</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-700">
            The dashboard runs in the cloud, but AI tools (Cursor, Claude) only talk to a small
            program on <strong className="font-semibold text-ink-900">your</strong> Mac or PC. Each
            teammate installs once on their own machine — your install does not track anyone else.
          </p>
          {platform === "mac" || platform === "windows" ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <a
                href={
                  platform === "windows"
                    ? CONNECTOR_INSTALL_SCRIPT_WINDOWS
                    : CONNECTOR_INSTALL_SCRIPT_PATH
                }
                download={
                  platform === "windows"
                    ? "install-connector-windows.ps1"
                    : "install-connector-macos.sh"
                }
                className="btn-primary h-9 whitespace-nowrap text-xs"
              >
                {platform === "windows" ? "Download Windows installer" : "Download macOS installer"}
              </a>
              <button
                type="button"
                className="btn-ghost h-9 whitespace-nowrap text-xs"
                onClick={() => void copyCommand()}
              >
                {copied ? "Copied" : "Copy command"}
              </button>
              <button
                type="button"
                className="btn-ghost h-9 whitespace-nowrap text-xs"
                onClick={() => void refresh()}
              >
                Check if running
              </button>
            </div>
          ) : (
            <p className="mt-2 text-xs leading-relaxed text-ink-700">
              Use the Windows or macOS installer on this computer.
            </p>
          )}
          {platform === "mac" || platform === "windows" ? (
            <p className="mt-2 text-xs leading-relaxed text-ink-700">
              You only need{" "}
              <a
                href="https://nodejs.org"
                className="font-medium text-brand-700 underline dark:text-brand-300"
                target="_blank"
                rel="noreferrer"
              >
                Node.js 20 or newer
              </a>
              . No Visual Studio, no project clone. The script installs the agent under your home
              folder and starts it at sign-in.
            </p>
          ) : null}
          {online === false ? (
            <p className="mt-2 text-xs font-medium text-amber-800 dark:text-amber-200">
              Not detected yet on 127.0.0.1:9477 — complete the install, then click “Check if running”.
            </p>
          ) : null}
          {online === true ? (
            <p className="mt-2 text-xs font-medium text-emerald-800 dark:text-emerald-300">
              Local agent is running.
            </p>
          ) : null}
          <div>
            <p className="mt-3 text-2xs font-semibold uppercase tracking-wide text-ink-500">
              Install command
            </p>
            <pre className="code-snippet">{installCmd}</pre>
          </div>
        </div>
      </li>

      <li className="flex gap-3" data-onboarding="onboard-key">
        <StepBadge done={false} n={2} />
        <div>
          <p className="text-sm font-semibold text-ink-900">Get your connector key from your administrator</p>
          <p className="mt-1 text-xs text-ink-700">
            They create a <strong className="text-ink-900">device ID</strong> and{" "}
            <strong className="text-ink-900">token</strong> for you on Access / Connectors. You cannot
            make your own key.
          </p>
        </div>
      </li>

      <li className="flex gap-3">
        <StepBadge done={step3Done} n={3} />
        <div>
          <p className="text-sm font-semibold text-ink-900">Activate on this computer</p>
          <p className="mt-1 text-xs text-ink-700">
            Open{" "}
            <Link
              href="/my-connectors"
              className="font-medium text-brand-700 underline dark:text-brand-400"
            >
              My connectors
            </Link>
            , paste your key, accept consent, and activate. Activity then uploads to your organisation’s
            dashboard.
          </p>
          {step1Done && !step3Done ? (
            <Link href="/my-connectors" className="btn-primary mt-3 inline-flex h-9 text-xs">
              Go to My connectors — required
            </Link>
          ) : null}
          {step3Done ? (
            <p className="mt-2 text-xs font-medium text-emerald-800 dark:text-emerald-300">
              Setup complete — the dashboard will open automatically.
            </p>
          ) : null}
        </div>
      </li>
    </ol>
  );

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
