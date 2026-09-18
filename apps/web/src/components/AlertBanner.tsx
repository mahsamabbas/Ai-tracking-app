export function AlertBanner({
  variant,
  title,
  detail,
}: {
  variant: "error" | "warning" | "info";
  title: string;
  detail?: string;
}) {
  const styles = {
    error: "border-rose-200 bg-rose-50 text-rose-900",
    warning: "border-amber-200 bg-amber-50 text-amber-950",
    info: "border-sky-200 bg-sky-50 text-sky-950",
  }[variant];

  return (
    <div className={`mb-6 rounded-xl border px-4 py-3 ${styles}`}>
      <p className="font-medium">{title}</p>
      {detail ? <p className="mt-1 text-sm opacity-90">{detail}</p> : null}
    </div>
  );
}
