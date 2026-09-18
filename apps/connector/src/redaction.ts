import type { ActivityEvent } from "@techlio/event-schema";
import { ActivityEventSchema } from "@techlio/event-schema";

const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/,
  /ghp_[a-zA-Z0-9]{20,}/,
  /AKIA[0-9A-Z]{16}/,
];

export function containsSecret(value: string): boolean {
  return SECRET_PATTERNS.some((p) => p.test(value));
}

/** Allowlist-only: parse through schema; reject on failure or secrets in string fields. */
export function sanitizeEvent(event: ActivityEvent): ActivityEvent | null {
  const parsed = ActivityEventSchema.safeParse(event);
  if (!parsed.success) return null;
  const str = JSON.stringify(parsed.data);
  if (containsSecret(str)) return null;
  return parsed.data;
}
