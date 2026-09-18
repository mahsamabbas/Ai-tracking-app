import {
  Controller,
  Get,
  Headers,
  Param,
  UnauthorizedException,
} from "@nestjs/common";
import { canViewDeveloper, type AuthUser } from "./auth/roles.js";
import { db, connectorHealth, hourlySnapshots } from "@techlio/server-core";
import { eq } from "drizzle-orm";
import { listRecentEvents } from "./services/ingest.js";

const DEV_ORG = "550e8400-e29b-41d4-a716-446655440010";

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
  async team(@Headers("x-role") roleHeader?: string) {
    const user = userFromHeader(roleHeader);
    const health = await db
      .select()
      .from(connectorHealth)
      .where(eq(connectorHealth.organizationId, user.organizationId));
    const events = await listRecentEvents(user.organizationId, 20);
    return { connectors: health, recentEvents: events };
  }

  @Get("developers/:id/timeline")
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
      .where(eq(hourlySnapshots.developerId, developerId));
    return { hourlyCards: snapshots };
  }

  @Get("stream")
  stream() {
    return { mode: "sse", hint: "Connect to /v1/stream/sse in production" };
  }
}
