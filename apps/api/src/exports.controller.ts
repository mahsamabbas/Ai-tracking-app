import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
  createActivityExport,
  getActivityExport,
} from "@techlio/server-core";
import { DashboardAuthGuard, requireRoles, userFromRequest } from "./auth/guards.js";

@Controller("v1/activity-exports")
@UseGuards(DashboardAuthGuard)
export class ExportsController {
  @Post()
  async create(
    @Req() req: FastifyRequest,
    @Body()
    body: {
      format?: "csv" | "pdf";
      developerId?: string;
      from?: string;
      to?: string;
    },
  ) {
    const user = userFromRequest(req);
    requireRoles(user, ["administrator", "manager", "auditor"]);
    const result = await createActivityExport({
      organizationId: user.organizationId,
      requestedBy: user.id,
      format: body.format ?? "csv",
      developerId: body.developerId,
      from: body.from ? new Date(body.from) : undefined,
      to: body.to ? new Date(body.to) : undefined,
    });
    return result;
  }

  @Get(":id")
  async download(
    @Param("id") id: string,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    const user = userFromRequest(req);
    requireRoles(user, ["administrator", "manager", "auditor"]);
    const file = await getActivityExport(user.organizationId, id);
    if (!file) {
      reply.status(404).send({ error: "not_found" });
      return;
    }
    const type =
      file.format === "csv"
        ? "text/csv; charset=utf-8"
        : "text/plain; charset=utf-8";
    reply
      .header("Content-Type", type)
      .header(
        "Content-Disposition",
        `attachment; filename="activity-export-${id}.${file.format}"`,
      )
      .send(file.content);
  }
}
