import { formatDuration } from "@/lib/format";
import { InfoDot } from "@/components/ui/InfoDot";

export interface SplitBand {
  label: string;
  ms: number;
  color: string;
  help: string;
}

/**
 * The PRD forbids presenting the duration metrics as one number. This renders
 * them as a labelled stacked bar so the parts stay legible and separate.
 */
export function DurationSplit({
  bands,
  totalMs,
  totalLabel,
}: {
  bands: SplitBand[];
  totalMs: number;
  totalLabel: string;
}) {
  const safeTotal = Math.max(totalMs, 1);
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="hint">{totalLabel}</span>
        <span className="num text-sm font-semibold text-ink-900">
          {formatDuration(totalMs)}
        </span>
      </div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        {bands.map((b) => (
          <div
            key={b.label}
            title={`${b.label}: ${formatDuration(b.ms)}`}
            style={{
              width: `${(b.ms / safeTotal) * 100}%`,
              background: b.color,
            }}
          />
        ))}
      </div>
      <ul className="mt-3 space-y-1.5">
        {bands.map((b) => (
          <li key={b.label} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: b.color }} />
            <span className="text-ink-700">{b.label}</span>
            <InfoDot text={b.help} />
            <span className="num ml-auto font-medium text-ink-900">
              {formatDuration(b.ms)}
            </span>
            <span className="num w-9 text-right text-ink-400">
              {Math.round((b.ms / safeTotal) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
