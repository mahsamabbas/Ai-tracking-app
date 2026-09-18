import {
  Controller,
  Get,
  Headers,
  Param,
  Query,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { canViewDeveloper, type AuthUser } from "./auth/roles.js";
import {
  db,
  connectorHealth,
  hourlySnapshots,
  agentSessions,
  getHourlySnapshotDetail,
} from "@techlio/server-core";
import { and, desc, eq, isNull } from "drizzle-orm";
import { listRecentEvents } from "./services/ingest.js";
import { DEV_ORG } from "./constants.js";
import { DashboardAuthGuard, userFromRequest, requireRoles } from "./auth/guards.js";
import type { FastifyRequest } from "fastify";
import { Req } from "@nestjs/common";

function userFromHeader(roleHeader?: string): AuthUser {
  const role = (roleHeader ?? "manager") as AuthUser["role"];
  return {
    id: "user-1",
    organizationId: DEV_ORG,
    role,
    developerId: "550e8400-e29b-41d4-a716-446655440011",
  };
}

@Controller("v1")
export class DashboardController {
  @Get("dashboard/team")
  @UseGuards(DashboardAuthGuard)
  async team(
    @Req() req: FastifyRequest,
    @Query("developerId") developerId?: string,
    @Query("eventType") eventType?: string,
    @Query("provider") provider?: string,
  ) {
    const user = userFromRequest(req);
    if (user.role === "developer") {
      requireRoles(user, ["developer"]);
    }
    try {
      const health = await db
        .select()
        .from(connectorHealth)
        .where(eq(connectorHealth.organizationId, user.organizationId));

      let sessions: (typeof agentSessions.$inferSelect)[] = [];
      try {
        sessions = await db
          .select()
          .from(agentSessions)
          .where(
            and(
              eq(agentSessions.organizationId, user.organizationId),
              isNull(agentSessions.endedAt),
            ),
          )
          .limit(20);
      } catch {
        sessions = [];
      }

      const events = await listRecentEvents(user.organizationId, 50, {
        developerId,
        eventType,
        provider,
      });

      const developers = health.map((h) => ({
        deviceId: h.deviceId,
        lastHeartbeat: h.lastHeartbeat,
        queueDepth: h.queueDepth,
        paused: h.paused === 1,
        coverageWarning:
          h.paused === 1 ||
          !h.lastHeartbeat ||
          Date.now() - h.lastHeartbeat.getTime() > 5 * 60 * 1000,
        currentSession: sessions.find((s) => s.deviceId === h.deviceId) ?? null,
      }));

      return {
        connectors: health,
        developers,
        recentEvents: events,
        dbAvailable: true,
      };
    } catch {
      return {
        connectors: [],
        developers: [],
        recentEvents: [],
        dbAvailable: false,
        hint: "Start Docker and run: docker compose up -d postgres redis",
      };
    }
  }

  @Get("developers/:id/timeline")
  @UseGuards(DashboardAuthGuard)
  async timeline(
    @Param("id") developerId: string,
    @Headers("x-role") roleHeader?: string,
  ) {
    const user = userFromHeader(roleHeader);
    if (!canViewDeveloper(user, developerId)) {
      throw new UnauthorizedException();
    }
    const snapshots = await db
      .select()
      .from(hourlySnapshots)
      .where(eq(hourlySnapshots.developerId, developerId))
      .orderBy(desc(hourlySnapshots.hourStart));
    return { hourlyCards: snapshots };
  }

  @Get("hourly-snapshots/:id")
  @UseGuards(DashboardAuthGuard)
  async hourlySnapshot(
    @Param("id") id: string,
    @Req() req: FastifyRequest,
  ) {
    const user = userFromRequest(req);
    const detail = await getHourlySnapshotDetail(user.organizationId, id);
    if (!detail.snapshot) {
      return { error: "not_found" };
    }
    if (!canViewDeveloper(user, detail.snapshot.developerId)) {
      throw new UnauthorizedException();
    }
    return detail;
  }

  @Get("stream")
  stream() {
    return { mode: "sse", url: "/v1/stream/sse" };
  }
}
