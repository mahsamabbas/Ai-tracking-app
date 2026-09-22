/** Scrollable table region — use inside a flex column card so vertical scroll works. */
export function TableScroll({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`table-scroll min-h-0 ${className}`}>{children}</div>;
}
