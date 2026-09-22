"use client";

import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import {
  CONNECTOR_MAC_ARM,
  CONNECTOR_MAC_INTEL,
  CONNECTOR_WINDOWS_EXE,
  detectConnectorPlatform,
  detectMacChip,
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
  const macChip = detectMacChip();
  const macHref = macChip === "intel" ? CONNECTOR_MAC_INTEL : CONNECTOR_MAC_ARM;
  const macLabel = macChip === "intel" ? "Download for Intel Mac" : "Download for Mac";
  const otherMacHref = macChip === "intel" ? CONNECTOR_MAC_ARM : CONNECTOR_MAC_INTEL;
  const otherMacLabel = macChip === "intel" ? "Apple silicon" : "Intel Mac";
  const step1Done = phase === "unpaired" || phase === "ready";
  const step3Done = phase === "ready";

  const steps = (
    <ol className="space-y-4">
      <li className="flex gap-3" data-onboarding="onboard-install">
        <StepBadge done={step1Done} n={1} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-900">Install the local agent on this computer</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-700">
            The connector has to run on this computer so Cursor or VS Code can send activity. You
            can start it with one command from the project, or download a program if you prefer.
          </p>
          <div className="mt-3 rounded-lg border border-line bg-slate-50 p-3 dark:bg-white/5">
            <p className="text-xs font-semibold text-ink-900">Start from the project (simplest)</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-700">
              In a terminal, from the Techlio folder, run this and leave the window open:
            </p>
            <pre className="code-snippet mt-2">pnpm dev:connector</pre>
            <p className="mt-2 text-xs leading-relaxed text-ink-700">
              Then come back here and click Check if running.
            </p>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <a
              href={platform === "windows" ? CONNECTOR_WINDOWS_EXE : macHref}
              download
              className="btn-ghost inline-flex h-9 items-center whitespace-nowrap px-3 text-xs"
            >
              {platform === "windows" ? "Download for Windows" : macLabel}
            </a>
            {platform === "mac" ? (
              <a href={otherMacHref} download className="btn-ghost h-9 whitespace-nowrap text-xs">
                {otherMacLabel}
              </a>
            ) : null}
            <button type="button" className="btn-ghost h-9 whitespace-nowrap text-xs" onClick={() => void refresh()}>
              Check if running
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink-700">
            {platform === "windows"
              ? "If you use the Windows program, keep the black window open. If Windows warns you, choose More info, then Run anyway."
              : "If you download a Mac program, do not open it in Terminal. Double-click it in Finder. If macOS blocks it, right-click the file and choose Open."}
          </p>
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
