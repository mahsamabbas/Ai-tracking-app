import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { db, projects, workItems } from "@techlio/server-core";
import { eq, and } from "drizzle-orm";
import { DashboardAuthGuard, userFromRequest } from "./auth/guards.js";
import type { FastifyRequest } from "fastify";

@Controller("v1")
@UseGuards(DashboardAuthGuard)
export class ProjectsController {
  @Get("projects")
  async listProjects(@Req() req: FastifyRequest) {
    const user = userFromRequest(req);
    const rows = await db
      .select()
      .from(projects)
      .where(eq(projects.organizationId, user.organizationId));
    return { projects: rows };
  }

  @Get("work-items")
  async listWorkItems(
    @Req() req: FastifyRequest,
    @Query("q") q?: string,
    @Query("projectId") projectId?: string,
  ) {
    const user = userFromRequest(req);
    const conditions = [eq(workItems.organizationId, user.organizationId)];
    if (projectId) conditions.push(eq(workItems.projectId, projectId));
    let rows = await db
      .select()
      .from(workItems)
      .where(and(...conditions));
    if (q) {
      const needle = q.toLowerCase();
      rows = rows.filter((r) => r.title.toLowerCase().includes(needle));
    }
    return { workItems: rows };
  }
}
