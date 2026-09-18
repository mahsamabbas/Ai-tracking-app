import { Body, Controller, Headers, Post, UnauthorizedException } from "@nestjs/common";
import { ingestBatch } from "./services/ingest.js";

const DEV_ORG = "550e8400-e29b-41d4-a716-446655440010";

@Controller("v1/events")
export class EventsController {
  @Post("batch")
  async batch(
    @Headers("authorization") auth: string | undefined,
    @Body() body: unknown,
  ) {
    if (!auth?.startsWith("Bearer ")) {
      throw new UnauthorizedException();
    }
    const token = auth.slice(7);
    if (token !== "dev-device-token" && token.length < 8) {
      throw new UnauthorizedException();
    }
    return ingestBatch(DEV_ORG, body);
  }

  @Post("timesheet")
  rejectTimesheet() {
    return { error: "timesheet_import_not_supported", statusCode: 404 };
  }
}
