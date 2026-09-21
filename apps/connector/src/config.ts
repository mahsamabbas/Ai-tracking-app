import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Optional local env for API URL / port — identity is claimed, not stored here. */
function loadLocalEnv(): void {
  const candidates = [
    join(homedir(), ".techlio", "connector", ".env"),
    join(dirname(fileURLToPath(import.meta.url)), "../.env"),
    join(process.cwd(), ".env"),
    join(process.cwd(), "apps/connector/.env"),
  ];
  for (const envPath of candidates) {
    if (!existsSync(envPath)) continue;
    for (const raw of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
    break;
  }
}

loadLocalEnv();

export const config = {
  port: Number(process.env.CONNECTOR_PORT ?? 9477),
  apiBaseUrl: process.env.TECHLIO_API_URL ?? "http://localhost:3001",
  consentVersion: process.env.TECHLIO_CONSENT_VERSION ?? "1",
  connectorVersion: "0.1.0",
  provider: process.env.TECHLIO_PROVIDER ?? "cursor",
  dbPath: process.env.CONNECTOR_DB ?? ".techlio-connector/queue.db",
  signingKeyHex: process.env.CONNECTOR_SIGNING_KEY_HEX,
};
