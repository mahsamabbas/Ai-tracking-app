import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import {
  db,
  connectorHealth,
  auditLog,
  registerDevice,
  revokeDevice,
  verifyDeviceToken,
  ingestBatch,
} from "@techlio/server-core";
import { eq } from "drizzle-orm";
import { DEV_DEVELOPER, DEV_ORG } from "./constants.js";
import { EventTypes } from "@techlio/event-schema";
import { randomUUID } from "node:crypto";
import { DashboardAuthGuard, requireRoles, userFromRequest } from "./auth/guards.js";

@Controller("v1/connectors")
export class ConnectorsController {
  @Post("register")
  async register(
    @Body() body: { developerId?: string; publicKey?: string },
    @Headers("x-role") role?: string,
  ) {
    if (role && role !== "administrator" && role !== "developer") {
      throw new UnauthorizedException();
    }
    return registerDevice({
      organizationId: DEV_ORG,
      developerId: body.developerId ?? DEV_DEVELOPER,
      publicKey: body.publicKey,
    });
  }

  @Post(":id/revoke")
  @UseGuards(DashboardAuthGuard)
  async revoke(@Param("id") id: string, @Req() req: FastifyRequest) {
    const user = userFromRequest(req);
    requireRoles(user, ["administrator"]);
    const ok = await revokeDevice(user.organizationId, id);
    return { revoked: ok };
  }

  @Post(":id/heartbeat")
  async heartbeat(
    @Param("id") id: string,
    @Headers("authorization") auth: string | undefined,
    @Body()
    body: {
      version?: string;
      queueDepth?: number;
      paused?: boolean;
      provider?: string;
      capabilities?: Record<string, unknown>;
    },
  ) {
    if (!auth?.startsWith("Bearer ")) throw new UnauthorizedException();
    const token = auth.slice(7);
    const verified = await verifyDeviceToken(id, token);
    if (!verified.ok) throw new UnauthorizedException();

    await db
      .insert(connectorHealth)
      .values({
        deviceId: id,
        organizationId: verified.organizationId!,
        lastHeartbeat: new Date(),
        version: body.version ?? "unknown",
        queueDepth: body.queueDepth ?? 0,
        paused: body.paused ? 1 : 0,
        provider: body.provider ?? null,
      })
      .onConflictDoUpdate({
        target: connectorHealth.deviceId,
        set: {
          lastHeartbeat: new Date(),
          version: body.version ?? "unknown",
          queueDepth: body.queueDepth ?? 0,
          paused: body.paused ? 1 : 0,
          provider: body.provider ?? null,
        },
      });

    return { ok: true };
  }

  @Get(":id/health")
  @UseGuards(DashboardAuthGuard)
  async health(@Param("id") id: string, @Req() req: FastifyRequest) {
    const user = userFromRequest(req);
    requireRoles(user, ["administrator", "manager", "auditor"]);
    const rows = await db
      .select()
      .from(connectorHealth)
      .where(eq(connectorHealth.deviceId, id));
    const row = rows[0];
    if (!row) return { status: "unknown", coverageWarning: true };
    const stale =
      !row.lastHeartbeat ||
      Date.now() - row.lastHeartbeat.getTime() > 5 * 60 * 1000;
    return {
      ...row,
      status: stale ? "stale" : row.paused ? "paused" : "online",
      coverageWarning: stale || row.paused === 1,
    };
  }

  @Post(":id/pause")
  async pause(@Param("id") id: string) {
    await db
      .update(connectorHealth)
      .set({ paused: 1 })
      .where(eq(connectorHealth.deviceId, id));

    const gapEvent = {
      event_id: randomUUID(),
      schema_version: "1.0.0" as const,
      organization_id: DEV_ORG,
      developer_id: DEV_DEVELOPER,
      device_id: id,
      provider: "api",
      connector_version: "0.1.0",
      event_type: EventTypes.telemetry_gap_started,
      occurred_at: new Date().toISOString(),
      consent_version: "1",
      metadata: { gap_reason: "paused" as const, connector_paused: true },
    };

    await ingestBatch(DEV_ORG, { events: [gapEvent] }, id);

    await db.insert(auditLog).values({
      organizationId: DEV_ORG,
      action: "connector.pause",
      detail: { deviceId: id },
      createdAt: new Date(),
    });
    return { paused: true, coverageGap: true };
  }
}
