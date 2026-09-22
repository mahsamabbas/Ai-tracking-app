"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { formatNumber } from "@/lib/format";
import { providerMeta } from "@/lib/providers";
import type { EmployeeAiSubscription } from "@/lib/types";

function formatTokens(n: number | null | undefined): string {
  if (n == null) return "—";
  return formatNumber(n);
}

export function EmployeeAiPlanUsage({
  rows,
  isSelf,
}: {
  rows: EmployeeAiSubscription[];
  isSelf?: boolean;
}) {
  return (
    <Card>
      <CardHeader
        title="AI subscription usage"
        subtitle={
          isSelf
            ? "Calendar-month token totals from your connector vs organisation plan limits. Compare with your Cursor and Claude billing if telemetry is incomplete."
            : "Calendar-month token totals from the connector vs organisation plan limits for Cursor and Claude Code."
        }
      />
      <CardBody className="grid gap-4 sm:grid-cols-2">
        {rows.map((row) => {
          const meta = providerMeta(row.provider);
          const usedPct =
            row.monthlyLimit && row.tokensUsed != null && row.monthlyLimit > 0
              ? Math.min(100, Math.round((row.tokensUsed / row.monthlyLimit) * 100))
              : null;
          const missingTokens = row.tokensUsed == null && !row.tokensFromTelemetry;

          return (
            <div
              key={row.provider}
              className="rounded-lg border border-line bg-slate-50/50 p-4 dark:bg-white/[0.03]"
            >
              <div className="flex items-center gap-2">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold"
                  style={{ background: meta.soft, color: meta.ink }}
                >
                  {meta.label.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink-900">{row.label}</p>
                  <p className="hint">{row.periodLabel}</p>
                </div>
              </div>

              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Tokens used (in + out)</dt>
                  <dd className="num font-medium text-ink-900">
                    {missingTokens ? (
                      <span className="hint font-sans font-normal">Not reported by connector</span>
                    ) : (
                      formatTokens(row.tokensUsed)
                    )}
                  </dd>
                </div>
                {row.tokenInput != null ? (
                  <div className="flex justify-between gap-3 text-xs">
                    <dt className="text-ink-400">Input / output</dt>
                    <dd className="num text-ink-600">
                      {formatTokens(row.tokenInput)} / {formatTokens(row.tokenOutput)}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Plan limit</dt>
                  <dd className="num font-medium text-ink-900">
                    {row.monthlyLimit != null
                      ? `${formatTokens(row.monthlyLimit)} / month`
                      : "Not configured"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Remaining</dt>
                  <dd className="num font-medium text-ink-900">
                    {row.remaining != null
                      ? formatTokens(row.remaining)
                      : row.monthlyLimit != null && missingTokens
                        ? "—"
                        : row.monthlyLimit == null
                          ? "—"
                          : formatTokens(row.monthlyLimit)}
                  </dd>
                </div>
              </dl>

              {usedPct != null ? (
                <div className="mt-3">
                  <div className="flex justify-between text-2xs text-ink-500">
                    <span>Of monthly budget</span>
                    <span className="num">{usedPct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${Math.max(usedPct > 0 ? 2 : 0, usedPct)}%` }}
                    />
                  </div>
                </div>
              ) : null}

              {row.provider === "cursor" && missingTokens ? (
                <p className="hint mt-3 text-xs leading-relaxed">
                  Cursor hooks do not expose token totals. Check the Cursor account usage page for
                  subscription consumption.
                </p>
              ) : null}
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}
