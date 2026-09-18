import Link from "next/link";
import { formatDuration, formatNumber } from "@/lib/format";
import { providerMeta } from "@/lib/providers";
import type { ToolUsage } from "@/lib/types";

/** Entry point for the tool drill-down: employee → this AI tool. */
export function ToolCard({
  tool,
  href,
  shareOfMs,
}: {
  tool: ToolUsage;
  href: string;
  shareOfMs: number;
}) {
  const meta = providerMeta(tool.provider);
  const share = shareOfMs > 0 ? Math.round((tool.activeMs / shareOfMs) * 100) : 0;
  return (
    <Link
      href={href}
      className="card group flex flex-col gap-3 p-4 transition hover:border-brand-300 hover:shadow-pop"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold"
            style={{ background: meta.soft, color: meta.ink }}
          >
            {meta.label.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <p className="text-sm font-semibold text-ink-900">{meta.label}</p>
            <p className="hint">{tool.sessions} sessions</p>
          </div>
        </div>
        <span className="text-ink-300 transition group-hover:text-brand-500" aria-hidden>
          →
        </span>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <span className="num text-lg font-semibold text-ink-900">
            {formatDuration(tool.activeMs)}
          </span>
          <span className="num text-xs text-ink-500">{share}% of AI time</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.max(2, share)}%`, background: meta.color }}
          />
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2 border-t border-line pt-3 text-xs">
        <div>
          <dt className="hint">Model calls</dt>
          <dd className="num font-medium text-ink-900">{formatNumber(tool.modelRequests)}</dd>
        </div>
        <div>
          <dt className="hint">File changes</dt>
          <dd className="num font-medium text-ink-900">{formatNumber(tool.fileChanges)}</dd>
        </div>
        <div>
          <dt className="hint">Avg session</dt>
          <dd className="num font-medium text-ink-900">
            {formatDuration(tool.sessions ? tool.activeMs / tool.sessions : 0)}
          </dd>
        </div>
      </dl>
    </Link>
  );
}
