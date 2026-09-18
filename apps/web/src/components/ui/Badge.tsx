type Tone = "ok" | "warn" | "bad" | "info" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  ok: "badge-ok",
  warn: "badge-warn",
  bad: "badge-bad",
  info: "badge-info",
  neutral: "badge-neutral",
};

const DOT_CLASS: Record<Tone, string> = {
  ok: "bg-teal-500",
  warn: "bg-amber-500",
  bad: "bg-rose-500",
  info: "bg-brand-500",
  neutral: "bg-slate-400",
};

export function Badge({
  tone = "neutral",
  dot = false,
  title,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={TONE_CLASS[tone]} title={title}>
      {dot ? <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASS[tone]}`} /> : null}
      {children}
    </span>
  );
}
