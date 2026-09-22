import Fastify from "fastify";
import type { FastifyReply, FastifyRequest } from "fastify";
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
import {
  clearIdentity,
  loadIdentity,
  publicIdentity,
  type ConnectorIdentity,
} from "./identity.js";
import { claimFromPortal } from "./pairing.js";
import { EncryptedQueue } from "./queue.js";
import { loadOrCreateSigningKey, publicSigningKey } from "./signing.js";
import { sanitizeEvent } from "./redaction.js";
import { uploadBatch } from "./uploader.js";

let paused = false;
/** Actual host agent — declared by the IDE companion, not hardcoded as Claude. */
let hostProvider = config.provider;
let contextLabel: string | undefined;
let identity: ConnectorIdentity | null = loadIdentity();
let activeSessionId: string | undefined = identity ? crypto.randomUUID() : undefined;
let flushing = false;

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

const signingKey = loadOrCreateSigningKey(config.signingKeyHex);
mkdirSync(dirname(config.dbPath), { recursive: true });
const queue = new EncryptedQueue(config.dbPath, "techlio-local-queue");

function apiBase(): string {
  return identity?.apiBaseUrl ?? config.apiBaseUrl;
}

function connectorCtx(provider: string) {
  if (!identity) {
    throw new Error("unpaired");
  }
  return {
    organizationId: identity.organizationId,
    developerId: identity.developerId,
    deviceId: identity.deviceId,
    connectorVersion: config.connectorVersion,
    consentVersion: config.consentVersion,
    provider,
  };
}

function stamp(event: ActivityEvent): ActivityEvent {
  if (!identity) return event;
  return {
    ...event,
    organization_id: identity.organizationId,
    developer_id: identity.developerId,
    device_id: identity.deviceId,
  };
}

function baseEvent(
  eventType: ActivityEvent["event_type"],
  extra?: Partial<ActivityEvent>,
): ActivityEvent | null {
  if (!identity) return null;
  const meta = { ...(extra?.metadata ?? {}) };
  if (contextLabel && !meta.path_category) {
    meta.path_category = contextLabel.slice(0, 64);
  }
  return {
    event_id: crypto.randomUUID(),
    schema_version: "1.0.0",
    organization_id: identity.organizationId,
    developer_id: identity.developerId,
    device_id: identity.deviceId,
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
  if (paused || !identity || flushing) return;
  const pending = queue.peekBatch();
  const batch = pending.events.map(stamp);
  if (batch.length === 0) return;
  flushing = true;
  try {
    const ok = await uploadBatch(
      apiBase(),
      identity.deviceToken,
      signingKey,
      batch,
    );
    if (ok) queue.acknowledge(pending.rowIds);
  } catch {
    // Keep the original queue rows for at-least-once delivery.
  } finally {
    flushing = false;
  }
}

async function postApiHeartbeat(): Promise<void> {
  if (!identity) return;
  const caps = providerCapability(hostProvider);
  try {
    await fetch(`${apiBase()}/v1/connectors/${identity.deviceId}/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${identity.deviceToken}`,
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
    });
  } catch {
    /* API may be down; event queue still retries */
  }
}

function enqueueHeartbeat(): void {
  if (paused || !identity) return;
  const caps = providerCapability(hostProvider);
  const event = baseEvent(EventTypes.heartbeat_sent, {
    metadata: {
      tool_category: "other",
      queue_depth: queue.depth(),
      connector_paused: paused,
      provider_name: caps?.label,
      tier: caps?.tier,
      daily_only: caps ? !caps.hourly : true,
      capabilities_missing: caps?.missing?.slice(0, 8).join(","),
    },
  });
  if (event) queue.enqueue([event]);
  void flushQueue();
  void postApiHeartbeat();
}

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/** Localhost and TECHLIO_DASHBOARD_ORIGINS (comma-separated production dashboard URLs). */
function dashboardOriginAllowed(origin: string): boolean {
  if (LOCAL_ORIGIN.test(origin)) return true;
  const allowed = (
    process.env.TECHLIO_DASHBOARD_ORIGINS ?? "https://tracking-app-api-t9yd.vercel.app"
  )
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return allowed.some((pattern) => {
    if (!pattern.includes("*")) return pattern === origin;
    const expression = pattern
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, "[^/]+");
    return new RegExp(`^${expression}$`).test(origin);
  });
}

const app = Fastify({ logger: true });

app.addHook("onRequest", async (req, reply) => {
  const origin = req.headers.origin;
  if (typeof origin === "string" && dashboardOriginAllowed(origin)) {
    reply.header("Access-Control-Allow-Origin", origin);
    reply.header("Vary", "Origin");
    reply.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    reply.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    // Chrome blocks a public HTTPS page from calling 127.0.0.1 without this.
    reply.header("Access-Control-Allow-Private-Network", "true");
  }
  if (req.method === "OPTIONS") {
    return reply.code(204).send();
  }
});

