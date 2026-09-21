import { Controller, Get } from "@nestjs/common";
import { isDatabaseReady } from "@techlio/server-core";

@Controller("v1")
export class HealthController {
  @Get("health")
  async health() {
    const db = await isDatabaseReady();
    return {
      ok: db,
      service: "techlio-api",
      time: new Date().toISOString(),
    };
  }
}
