"use client";

import { useConnectorSetupPhase } from "@/lib/connector-local";

const LABELS = ["Install agent", "Admin key", "Activate key"];

export function OnboardingStepper() {
  const { phase } = useConnectorSetupPhase(4_000);

  const current =
    phase === "ready" ? 4 : phase === "unpaired" ? 3 : phase === "offline" ? 1 : 1;

  return (
    <nav
      className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Onboarding progress"
    >
      <ol className="flex flex-1 flex-wrap items-center gap-1 sm:gap-0">
        {LABELS.map((label, i) => {
          const n = i + 1;
          const done = current > n;
          const active = current === n;
          return (
            <li key={label} className="flex items-center">
              <div
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
                  active
                    ? "bg-brand-600 text-white shadow-sm"
                    : done
                      ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                      : "bg-slate-100 text-ink-500 dark:bg-slate-800 dark:text-ink-400"
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-2xs font-bold ${
                    active ? "bg-white/20" : done ? "bg-emerald-600 text-white" : "bg-slate-200 dark:bg-slate-700"
                  }`}
                >
                  {done ? "✓" : n}
                </span>
                {label}
              </div>
              {i < LABELS.length - 1 ? (
                <span
                  className="mx-1 hidden text-ink-400 sm:mx-2 sm:inline"
                  aria-hidden
                >
                  →
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        className="btn-ghost h-8 shrink-0 text-xs text-brand-700 dark:text-brand-400"
        onClick={() => window.dispatchEvent(new CustomEvent("techlio:start-tour"))}
      >
        Show guided tour
      </button>
    </nav>
  );
}
