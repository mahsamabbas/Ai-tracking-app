import {
  Body,
  Controller,
  ForbiddenException,
  Get,
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
  recordLiveHeartbeat,
  hashDeviceToken,
  ingestBatch,
  getDevice,
  canPauseConnector,
  canRegisterConnector,
  canViewConnectorHealth,
  ensureEmployee,
  listPortalUsers,
  DEV_ORG,
} from "@techlio/server-core";
import { eq } from "drizzle-orm";
import { DEV_DEVELOPER, DEV_DEVICE } from "./constants.js";
import { EventTypes } from "@techlio/event-schema";
import { randomUUID } from "node:crypto";
import { DashboardAuthGuard, requireRoles, userFromRequest } from "./auth/guards.js";

async function resolveDeviceDeveloper(
  organizationId: string,
  deviceId: string,
): Promise<{ developerId: string; organizationId: string }> {
  const row = await getDevice(organizationId, deviceId);
  if (row) {
    return { developerId: row.developerId, organizationId: row.organizationId };
  }
  if (deviceId === DEV_DEVICE) {
    return { developerId: DEV_DEVELOPER, organizationId: DEV_ORG };
  }
  return { developerId: DEV_DEVELOPER, organizationId };
}

@Controller("v1/connectors")
export class ConnectorsController {
  @Post("register")
  @UseGuards(DashboardAuthGuard)
  async register(
    @Req() req: FastifyRequest,
    @Body() body: { developerId?: string; publicKey?: string; provider?: string; label?: string },
  ) {
    const user = userFromRequest(req);
    const developerId = body.developerId ?? user.developerId;
    if (!developerId) {
      throw new UnauthorizedException("developer_id_required");
    }
    if (!canRegisterConnector(user, developerId)) {
      throw new ForbiddenException("role_forbidden");
    }
    const members = await listPortalUsers(user.organizationId);
    const member = members.find((m) => m.developerId === developerId);
    if (member?.developerId) {
      await ensureEmployee({
        id: member.developerId,
        organizationId: user.organizationId,
        displayName: member.displayName,
        email: member.email,
      });
    }
    const provider = body.provider ?? "cursor";
    return registerDevice({
      organizationId: user.organizationId,
      developerId,
      publicKey: body.publicKey,
      actorId: user.id,
      provider,
      label:
        body.label?.trim() ||
        (member ? `${member.displayName}'s ${provider}` : "Workstation connector"),
    });
  }

  @Post(":id/revoke")
  @UseGuards(DashboardAuthGuard)
  async revoke(@Param("id") id: string, @Req() req: FastifyRequest) {
    const user = userFromRequest(req);
    requireRoles(user, ["administrator"]);
    const ok = await revokeDevice(user.organizationId, id, user.id);
    return { revoked: ok };
  }

  @Post(":id/heartbeat")
  async heartbeat(
    @Param("id") id: string,
    @Req() req: FastifyRequest,
    @Body()
    body: {
      version?: string;
      queueDepth?: number;
      paused?: boolean;
      provider?: string;
      capabilities?: Record<string, unknown>;
    },
  ) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) throw new UnauthorizedException();
    const token = auth.slice(7);
    const verified = await verifyDeviceToken(id, token);
    if (!verified.ok) throw new UnauthorizedException();

    await recordLiveHeartbeat({
      deviceId: id,
      organizationId: verified.organizationId!,
      developerId: verified.developerId ?? DEV_DEVELOPER,
      version: body.version ?? "unknown",
      queueDepth: body.queueDepth ?? 0,
      paused: Boolean(body.paused),
      provider: body.provider ?? null,
      tokenHash: hashDeviceToken(token),
    });

    return { ok: true };
  }

  @Get(":id/health")
  @UseGuards(DashboardAuthGuard)
  async health(@Param("id") id: string, @Req() req: FastifyRequest) {
    const user = userFromRequest(req);
    if (!canViewConnectorHealth(user) && user.role !== "developer") {
      requireRoles(user, ["administrator"]);
    }
    const { developerId } = await resolveDeviceDeveloper(
      user.organizationId,
      id,
    );
    if (user.role === "developer" && user.developerId !== developerId) {
      throw new ForbiddenException("role_forbidden");
    }
    const rows = await db
      .select()
      .from(connectorHealth)
      .where(eq(connectorHealth.deviceId, id));
    const row = rows[0];
    if (!row) return { status: "offline", coverageWarning: true, developerId };
    if (row.organizationId !== user.organizationId) {
      throw new ForbiddenException("org_mismatch");
    }
    const stale =
      !row.lastHeartbeat ||
      Date.now() - row.lastHeartbeat.getTime() > 5 * 60 * 1000;
    return {
      ...row,
      developerId,
      status: stale ? "stale" : row.paused ? "paused" : "online",
      coverageWarning: stale || row.paused === 1,
    };
  }

  @Post(":id/pause")
  @UseGuards(DashboardAuthGuard)
  async pause(@Param("id") id: string, @Req() req: FastifyRequest) {
    return this.setPaused(id, req, true);
  }

  @Post(":id/resume")
  @UseGuards(DashboardAuthGuard)
  async resume(@Param("id") id: string, @Req() req: FastifyRequest) {
    return this.setPaused(id, req, false);
  }

  private async setPaused(
    id: string,
    req: FastifyRequest,
    paused: boolean,
  ) {
    const user = userFromRequest(req);
    const resolved = await resolveDeviceDeveloper(user.organizationId, id);
    if (resolved.organizationId !== user.organizationId) {
      throw new ForbiddenException("org_mismatch");
    }
    if (!canPauseConnector(user, resolved.developerId)) {
      throw new ForbiddenException("role_forbidden");
    }

    await db
      .update(connectorHealth)
      .set({ paused: paused ? 1 : 0 })
      .where(eq(connectorHealth.deviceId, id));

    const gapEvent = {
      event_id: randomUUID(),
      schema_version: "1.0.0" as const,
      organization_id: user.organizationId,
      developer_id: resolved.developerId,
      device_id: id,
      provider: "api",
      connector_version: "0.1.0",
      event_type: paused
        ? EventTypes.telemetry_gap_started
        : EventTypes.telemetry_gap_ended,
      occurred_at: new Date().toISOString(),
      consent_version: "1",
      metadata: paused
        ? { gap_reason: "paused" as const, connector_paused: true }
        : { connector_paused: false },
    };

    await ingestBatch(user.organizationId, { events: [gapEvent] }, id);

    await db.insert(auditLog).values({
      organizationId: user.organizationId,
      actorId: user.id,
      action: paused ? "connector.pause" : "connector.resume",
      detail: { deviceId: id, developerId: resolved.developerId },
      createdAt: new Date(),
    });
    return { paused, coverageGap: paused };
  }
}
