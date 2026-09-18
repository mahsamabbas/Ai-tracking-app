import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("UTC"),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
});

export const devices = pgTable("devices", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  developerId: uuid("developer_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  publicKey: text("public_key"),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

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
