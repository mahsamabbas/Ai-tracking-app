import {
  Controller,
  Get,
  Param,
  Query,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import {
  canViewActivityEvents,
  canViewDeveloper,
  canViewTeam,
  db,
  connectorHealth,
  hourlySnapshots,
  agentSessions,
  getHourlySnapshotDetail,
  getOrgPolicy,
  listOrgDevices,
  listPortalUsers,
} from "@techlio/server-core";
import { and, desc, eq, isNull } from "drizzle-orm";
import { listRecentEvents } from "./services/ingest.js";
import { DEV_DEVELOPER } from "./constants.js";
import { DashboardAuthGuard, userFromRequest, requireRoles } from "./auth/guards.js";
import type { FastifyRequest } from "fastify";
import { Req } from "@nestjs/common";

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
    requireRoles(user, ["administrator", "manager", "developer", "auditor"]);

    const requestedDeveloperId =
      user.role === "developer"
        ? user.developerId ?? DEV_DEVELOPER
        : canViewTeam(user) && developerId
          ? developerId
          : undefined;

    if (
      requestedDeveloperId &&
      user.role === "developer" &&
      !canViewDeveloper(user, requestedDeveloperId)
    ) {
      throw new UnauthorizedException();
    }

    try {
      const health = await db
        .select()
        .from(connectorHealth)
        .where(eq(connectorHealth.organizationId, user.organizationId));

      const deviceRows = await listOrgDevices(user.organizationId).catch(
        () => [],
      );
      const members = await listPortalUsers(user.organizationId).catch(() => []);

      const deviceToDeveloper = new Map(
        deviceRows.map((d) => [d.id, d.developerId]),
      );
      const nameByDeveloper = new Map<string, string>();
      for (const m of members) {
        if (m.developerId) nameByDeveloper.set(m.developerId, m.displayName);
      }

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
          .limit(40);
      } catch {
        sessions = [];
      }

      const includeEvents = canViewActivityEvents(user);
      const pool = includeEvents
        ? await listRecentEvents(user.organizationId, 200, {
            developerId: requestedDeveloperId,
          })
        : [];
      const events = includeEvents
        ? await listRecentEvents(user.organizationId, 50, {
            developerId: requestedDeveloperId,
            eventType,
            provider,
          })
        : [];

      const hourStart = currentHourStartUtc();
      const hourEnd = new Date(hourStart.getTime() + 3600_000);

      const developerIds = new Set<string>();
      for (const m of members) {
        if (m.role === "developer" && m.developerId) {
          developerIds.add(m.developerId);
        }
      }
      for (const d of deviceRows) developerIds.add(d.developerId);
      for (const h of health) {
        developerIds.add(deviceToDeveloper.get(h.deviceId) ?? DEV_DEVELOPER);
      }

      const developers = [...developerIds]
        .filter((id) => {
          if (user.role === "developer") return id === requestedDeveloperId;
          if (requestedDeveloperId) return id === requestedDeveloperId;
          return true;
        })
        .map((devId) => {
          const deviceIds = deviceRows
            .filter((d) => d.developerId === devId)
            .map((d) => d.id);
          const healthRows = health.filter((h) => {
            const mapped = deviceToDeveloper.get(h.deviceId) ?? DEV_DEVELOPER;
            return mapped === devId;
          });
          const h = healthRows[0];
          const primaryDevice = h?.deviceId ?? deviceIds[0] ?? null;
          const deviceEvents = pool.filter(
            (e) =>
              e.developer_id === devId ||
              (primaryDevice && e.device_id === primaryDevice),
          );
          const lastEvent = deviceEvents[0]?.occurred_at ?? null;
          const eventsThisHour = deviceEvents.filter((e) => {
            const t = new Date(e.occurred_at).getTime();
            return t >= hourStart.getTime() && t < hourEnd.getTime();
          }).length;
          const session =
            sessions.find(
              (s) =>
                s.developerId === devId ||
                (primaryDevice && s.deviceId === primaryDevice),
            ) ?? null;
          const paused = h?.paused === 1;
          const hasHeartbeat = Boolean(h?.lastHeartbeat);
          const stale =
            hasHeartbeat &&
            Date.now() - h!.lastHeartbeat!.getTime() > 5 * 60_000;
          const connectorState = paused
            ? "paused"
            : !hasHeartbeat
              ? "offline"
              : stale
                ? "stale"
                : "online";
          return {
            developerId: devId,
            displayName: nameByDeveloper.get(devId) ?? "Developer",
            deviceId: primaryDevice,
            provider: h?.provider ?? null,
            connectorVersion: h?.version ?? null,
            lastHeartbeat: h?.lastHeartbeat ?? null,
            lastEventAt: lastEvent,
            eventsThisHour,
            queueDepth: h?.queueDepth ?? null,
            paused,
            coverageWarning: paused || !hasHeartbeat || stale,
            connectorState,
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

      const healthScoped = health.filter((h) => {
        const mapped = deviceToDeveloper.get(h.deviceId) ?? DEV_DEVELOPER;
        if (user.role === "developer") return mapped === requestedDeveloperId;
        if (requestedDeveloperId) return mapped === requestedDeveloperId;
        return true;
      });

      const alerts: {
        severity: "info" | "warning" | "error";
        code: string;
        message: string;
        deviceId?: string;
        developerId?: string;
      }[] = [];

      for (const d of developers) {
        if (d.connectorState === "offline") {
          alerts.push({
            severity: "warning",
            code: "stale_connector",
            message:
              "Connector offline — no heartbeat recorded. Missing telemetry is not inactivity.",
            deviceId: d.deviceId ?? undefined,
            developerId: d.developerId,
          });
        }
        if (d.connectorState === "stale") {
          alerts.push({
            severity: "warning",
            code: "stale_connector",
            message:
              "Connector heartbeat missing — activity may be incomplete (coverage gap).",
            deviceId: d.deviceId ?? undefined,
            developerId: d.developerId,
          });
        }
        if (d.paused) {
          alerts.push({
            severity: "info",
            code: "collection_paused",
            message: "Collection is paused; this is not developer inactivity.",
            deviceId: d.deviceId ?? undefined,
            developerId: d.developerId,
          });
        }
        if (d.currentSession?.unassigned) {
          alerts.push({
            severity: "info",
            code: "unassigned_session",
            message: "Active session has no project/work item context.",
            deviceId: d.deviceId ?? undefined,
            developerId: d.developerId,
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
          code:
            g.event_type === "upload_failed"
              ? "upload_failed"
              : "coverage_gap",
          message: `Coverage gap recorded (${g.event_type}).`,
          deviceId: g.device_id,
        });
      }

      const showTeam =
        user.role === "manager" ||
        user.role === "administrator" ||
        user.role === "auditor";

      return {
        connectors: healthScoped,
        developers: showTeam || user.role === "developer" ? developers : [],
        alerts,
        recentEvents: events,
        policy: getOrgPolicy(),
        viewer: {
          id: user.id,
          displayName: user.displayName,
          role: user.role,
          email: user.email,
          developerId: user.developerId ?? null,
        },
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
        viewer: {
          id: user.id,
          displayName: user.displayName,
          role: user.role,
          email: user.email,
          developerId: user.developerId ?? null,
        },
      };
    }
  }

  @Get("developers/:id/timeline")
  @UseGuards(DashboardAuthGuard)
  async timeline(
    @Param("id") developerId: string,
    @Req() req: FastifyRequest,
  ) {
    const user = userFromRequest(req);
    if (!canViewDeveloper(user, developerId)) {
      throw new UnauthorizedException();
    }
    const snapshots = await db
      .select()
      .from(hourlySnapshots)
      .where(
        and(
          eq(hourlySnapshots.developerId, developerId),
          eq(hourlySnapshots.organizationId, user.organizationId),
        ),
      )
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
