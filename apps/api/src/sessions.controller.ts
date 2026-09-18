import {
  Body,
  Controller,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { recordSessionContext } from "@techlio/server-core";
import { canViewDeveloper } from "./auth/roles.js";
import { DashboardAuthGuard, userFromRequest } from "./auth/guards.js";
import { DEV_DEVICE } from "./constants.js";

@Controller("v1/sessions")
@UseGuards(DashboardAuthGuard)
export class SessionsController {
  @Post(":id/context")
  async setContext(
    @Param("id") sessionId: string,
    @Req() req: FastifyRequest,
    @Body()
    body: { projectId?: string; workItemId?: string; label?: string },
  ) {
    const user = userFromRequest(req);
    const developerId = user.developerId!;
    if (!canViewDeveloper(user, developerId)) {
      throw new UnauthorizedException();
    }
    const event = await recordSessionContext({
      organizationId: user.organizationId,
      sessionId,
      projectId: body.projectId,
      workItemId: body.workItemId,
      label: body.label,
      developerId,
      deviceId: DEV_DEVICE,
    });
    return { ok: true, eventId: event.event_id };
  }
}
