import { Module } from "@nestjs/common";
import { EventsController } from "./events.controller.js";
import { DashboardController } from "./dashboard.controller.js";
import { ConnectorsController } from "./connectors.controller.js";

@Module({
  controllers: [EventsController, DashboardController, ConnectorsController],
})
export class AppModule {}
