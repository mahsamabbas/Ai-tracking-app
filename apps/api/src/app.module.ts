import { Module } from "@nestjs/common";
import { EventsController } from "./events.controller.js";
import { DashboardController } from "./dashboard.controller.js";
import { ConnectorsController } from "./connectors.controller.js";
import { ProjectsController } from "./projects.controller.js";
import { SessionsController } from "./sessions.controller.js";
import { ExportsController } from "./exports.controller.js";
import { StreamController } from "./stream.controller.js";
import { AuthController } from "./auth/auth.controller.js";
import { OrgController } from "./org.controller.js";

@Module({
  controllers: [
    AuthController,
    OrgController,
    EventsController,
    DashboardController,
    ConnectorsController,
    ProjectsController,
    SessionsController,
    ExportsController,
    StreamController,
  ],
})
export class AppModule {}
