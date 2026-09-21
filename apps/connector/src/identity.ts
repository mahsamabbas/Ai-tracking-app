import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type ConnectorIdentity = {
  organizationId: string;
  developerId: string;
  deviceId: string;
  deviceToken: string;
  apiBaseUrl: string;
  displayName: string;
  claimedAt: string;
  provider?: string;
  label?: string;
  providers?: string[];
};

const DIR = join(homedir(), ".techlio-connector");
const FILE = join(DIR, "identity.json");

export function identityDir(): string {
  return DIR;
}

export function loadIdentity(): ConnectorIdentity | null {
  try {
    if (existsSync(FILE)) {
      const raw = JSON.parse(readFileSync(FILE, "utf8")) as ConnectorIdentity;
      if (raw.deviceId && raw.deviceToken && raw.developerId && raw.organizationId) {
        return raw;
      }
    }
  } catch {
    /* ignore corrupt file */
  }
  return null;
}

export function saveIdentity(id: ConnectorIdentity): void {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify(id, null, 2), { mode: 0o600 });
}

export function clearIdentity(): void {
  try {
    if (existsSync(FILE)) unlinkSync(FILE);
  } catch {
    /* already gone */
  }
}

export function publicIdentity(id: ConnectorIdentity | null) {
  if (!id) return { paired: false as const };
  const providers = id.providers?.length
    ? id.providers
    : id.provider
      ? [id.provider]
      : [];
  return {
    paired: true as const,
    displayName: id.displayName,
    developerId: id.developerId,
    deviceId: id.deviceId,
    organizationId: id.organizationId,
    provider: id.provider ?? providers[0] ?? null,
    label: id.label ?? null,
    providers,
  };
}
