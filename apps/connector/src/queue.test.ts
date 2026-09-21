import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { EventTypes, SCHEMA_VERSION, type ActivityEvent } from "@techlio/event-schema";
import { EncryptedQueue } from "./queue.js";

const dirs: string[] = [];

function event(): ActivityEvent {
  return {
    event_id: "550e8400-e29b-41d4-a716-446655440099",
    schema_version: SCHEMA_VERSION,
    organization_id: "550e8400-e29b-41d4-a716-446655440010",
    developer_id: "550e8400-e29b-41d4-a716-446655440011",
    device_id: "550e8400-e29b-41d4-a716-446655440012",
    provider: "claude_code",
    connector_version: "0.1.0",
    event_type: EventTypes.session_started,
    occurred_at: "2026-09-21T12:00:00.000Z",
    consent_version: "1",
  };
}

function queue(): EncryptedQueue {
  const dir = mkdtempSync(join(tmpdir(), "techlio-queue-"));
  dirs.push(dir);
  return new EncryptedQueue(join(dir, "queue.db"), "test-secret");
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("EncryptedQueue delivery acknowledgement", () => {
  it("keeps a peeked batch until the server acknowledges it", () => {
    const q = queue();
    q.enqueue([event()]);

    const first = q.peekBatch();
    expect(first.events).toHaveLength(1);
    expect(q.depth()).toBe(1);

    const retry = q.peekBatch();
    expect(retry.events[0]?.event_id).toBe(first.events[0]?.event_id);
    expect(q.depth()).toBe(1);
  });

  it("deletes only acknowledged queue rows", () => {
    const q = queue();
    q.enqueue([event()]);
    q.enqueue([{ ...event(), event_id: "550e8400-e29b-41d4-a716-446655440098" }]);

    const first = q.peekBatch(1);
    q.acknowledge(first.rowIds);

    expect(q.depth()).toBe(1);
    expect(q.peekBatch().events[0]?.event_id).toBe(
      "550e8400-e29b-41d4-a716-446655440098",
    );
  });
});
