import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { verifyDeviceToken } from "@techlio/server-core";
import { ingestBatch } from "./services/ingest.js";
import { DEV_ORG } from "./constants.js";

@Controller("v1/events")
export class EventsController {
  @Post("batch")
  async batch(
    @Headers("authorization") auth: string | undefined,
    @Headers("x-device-id") deviceHeader: string | undefined,
    @Body() body: unknown,
  ) {
    if (!auth?.startsWith("Bearer ")) {
      throw new UnauthorizedException();
    }
    const token = auth.slice(7);
    const events = (body as { events?: { device_id?: string; organization_id?: string }[] })
      ?.events;
    const deviceId = deviceHeader ?? events?.[0]?.device_id;
    if (!deviceId) throw new UnauthorizedException("device_required");

    const verified = await verifyDeviceToken(deviceId, token);
    if (!verified.ok) throw new UnauthorizedException("invalid_token");

    const orgId = events?.[0]?.organization_id ?? verified.organizationId ?? DEV_ORG;
    if (orgId !== verified.organizationId) {
      throw new UnauthorizedException("org_mismatch");
    }

    return ingestBatch(orgId, body, deviceId);
  }

  @Post("timesheet")
  @HttpCode(404)
  rejectTimesheet() {
    return { error: "timesheet_import_not_supported", statusCode: 404 };
  }
}
