import Database from "better-sqlite3";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import type { ActivityEvent } from "@techlio/event-schema";

const ALGO = "aes-256-gcm";

export type PendingBatch = {
  rowIds: number[];
  events: ActivityEvent[];
};

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, "techlio-connector", 32);
}

export class EncryptedQueue {
  private db: Database.Database;
  private key: Buffer;

  constructor(path: string, secret: string) {
    this.db = new Database(path);
    this.key = deriveKey(secret);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pending (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payload BLOB NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  }

  private encrypt(text: string): Buffer {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGO, this.key, iv);
    const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]);
  }

  private decrypt(buf: Buffer): string {
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = createDecipheriv(ALGO, this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8",
    );
  }

  enqueue(events: ActivityEvent[]): void {
    const stmt = this.db.prepare(
      "INSERT INTO pending (payload, created_at) VALUES (?, ?)",
    );
    const blob = this.encrypt(JSON.stringify(events));
    stmt.run(blob, new Date().toISOString());
  }

  peekBatch(limit = 100): PendingBatch {
    const rows = this.db
      .prepare(
        "SELECT id, payload FROM pending ORDER BY id ASC LIMIT ?",
      )
      .all(limit) as { id: number; payload: Buffer }[];
    const events: ActivityEvent[] = [];
    const rowIds: number[] = [];
    const del = this.db.prepare("DELETE FROM pending WHERE id = ?");
    for (const row of rows) {
      try {
        const parsed = JSON.parse(this.decrypt(row.payload)) as ActivityEvent[];
        events.push(...parsed);
        rowIds.push(row.id);
      } catch {
        // An unreadable row can never be delivered and must not block newer rows.
        del.run(row.id);
      }
    }
    return { rowIds, events };
  }

  acknowledge(rowIds: number[]): void {
    if (rowIds.length === 0) return;
    const del = this.db.prepare("DELETE FROM pending WHERE id = ?");
    const remove = this.db.transaction((ids: number[]) => {
      for (const id of ids) del.run(id);
    });
    remove(rowIds);
  }

  /** Compatibility helper. Prefer peekBatch + acknowledge for uploads. */
  dequeueBatch(limit = 100): ActivityEvent[] {
    const batch = this.peekBatch(limit);
    this.acknowledge(batch.rowIds);
    return batch.events;
  }

  depth(): number {
    const row = this.db
      .prepare("SELECT COUNT(*) as c FROM pending")
      .get() as { c: number };
    return row.c;
  }

  clear(): void {
    this.db.exec("DELETE FROM pending");
  }
}