app.get("/health", async () => {
  const caps = providerCapability(hostProvider);
  return {
    paused,
    queueDepth: queue.depth(),
    version: config.connectorVersion,
    provider: hostProvider,
    ...publicIdentity(identity),
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

app.get("/identity", async () => publicIdentity(identity));

app.post("/claim", async (req, reply) => {
  const body = (req.body ?? {}) as {
    accessToken?: string;
    deviceId?: string;
    deviceToken?: string;
    displayName?: string;
    apiBaseUrl?: string;
    consentAccepted?: boolean;
  };
  if (!body.accessToken) {
    return reply.code(400).send({ error: "access_token_required" });
  }
  if (!body.deviceId || !body.deviceToken) {
    return reply.code(400).send({ error: "admin_issued_keys_required" });
  }
  if (body.consentAccepted !== true) {
    return reply.code(400).send({ error: "collection_notice_required" });
  }
  try {
    identity = await claimFromPortal({
      accessToken: body.accessToken,
      deviceId: body.deviceId,
      deviceToken: body.deviceToken,
      publicKey: await publicSigningKey(signingKey),
      displayName: body.displayName,
      apiBaseUrl: body.apiBaseUrl ?? config.apiBaseUrl,
      consentAccepted: true,
      consentVersion: config.consentVersion,
    });
    activeSessionId = crypto.randomUUID();
    queue.clear();
    if (identity.provider) hostProvider = identity.provider;
    enqueueHeartbeat();
    return publicIdentity(identity);
  } catch (err) {
    const message = err instanceof Error ? err.message : "claim_failed";
    const code =
      message === "not_signed_in"
        ? 401
        : message === "invalid_connector_key" || message === "not_your_key"
          ? 403
          : message === "admin_issued_keys_required"
            ? 400
            : 502;
    return reply.code(code).send({ error: message });
  }
});

app.post("/unpair", async () => {
  clearIdentity();
  identity = null;
  activeSessionId = undefined;
  queue.clear();
  return { paired: false as const };
});

/** IDE companion declares the real host (Cursor, VS Code, …). */
app.post("/host", async (req) => {
  const body = req.body as { provider?: string; appName?: string };
  hostProvider =
    body.provider ??
    providerFromHostApp(body.appName) ??
    hostProvider;
  enqueueHeartbeat();
  return { provider: hostProvider, ...publicIdentity(identity) };
});

function enqueueCoverageGap(reason: "paused" | "offline"): void {
  const started = baseEvent(EventTypes.telemetry_gap_started, {
    metadata: { gap_reason: reason, connector_paused: reason === "paused" },
  });
  const pausedEv = baseEvent(EventTypes.connector_paused, {
    metadata: { connector_paused: true, queue_depth: queue.depth() },
  });
  const batch = [started, pausedEv].filter((e): e is ActivityEvent => e !== null);
  if (batch.length) queue.enqueue(batch);
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
  const resumed = baseEvent(EventTypes.connector_resumed, {
    metadata: { connector_paused: false },
  });
  const ended = baseEvent(EventTypes.telemetry_gap_ended, {
    metadata: { gap_reason: "paused" },
  });
  const batch = [resumed, ended].filter((e): e is ActivityEvent => e !== null);
  if (batch.length) queue.enqueue(batch);
  void flushQueue();
  void postApiHeartbeat();
  return { paused: false };
});

app.post("/hooks/extension", async (req) => {
  if (paused) return { accepted: 0, unpaired: !identity };
  if (!identity) return { accepted: 0, unpaired: true };
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
    EventTypes.file_deleted,
    EventTypes.test_completed,
    EventTypes.build_completed,
    EventTypes.lint_completed,
    EventTypes.task_context_changed,
    EventTypes.session_started,
    EventTypes.session_heartbeat,
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
  const workspaceLabel =
    typeof body.workspace === "string"
      ? body.workspace.slice(0, 64)
      : typeof body.label === "string"
        ? body.label.slice(0, 64)
        : undefined;
  if (eventType === EventTypes.task_context_changed && workspaceLabel) {
    contextLabel = workspaceLabel;
  } else if (workspaceLabel && !contextLabel) {
    contextLabel = workspaceLabel;
  }

  const caps = providerCapability(hostProvider);
  const event = baseEvent(eventType as ActivityEvent["event_type"], {
    provider: hostProvider,
    session_id: activeSessionId,
    status:
      eventType === EventTypes.task_context_changed ||
      eventType === EventTypes.session_started ||
      eventType === EventTypes.session_heartbeat
        ? "succeeded"
        : undefined,
    metadata: {
      provider_name: caps?.label,
      tier: caps?.tier,
      daily_only: caps ? !caps.hourly : true,
      ...(workspaceLabel ? { path_category: workspaceLabel } : {}),
      ...(typeof body.file_path === "string"
        ? { file_path: String(body.file_path).slice(0, 512) }
        : {}),
    },
  });
  const clean = event ? sanitizeEvent(event) : null;
  if (clean) {
    queue.enqueue([clean]);
    void flushQueue();
    return { accepted: 1, provider: hostProvider };
  }
  return { accepted: 0 };
});

app.post("/hooks/claude", async (req) => {
  if (paused) return { accepted: 0 };
  if (!identity) return { accepted: 0, unpaired: true };
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

const rejectUnavailableOtlp = async (
  _request: FastifyRequest,
  reply: FastifyReply,
) =>
  reply.code(501).send({
    error: "otlp_adapter_not_enabled",
    message:
      "This connector build does not normalize OTLP payloads. No telemetry was accepted.",
  });

app.post("/v1/traces", rejectUnavailableOtlp);
app.post("/v1/logs", rejectUnavailableOtlp);

setInterval(() => {
  void flushQueue();
}, 15_000);

setInterval(() => {
  enqueueHeartbeat();
}, 30_000);

const port = config.port;
app
  .listen({ port, host: "127.0.0.1" })
  .then(() => {
    if (identity) {
      app.log.info(
        { developerId: identity.developerId, displayName: identity.displayName },
        "Connector paired",
      );
      setTimeout(() => enqueueHeartbeat(), 3_000);
    } else {
      app.log.info(
        "Connector unpaired — developer can add tools from My connectors in the portal",
      );
    }
    console.log("Techlio connector is running at http://127.0.0.1:9477");
    console.log("Return to the dashboard and click Check if running.");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
