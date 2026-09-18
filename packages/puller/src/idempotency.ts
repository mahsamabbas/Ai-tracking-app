import { createHash } from "node:crypto";

/** Stable event_id for provider pulls so hourly jobs do not duplicate rows. */
export function deterministicEventId(seed: string): string {
  const hash = createHash("sha256").update(seed).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
