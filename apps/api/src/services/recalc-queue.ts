import { setLateRecalcHandler } from "@techlio/server-core";
import { Queue } from "bullmq";

let initialized = false;

export function initRecalcQueue(): void {
  if (initialized) return;
  initialized = true;
  const connection = {
    host: process.env.REDIS_HOST ?? "localhost",
    port: Number(process.env.REDIS_PORT ?? 6379),
  };
  const queue = new Queue("hourly-recalc", { connection });
  setLateRecalcHandler((job) => {
    void queue.add("recalc", job);
  });
}
