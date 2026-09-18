import { Queue, Worker } from "bullmq";
import { finalizeHourForDeveloper } from "@techlio/server-core";

const connection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
};

const ORG = "550e8400-e29b-41d4-a716-446655440010";
const DEV = "550e8400-e29b-41d4-a716-446655440011";

const hourlyQueue = new Queue("hourly-finalize", { connection });

function scheduleNextHourly() {
  const now = new Date();
  const next = new Date(now);
  next.setUTCMinutes(5, 0, 0);
  if (next <= now) next.setUTCHours(next.getUTCHours() + 1);
  const delay = next.getTime() - now.getTime();
  setTimeout(async () => {
    const hour = new Date();
    hour.setUTCHours(hour.getUTCHours() - 1, 0, 0, 0);
    await hourlyQueue.add("finalize", { hour: hour.toISOString() });
    scheduleNextHourly();
  }, delay);
}

new Worker(
  "hourly-finalize",
  async (job) => {
    const hour = new Date(job.data.hour as string);
    await finalizeHourForDeveloper(ORG, DEV, hour, 1);
    console.log("Finalized hour", hour.toISOString());
  },
  { connection },
);

new Worker(
  "hourly-recalc",
  async (job) => {
    const { hour, version, reason } = job.data as {
      hour: string;
      version: number;
      reason: string;
    };
    await finalizeHourForDeveloper(
      ORG,
      DEV,
      new Date(hour),
      version,
      reason,
    );
  },
  { connection },
);

scheduleNextHourly();
console.log("Worker started");
