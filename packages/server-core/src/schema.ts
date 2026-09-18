import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const activityEvents = pgTable(
  "activity_events",
  {
    eventId: uuid("event_id").primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    developerId: uuid("developer_id").notNull(),
    deviceId: uuid("device_id").notNull(),
    sessionId: uuid("session_id"),
    eventType: text("event_type").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    payload: jsonb("payload").notNull(),
  },
  (t) => [uniqueIndex("activity_events_event_id_idx").on(t.eventId)],
);

export const hourlySnapshots = pgTable("hourly_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  developerId: uuid("developer_id").notNull(),
  hourStart: timestamp("hour_start", { withTimezone: true }).notNull(),
  version: integer("version").notNull().default(1),
  metrics: jsonb("metrics").notNull(),
  completeness: text("completeness").notNull().default("complete"),
  recalcReason: text("recalc_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  actorId: uuid("actor_id"),
  action: text("action").notNull(),
  detail: jsonb("detail"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const connectorHealth = pgTable("connector_health", {
  deviceId: uuid("device_id").primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  lastHeartbeat: timestamp("last_heartbeat", { withTimezone: true }),
  version: text("version"),
  queueDepth: integer("queue_depth"),
  paused: integer("paused").default(0),
});

export const devices = pgTable("devices", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  developerId: uuid("developer_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  publicKey: text("public_key"),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  name: text("name").notNull(),
  externalRef: text("external_ref"),
});

export const workItems = pgTable("work_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  projectId: uuid("project_id"),
  title: text("title").notNull(),
  externalRef: text("external_ref"),
});

export const agentSessions = pgTable("agent_sessions", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  developerId: uuid("developer_id").notNull(),
  deviceId: uuid("device_id").notNull(),
  provider: text("provider").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  projectId: uuid("project_id"),
  workItemId: uuid("work_item_id"),
  unassigned: boolean("unassigned").notNull().default(false),
});

export const sessionContextVersions = pgTable("session_context_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull(),
  organizationId: uuid("organization_id").notNull(),
  projectId: uuid("project_id"),
  workItemId: uuid("work_item_id"),
  label: text("label"),
  version: integer("version").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
});

export const activityExports = pgTable("activity_exports", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  requestedBy: uuid("requested_by"),
  format: text("format").notNull(),
  status: text("status").notNull().default("ready"),
  content: text("content"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});
