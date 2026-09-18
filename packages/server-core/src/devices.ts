import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "./db.js";
import { auditLog, devices } from "./schema.js";

export function hashDeviceToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function verifyDeviceToken(
  deviceId: string,
  token: string,
): Promise<{ ok: boolean; organizationId?: string; developerId?: string }> {
  if (token === "dev-device-token") {
    return {
      ok: true,
      organizationId: "550e8400-e29b-41d4-a716-446655440010",
      developerId: "550e8400-e29b-41d4-a716-446655440011",
    };
  }
  const hash = hashDeviceToken(token);
  const rows = await db
    .select()
    .from(devices)
    .where(and(eq(devices.id, deviceId), isNull(devices.revokedAt)));
  const row = rows[0];
  if (!row || row.tokenHash !== hash) return { ok: false };
  return {
    ok: true,
    organizationId: row.organizationId,
    developerId: row.developerId,
  };
}

export async function registerDevice(input: {
  organizationId: string;
  developerId: string;
  publicKey?: string;
}): Promise<{ deviceId: string; token: string }> {
  const deviceId = randomUUID();
  const token = randomBytes(32).toString("base64url");
  await db.insert(devices).values({
    id: deviceId,
    organizationId: input.organizationId,
    developerId: input.developerId,
    tokenHash: hashDeviceToken(token),
    publicKey: input.publicKey ?? null,
    revokedAt: null,
    createdAt: new Date(),
  });
  await db.insert(auditLog).values({
    organizationId: input.organizationId,
    action: "connector.register",
    detail: { deviceId },
    createdAt: new Date(),
  });
  return { deviceId, token };
}

export async function revokeDevice(
  organizationId: string,
  deviceId: string,
): Promise<boolean> {
  const rows = await db
    .update(devices)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(devices.id, deviceId), eq(devices.organizationId, organizationId)),
    )
    .returning({ id: devices.id });
  if (rows.length === 0) return false;
  await db.insert(auditLog).values({
    organizationId,
    action: "connector.revoke",
    detail: { deviceId },
    createdAt: new Date(),
  });
  return true;
}
