import Link from "next/link";

export interface BarItem {
  label: string;
  value: number;
  formatted: string;
  meta?: string;
  href?: string;
  color?: string;
}

/** Ranked horizontal bars — clearer than a pie for "top N" comparisons. */
export function BarList({ items, emptyLabel = "No data in this period" }: {
  items: BarItem[];
  emptyLabel?: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  if (items.length === 0) {
    return <p className="hint py-6 text-center">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const inner = (
          <>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="truncate text-sm text-ink-900">{item.label}</span>
              <span className="num shrink-0 text-xs font-medium text-ink-700">
                {item.formatted}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(2, (item.value / max) * 100)}%`,
                  background: item.color ?? "var(--chart-1)",
                }}
              />
            </div>
            {item.meta ? <p className="hint mt-1">{item.meta}</p> : null}
          </>
        );
        return (
          <li key={item.label}>
            {item.href ? (
              <Link href={item.href} className="block rounded-lg p-1 -m-1 transition hover:bg-slate-50">
                {inner}
              </Link>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ul>
  );
}
