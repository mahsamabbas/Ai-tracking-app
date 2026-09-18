import { randomUUID } from "node:crypto";
import type { ActivityEvent } from "@techlio/event-schema";
import { EventTypes, SCHEMA_VERSION } from "@techlio/event-schema";
import { inferToolCategory } from "./tool-category.js";

export interface ConnectorContext {
  organizationId: string;
  developerId: string;
  deviceId: string;
  connectorVersion: string;
  consentVersion: string;
  provider: string;
}

export interface ClaudeHookPayload {
  hook_event_name?: string;
  session_id?: string;
  tool_name?: string;
  cwd?: string;
}

const hookToEvent: Record<string, string> = {
  SessionStart: EventTypes.session_started,
  SessionEnd: EventTypes.session_ended,
  PreToolUse: EventTypes.tool_started,
  PostToolUse: EventTypes.tool_completed,
  UserPromptSubmit: EventTypes.model_request_started,
};

export function claudeHookToEvents(
  payload: ClaudeHookPayload,
  ctx: ConnectorContext,
): ActivityEvent[] {
  const type = payload.hook_event_name
    ? hookToEvent[payload.hook_event_name]
    : undefined;
  if (!type) return [];

  const occurredAt = new Date().toISOString();
  const sessionId = payload.session_id;

  const event: ActivityEvent = {
    event_id: randomUUID(),
    schema_version: SCHEMA_VERSION,
    organization_id: ctx.organizationId,
    developer_id: ctx.developerId,
    device_id: ctx.deviceId,
    provider: ctx.provider,
    connector_version: ctx.connectorVersion,
    session_id: sessionId,
    event_type: type as ActivityEvent["event_type"],
    occurred_at: occurredAt,
    consent_version: ctx.consentVersion,
    status: "succeeded",
    metadata: payload.tool_name
      ? {
          tool_name: payload.tool_name.slice(0, 128),
          tool_category: inferToolCategory(payload.tool_name),
        }
      : undefined,
  };
  return [event];
}
