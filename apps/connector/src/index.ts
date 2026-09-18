import Fastify from "fastify";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  EventTypes,
  providerCapability,
  providerFromHostApp,
  type ActivityEvent,
} from "@techlio/event-schema";
import { claudeHookToEvents } from "@techlio/provider-adapters";
import { config } from "./config.js";
import { EncryptedQueue } from "./queue.js";
import { loadOrCreateSigningKey } from "./signing.js";
import { sanitizeEvent } from "./redaction.js";
import { uploadBatch } from "./uploader.js";

let paused = false;
/** Actual host agent — declared by the IDE companion, not hardcoded as Claude. */
let hostProvider = config.provider;
let activeSessionId: string | undefined;
let contextLabel: string | undefined;

function defaultStatus(
  eventType: ActivityEvent["event_type"],
): ActivityEvent["status"] | undefined {
  if (eventType === "heartbeat_sent") return "succeeded";
  if (eventType.endsWith("_completed")) return "succeeded";
  if (eventType.endsWith("_started")) return "started";
  if (eventType === "connector_paused" || eventType === "session_paused") {
    return "unknown";
  }
  return undefined;
}
const deviceToken = config.deviceToken;
const signingKey = loadOrCreateSigningKey(config.signingKeyHex);
mkdirSync(dirname(config.dbPath), { recursive: true });
const queue = new EncryptedQueue(config.dbPath, deviceToken);

function connectorCtx(provider: string) {
  return {
    organizationId: config.organizationId,
    developerId: config.developerId,
    deviceId: config.deviceId,
    connectorVersion: config.connectorVersion,
    consentVersion: config.consentVersion,
    provider,
  };
}

function baseEvent(
  eventType: ActivityEvent["event_type"],
  extra?: Partial<ActivityEvent>,
): ActivityEvent {
  const meta = { ...(extra?.metadata ?? {}) };
  if (contextLabel && !meta.path_category) {
    meta.path_category = contextLabel.slice(0, 64);
  }
  return {
    event_id: crypto.randomUUID(),
    schema_version: "1.0.0",
    organization_id: config.organizationId,
    developer_id: config.developerId,
    device_id: config.deviceId,
    provider: hostProvider,
    connector_version: config.connectorVersion,
    event_type: eventType,
    occurred_at: new Date().toISOString(),
    consent_version: config.consentVersion,
    session_id: extra?.session_id ?? activeSessionId,
    status: extra?.status ?? defaultStatus(eventType),
    ...extra,
    metadata: Object.keys(meta).length ? meta : extra?.metadata,
  };
}

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

async function postApiHeartbeat(): Promise<void> {
  const caps = providerCapability(hostProvider);
  try {
    await fetch(
      `${config.apiBaseUrl}/v1/connectors/${config.deviceId}/heartbeat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${deviceToken}`,
        },
        body: JSON.stringify({
          version: config.connectorVersion,
          queueDepth: queue.depth(),
          paused,
          provider: hostProvider,
          capabilities: {
            hourly: caps?.hourly ?? false,
            missing: caps?.missing ?? [],
            tier: caps?.tier ?? "B",
          },
        }),
      },
    );
  } catch {
    /* API may be down; event queue still retries */
  }
}

function enqueueHeartbeat(): void {
  if (paused) return;
  const caps = providerCapability(hostProvider);
  queue.enqueue([
    baseEvent(EventTypes.heartbeat_sent, {
      metadata: {
        tool_category: "other",
        queue_depth: queue.depth(),
        connector_paused: paused,
        provider_name: caps?.label,
        tier: caps?.tier,
        daily_only: caps ? !caps.hourly : true,
        capabilities_missing: caps?.missing?.slice(0, 8).join(","),
      },
    }),
  ]);
  void flushQueue();
  void postApiHeartbeat();
}

const app = Fastify({ logger: true });

app.get("/health", async () => {
  const caps = providerCapability(hostProvider);
  return {
    paused,
    queueDepth: queue.depth(),
    version: config.connectorVersion,
    provider: hostProvider,
    capabilities: {
      hourly: caps?.hourly ?? false,
      otlp: hostProvider === "claude_code",
      hooks: hostProvider === "claude_code",
      companion: hostProvider === "cursor" || hostProvider === "vscode",
      missing: caps?.missing ?? [],
      emptyState: caps?.emptyState ?? "",
    },
  };
});

