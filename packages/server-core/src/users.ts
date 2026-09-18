import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db } from "./db.js";
import { portalUsers, auditLog } from "./schema.js";
import type { Role } from "./roles.js";

export const DEMO_USERS: {
  email: string;
  password: string;
  displayName: string;
  role: Role;
  developerId?: string;
  id: string;
}[] = [
  {
    id: "880e8400-e29b-41d4-a716-446655440001",
    email: "manager@techlio.local",
    password: "manager123",
    displayName: "Faisal",
    role: "manager",
  },
  {
    id: "880e8400-e29b-41d4-a716-446655440002",
    email: "developer@techlio.local",
    password: "developer123",
    displayName: "Alex",
    role: "developer",
    developerId: "550e8400-e29b-41d4-a716-446655440011",
  },
  {
    id: "880e8400-e29b-41d4-a716-446655440003",
    email: "admin@techlio.local",
    password: "admin123",
    displayName: "Mahsam",
    role: "administrator",
  },
  {
    id: "880e8400-e29b-41d4-a716-446655440004",
    email: "auditor@techlio.local",
    password: "auditor123",
    displayName: "Priya",
    role: "auditor",
  },
];

export const DEV_ORG = "550e8400-e29b-41d4-a716-446655440010";

function hashPassword(password: string): string {
  return createHash("sha256").update(`techlio:${password}`).digest("hex");
}

export async function seedPortalUsers(): Promise<void> {
  try {
    for (const u of DEMO_USERS) {
      await db
        .insert(portalUsers)
        .values({
          id: u.id,
          organizationId: DEV_ORG,
          email: u.email,
          passwordHash: hashPassword(u.password),
          displayName: u.displayName,
          role: u.role,
          developerId: u.developerId ?? null,
        })
        .onConflictDoNothing();
    }
  } catch {
    /* table may not exist until migration 004 */
  }
}

export async function authenticatePortalUser(
  email: string,
  password: string,
): Promise<{
  id: string;
  email: string;
  displayName: string;
  role: Role;
  organizationId: string;
  developerId?: string;
} | null> {
  const hash = hashPassword(password);
  const rows = await db
    .select()
    .from(portalUsers)
    .where(eq(portalUsers.email, email.toLowerCase().trim()));
  const row = rows[0];
  if (row && row.passwordHash === hash) {
    await db.insert(auditLog).values({
      organizationId: row.organizationId,
      actorId: row.id,
      action: "auth.login",
      detail: { email: row.email, role: row.role },
      createdAt: new Date(),
    });
    return {
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      role: row.role as Role,
      organizationId: row.organizationId,
      developerId: row.developerId ?? undefined,
    };
  }

  const demo = DEMO_USERS.find((u) => u.email === email.toLowerCase().trim());
  if (demo && demo.password === password) {
    return {
      id: demo.id,
      email: demo.email,
      displayName: demo.displayName,
      role: demo.role,
      organizationId: DEV_ORG,
      developerId: demo.developerId,
    };
  }
  return null;
}
