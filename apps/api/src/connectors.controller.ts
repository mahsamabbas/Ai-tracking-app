import { Controller, Get, Param, Post } from "@nestjs/common";
import { db, connectorHealth, auditLog } from "@techlio/server-core";
import { eq } from "drizzle-orm";

@Controller("v1/connectors")
export class ConnectorsController {
  @Post("register")
  register() {
    return {
      deviceId: "550e8400-e29b-41d4-a716-446655440012",
      token: "dev-device-token",
    };
  }

  @Get(":id/health")
  async health(@Param("id") id: string) {
    const rows = await db
      .select()
      .from(connectorHealth)
      .where(eq(connectorHealth.deviceId, id));
    return rows[0] ?? { status: "unknown" };
  }

  @Post(":id/pause")
  async pause(@Param("id") id: string) {
    await db.insert(auditLog).values({
      organizationId: "550e8400-e29b-41d4-a716-446655440010",
      action: "connector.pause",
      detail: { deviceId: id },
      createdAt: new Date(),
    });
    return { paused: true, coverageGap: true };
  }
}
