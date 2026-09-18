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
import { DEV_DEVELOPER, DEV_ORG } from "./constants.js";

function currentHourStartUtc(now = new Date()): Date {
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
    ),
  );
}
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

      const pool = await listRecentEvents(user.organizationId, 200);
      const events = await listRecentEvents(user.organizationId, 50, {
        developerId,
        eventType,
        provider,
      });

      const hourStart = currentHourStartUtc();
      const hourEnd = new Date(hourStart.getTime() + 3600_000);

      const developers = health.map((h) => {
        const deviceEvents = pool.filter((e) => e.device_id === h.deviceId);
        const lastEvent = deviceEvents[0]?.occurred_at ?? null;
        const eventsThisHour = deviceEvents.filter((e) => {
          const t = new Date(e.occurred_at).getTime();
          return t >= hourStart.getTime() && t < hourEnd.getTime();
        }).length;
        const session =
          sessions.find((s) => s.deviceId === h.deviceId) ?? null;
        const stale =
          !h.lastHeartbeat ||
          Date.now() - h.lastHeartbeat.getTime() > 5 * 60 * 1000;
        const paused = h.paused === 1;
        return {
          developerId: DEV_DEVELOPER,
          deviceId: h.deviceId,
          provider: h.provider,
          connectorVersion: h.version,
          lastHeartbeat: h.lastHeartbeat,
          lastEventAt: lastEvent,
          eventsThisHour,
          queueDepth: h.queueDepth,
          paused,
          coverageWarning: paused || stale,
          connectorState: paused
            ? "paused"
            : stale
              ? "stale"
              : "online",
          currentSession: session
            ? {
                sessionId: session.id,
                startedAt: session.startedAt,
                projectId: session.projectId,
                workItemId: session.workItemId,
                unassigned: session.unassigned,
              }
            : null,
        };
      });

      const alerts: {
        severity: "info" | "warning" | "error";
        code: string;
        message: string;
        deviceId?: string;
      }[] = [];

      for (const d of developers) {
        if (d.connectorState === "stale") {
          alerts.push({
            severity: "warning",
            code: "stale_connector",
            message:
              "Connector heartbeat missing — activity may be incomplete (coverage gap).",
            deviceId: d.deviceId,
          });
        }
        if (d.paused) {
          alerts.push({
            severity: "info",
            code: "collection_paused",
            message: "Collection is paused; this is not developer inactivity.",
            deviceId: d.deviceId,
          });
        }
        if (d.currentSession?.unassigned) {
          alerts.push({
            severity: "info",
            code: "unassigned_session",
            message: "Active session has no project/work item context.",
            deviceId: d.deviceId,
          });
        }
      }

      const gapEvents = pool.filter(
        (e) =>
          e.event_type === "telemetry_gap_started" ||
          e.event_type === "upload_failed",
      );
      for (const g of gapEvents.slice(0, 3)) {
        alerts.push({
          severity: "warning",
          code: "coverage_gap",
          message: `Coverage gap recorded (${g.event_type}).`,
          deviceId: g.device_id,
        });
      }

      return {
        connectors: health,
        developers,
        alerts,
        recentEvents: events,
        dbAvailable: true,
      };
    } catch {
      return {
        connectors: [],
        developers: [],
        alerts: [],
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
