import { z } from "zod";
import { eventTypeSchema, SCHEMA_VERSION } from "./catalog.js";

export const EventStatus = z.enum([
  "started",
  "succeeded",
  "failed",
  "cancelled",
  "unknown",
]);

/** Allowlisted metadata keys only — SEC-001 / FR-008 */
export const MetadataSchema = z
  .object({
    model_name: z.string().optional(),
    provider_name: z.string().optional(),
    tool_category: z
      .enum([
        "file_read",
        "file_write",
        "shell",
        "search",
        "test",
        "build",
        "browser",
        "other",
      ])
      .optional(),
    tool_name: z.string().max(128).optional(),
    token_input: z.number().int().nonnegative().optional(),
    token_output: z.number().int().nonnegative().optional(),
    file_path: z.string().max(512).optional(),
    path_category: z.string().max(64).optional(),
    test_passed: z.number().int().nonnegative().optional(),
    test_failed: z.number().int().nonnegative().optional(),
    tier: z.enum(["A", "B"]).optional(),
    daily_only: z.boolean().optional(),
    queue_depth: z.number().int().nonnegative().optional(),
    connector_paused: z.boolean().optional(),
    gap_reason: z.enum(["paused", "offline", "heartbeat_missing"]).optional(),
  })
  .strict();

export const ActivityEventSchema = z.object({
  event_id: z.string().uuid(),
  schema_version: z.literal(SCHEMA_VERSION),
  organization_id: z.string().uuid(),
  developer_id: z.string().uuid(),
  device_id: z.string().uuid(),
  provider: z.string().min(1).max(64),
  connector_version: z.string().min(1).max(32),
  project_id: z.string().uuid().optional(),
  work_item_id: z.string().uuid().optional(),
  session_id: z.string().uuid().optional(),
  event_type: z.enum(eventTypeSchema),
  occurred_at: z.string().datetime(),
  received_at: z.string().datetime().optional(),
  duration_ms: z.number().int().nonnegative().optional(),
  status: EventStatus.optional(),
  metadata: MetadataSchema.optional(),
  content_fingerprint: z.string().max(128).optional(),
  consent_version: z.string().min(1),
});

export type ActivityEvent = z.infer<typeof ActivityEventSchema>;

export const EventBatchSchema = z.object({
  events: z.array(ActivityEventSchema).min(1).max(500),
});

export type EventBatch = z.infer<typeof EventBatchSchema>;
