import { Controller, Get, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { listRecentEvents } from "./services/ingest.js";
import { DEV_ORG } from "./constants.js";

@Controller("v1/stream")
export class StreamController {
  @Get("sse")
  async sse(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const send = async () => {
      try {
        const events = await listRecentEvents(DEV_ORG, 10);
        const payload = JSON.stringify({
          at: new Date().toISOString(),
          recentCount: events.length,
          latestType: events[0]?.event_type ?? null,
        });
        reply.raw.write(`data: ${payload}\n\n`);
      } catch {
        reply.raw.write(
          `data: ${JSON.stringify({ at: new Date().toISOString(), error: "db_unavailable" })}\n\n`,
        );
      }
    };

    await send();
    const interval = setInterval(() => void send(), 15_000);
    req.raw.on("close", () => clearInterval(interval));
  }
}
