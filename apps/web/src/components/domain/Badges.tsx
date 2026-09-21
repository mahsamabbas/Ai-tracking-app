import { Badge } from "@/components/ui/Badge";
import { CONNECTOR_STATE, classificationOf, type ConnectorState } from "@/lib/vocab";
import { providerMeta } from "@/lib/providers";

export function ConnectorBadge({
  state,
  demo,
}: {
  state: ConnectorState;
  demo?: boolean;
}) {
  if (demo && (state === "online" || state === "stale")) {
    return (
      <Badge
        tone="neutral"
        dot
        title="Seeded sample connector. This is not a live process check on this machine."
      >
        Demo sample
      </Badge>
    );
  }
  const s = CONNECTOR_STATE[state] ?? CONNECTOR_STATE.offline;
  return (
    <Badge tone={s.tone} dot title={s.help}>
      {s.label}
    </Badge>
  );
}

export function ClassificationBadge({ id }: { id: string }) {
  const c = classificationOf(id);
  return (
    <Badge tone={c.tone} title={c.help}>
      {c.label}
    </Badge>
  );
}

export function ProviderBadge({
  provider,
  size = "md",
}: {
  provider: string | null | undefined;
  size?: "sm" | "md";
}) {
  const meta = providerMeta(provider);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-medium ${
        size === "sm" ? "px-1.5 py-0.5 text-2xs" : "px-2 py-1 text-xs"
      }`}
      style={{ background: meta.soft, color: meta.ink }}
      title={meta.note}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

export function CoverageBadge({ state }: { state: string }) {
  if (state === "complete") return null;
  return (
    <Badge
      tone="warn"
      title="Telemetry for this session is incomplete. Missing data is not evidence of inactivity."
    >
      {state === "gap" ? "Coverage gap" : "Partial telemetry"}
    </Badge>
  );
}
