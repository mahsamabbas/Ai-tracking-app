export function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "indigo" | "emerald" | "amber" | "slate";
}) {
  const ring =
    accent === "emerald"
      ? "border-l-emerald-500"
      : accent === "amber"
        ? "border-l-amber-500"
        : accent === "indigo"
          ? "border-l-indigo-500"
          : "border-l-slate-300";

  return (
    <div className={`card border-l-4 ${ring}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 font-serif text-2xl font-semibold tabular-nums text-slate-900 sm:text-3xl">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
