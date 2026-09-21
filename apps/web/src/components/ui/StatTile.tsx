import { formatDelta, percentChange } from "@/lib/format";
import { InfoDot } from "./InfoDot";

export function StatTile({
  label,
  value,
  unit,
  hint,
  help,
  current,
  previous,
  invertDelta = false,
  accent,
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  help?: string;
  current?: number;
  previous?: number;
  /** For metrics where "up" is not good news (failures, coverage gaps). */
  invertDelta?: boolean;
  accent?: "brand" | "teal" | "amber" | "rose" | "slate";
}) {
  const delta =
    current !== undefined && previous !== undefined
      ? percentChange(current, previous)
      : undefined;
  const up = delta != null && delta > 0;
  const good = delta == null || delta === 0 ? null : invertDelta ? !up : up;

  const bar =
    accent === "teal"
      ? "bg-teal-500"
      : accent === "amber"
        ? "bg-amber-500"
        : accent === "rose"
          ? "bg-rose-500"
          : accent === "slate"
            ? "bg-slate-400"
            : "bg-brand-600";

  return (
    <div className="card relative overflow-hidden p-5">
      <span className={`absolute inset-y-0 left-0 w-[3px] ${bar}`} aria-hidden />
      <div className="flex items-center gap-1.5">
        <p className="label">{label}</p>
        {help ? <InfoDot text={help} /> : null}
      </div>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="num text-[26px] font-semibold leading-none tracking-tight text-ink-900">
          {value}
        </span>
        {unit ? <span className="text-sm text-ink-500">{unit}</span> : null}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        {delta !== undefined ? (
          <span
            className={`num text-xs font-medium ${
              good === null
                ? "text-ink-500"
                : good
                  ? "text-teal-700 dark:text-teal-400"
                  : "text-rose-700 dark:text-rose-400"
            }`}
          >
            {formatDelta(delta)}
          </span>
        ) : null}
        {hint ? <span className="hint">{hint}</span> : null}
      </div>
    </div>
  );
}
