import Fastify from "fastify";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { EventTypes } from "@techlio/event-schema";
import { claudeHookToEvents } from "@techlio/provider-adapters";
import { config } from "./config.js";
import { EncryptedQueue } from "./queue.js";
import { loadOrCreateSigningKey } from "./signing.js";
import { sanitizeEvent } from "./redaction.js";
import { uploadBatch } from "./uploader.js";

let paused = false;
const deviceToken = process.env.TECHLIO_DEVICE_TOKEN ?? "dev-device-token";
const signingKey = loadOrCreateSigningKey(config.signingKeyHex);
mkdirSync(dirname(config.dbPath), { recursive: true });
const queue = new EncryptedQueue(config.dbPath, deviceToken);

const ctx = {
  organizationId: config.organizationId,
  developerId: config.developerId,
  deviceId: config.deviceId,
  connectorVersion: config.connectorVersion,
  consentVersion: config.consentVersion,
  provider: config.provider,
};

async function flushQueue(): Promise<void> {
  if (paused) return;
  const batch = queue.dequeueBatch();
  if (batch.length === 0) return;
  const ok = await uploadBatch(
    config.apiBaseUrl,
    deviceToken,
    signingKey,
    batch,
  );
  if (!ok) queue.enqueue(batch);
}

const app = Fastify({ logger: true });

app.get("/health", async () => ({
  paused,
  queueDepth: queue.depth(),
  version: config.connectorVersion,
  capabilities: {
    hourly: true,
    otlp: true,
    hooks: true,
    missing: ["cursor_agent_sessions"],
  },
}));

app.post("/pause", async () => {
  paused = true;
  return { paused: true };
});

app.post("/resume", async () => {
  paused = false;
  return { paused: false };
});

app.post("/hooks/claude", async (req) => {
  if (paused) return { accepted: 0 };
  const events = claudeHookToEvents(
    req.body as Record<string, unknown>,
    ctx,
  );
  const clean = events.map(sanitizeEvent).filter((e): e is NonNullable<typeof e> => e !== null);
  if (clean.length) queue.enqueue(clean);
  void flushQueue();
  return { accepted: clean.length };
});

app.post("/v1/traces", async () => ({ partialSuccess: {} }));
app.post("/v1/logs", async () => ({ partialSuccess: {} }));

setInterval(() => {
  void flushQueue();
}, 15_000);

setInterval(() => {
  if (!paused) {
    queue.enqueue([
      {
        event_id: crypto.randomUUID(),
        schema_version: "1.0.0",
        organization_id: config.organizationId,
        developer_id: config.developerId,
        device_id: config.deviceId,
        provider: config.provider,
        connector_version: config.connectorVersion,
        event_type: EventTypes.heartbeat_sent,
        occurred_at: new Date().toISOString(),
        consent_version: config.consentVersion,
        metadata: { tool_category: "other" },
      },
    ]);
  }
}, 60_000);

const port = config.port;
app.listen({ port, host: "127.0.0.1" }).catch((err) => {
  console.error(err);
  process.exit(1);
});
