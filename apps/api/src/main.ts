import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app.module.js";
import { initRecalcQueue } from "./services/recalc-queue.js";
import { seedPortalUsers, startDemoConnectorKeepalive } from "@techlio/server-core";

async function bootstrap() {
  initRecalcQueue();
  await seedPortalUsers();
  startDemoConnectorKeepalive(); // live-only unless DEMO_CONNECTOR_KEEPALIVE=1
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  app.enableCors();
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, "0.0.0.0");
}

bootstrap();
