import { providerMeta } from "@/lib/providers";

export function CapabilityBanner({ provider }: { provider?: string }) {
  const meta = providerMeta(provider);
  if (!meta || meta.hourly) return null;
  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="text-sm font-medium text-amber-950">
        {meta.label} — coverage limits
      </p>
      <p className="mt-1 text-sm text-amber-900">{meta.empty}</p>
    </div>
  );
}
