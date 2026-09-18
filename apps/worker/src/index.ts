import { Queue, Worker } from "bullmq";
import {
  finalizeHourForDeveloper,
  purgeEventsOlderThan,
} from "@techlio/server-core";

const connection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
};

const ORG = "550e8400-e29b-41d4-a716-446655440010";
const DEV = "550e8400-e29b-41d4-a716-446655440011";
const RETENTION_DAYS = Number(process.env.RETENTION_DAYS ?? 90);

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
    const id = await finalizeHourForDeveloper(ORG, DEV, hour, 1);
    console.log("Finalized hour", hour.toISOString(), id);
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
    const id = await finalizeHourForDeveloper(
      ORG,
      DEV,
      new Date(hour),
      version,
      reason,
    );
    console.log("Recalculated hour", hour, "v", version, id);
  },
  { connection },
);

async function runRetention(): Promise<void> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  try {
    const count = await purgeEventsOlderThan(ORG, cutoff);
    if (count > 0) console.log("Retention purged", count, "events");
  } catch (err) {
    console.warn("Retention job skipped", err);
  }
}

setInterval(() => void runRetention(), 24 * 60 * 60 * 1000);

scheduleNextHourly();
console.log("Worker started (hourly finalize, recalc, retention)");