/** IDE companion declares the real host (Cursor, VS Code, …). */
app.post("/host", async (req) => {
  const body = req.body as { provider?: string; appName?: string };
  hostProvider =
    body.provider ??
    providerFromHostApp(body.appName) ??
    hostProvider;
  enqueueHeartbeat();
  return { provider: hostProvider };
});

function enqueueCoverageGap(reason: "paused" | "offline"): void {
  queue.enqueue([
    baseEvent(EventTypes.telemetry_gap_started, {
      metadata: { gap_reason: reason, connector_paused: reason === "paused" },
    }),
    baseEvent(EventTypes.connector_paused, {
      metadata: { connector_paused: true, queue_depth: queue.depth() },
    }),
  ]);
  void flushQueue();
}

app.post("/pause", async () => {
  paused = true;
  enqueueCoverageGap("paused");
  void postApiHeartbeat();
  return { paused: true };
});

app.post("/resume", async () => {
  paused = false;
  queue.enqueue([
    baseEvent(EventTypes.connector_resumed, {
      metadata: { connector_paused: false },
    }),
    baseEvent(EventTypes.telemetry_gap_ended, {
      metadata: { gap_reason: "paused" },
    }),
  ]);
  void flushQueue();
  void postApiHeartbeat();
  return { paused: false };
});

app.post("/hooks/extension", async (req) => {
  if (paused) return { accepted: 0 };
  const body = req.body as Record<string, unknown>;
  if (typeof body.appName === "string" || typeof body.provider === "string") {
    hostProvider =
      (typeof body.provider === "string" ? body.provider : undefined) ??
      providerFromHostApp(
        typeof body.appName === "string" ? body.appName : undefined,
      );
  }
  const eventType = String(body.event_type ?? "file_modified");
  const allowed = new Set<string>([
    EventTypes.file_modified,
    EventTypes.file_created,
    EventTypes.test_completed,
    EventTypes.build_completed,
    EventTypes.lint_completed,
    EventTypes.task_context_changed,
    EventTypes.session_started,
    EventTypes.session_ended,
  ]);
  if (!allowed.has(eventType)) {
    return { accepted: 0 };
  }

  if (typeof body.session_id === "string") {
    activeSessionId = body.session_id;
  }
  if (eventType === EventTypes.session_started && body.session_id) {
    activeSessionId = String(body.session_id);
  }
  if (eventType === EventTypes.task_context_changed && typeof body.label === "string") {
    contextLabel = body.label;
  }

  const event = baseEvent(eventType as ActivityEvent["event_type"], {
    provider: hostProvider,
    session_id: typeof body.session_id === "string" ? body.session_id : undefined,
    status:
      eventType === EventTypes.task_context_changed ||
      eventType === EventTypes.session_started
        ? "succeeded"
        : undefined,
    metadata:
      typeof body.file_path === "string"
        ? {
            file_path: String(body.file_path).slice(0, 512),
            path_category: "workspace",
            provider_name: providerCapability(hostProvider)?.label,
            tier: providerCapability(hostProvider)?.tier,
            daily_only: !providerCapability(hostProvider)?.hourly,
          }
        : {
            provider_name: providerCapability(hostProvider)?.label,
            tier: providerCapability(hostProvider)?.tier,
            daily_only: !providerCapability(hostProvider)?.hourly,
            ...(typeof body.label === "string"
              ? { path_category: body.label.slice(0, 64) }
              : {}),
          },
  });
  const clean = sanitizeEvent(event);
  if (clean) {
    queue.enqueue([clean]);
    void flushQueue();
    return { accepted: 1, provider: hostProvider };
  }
  return { accepted: 0 };
});

app.post("/hooks/claude", async (req) => {
  if (paused) return { accepted: 0 };
  const events = claudeHookToEvents(
    req.body as Record<string, unknown>,
    connectorCtx("claude_code"),
  );
  const clean = events
    .map(sanitizeEvent)
    .filter((e): e is NonNullable<typeof e> => e !== null);
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
  enqueueHeartbeat();
}, 30_000);

const port = config.port;
app.listen({ port, host: "127.0.0.1" }).then(() => {
  enqueueHeartbeat();
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
