import type { ActivityEvent } from "@techlio/event-schema";

export function cleanMetadata(
  meta: ActivityEvent["metadata"],
): ActivityEvent["metadata"] {
  if (!meta) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (v !== undefined) out[k] = v;
  }
  return out as ActivityEvent["metadata"];
}
