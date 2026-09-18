const SECRET_PATTERNS = [
  /ghp_[a-zA-Z0-9]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];

const FORBIDDEN_KEYS = new Set([
  "prompt",
  "response",
  "raw_prompt",
  "raw_response",
  "source_code",
  "command_text",
  "screenshot",
]);

export function containsDisallowedSecret(value: string): boolean {
  return SECRET_PATTERNS.some((p) => p.test(value));
}

export function scanEventForSecrets(payload: unknown): string | null {
  if (payload === null || payload === undefined) return null;
  if (typeof payload === "string") {
    return containsDisallowedSecret(payload) ? "string_secret" : null;
  }
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const hit = scanEventForSecrets(item);
      if (hit) return hit;
    }
    return null;
  }
  if (typeof payload === "object") {
    for (const [key, val] of Object.entries(payload as Record<string, unknown>)) {
      if (FORBIDDEN_KEYS.has(key)) return `forbidden_key:${key}`;
      const hit = scanEventForSecrets(val);
      if (hit) return hit;
    }
  }
  return null;
}
