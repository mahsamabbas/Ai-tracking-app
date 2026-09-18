import Link from "next/link";

export function Breadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-2">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ink-500">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
            {item.href ? (
              <Link href={item.href} className="hover:text-brand-600">
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-ink-700">{item.label}</span>
            )}
            {i < items.length - 1 ? (
              <span aria-hidden className="text-ink-400">
                /
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
