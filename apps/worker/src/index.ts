import { Queue, Worker } from "bullmq";
import {
  finalizeHourForDeveloper,
  ingestBatch,
  purgeEventsOlderThan,
} from "@techlio/server-core";
import {
  analyticsRowToEvent,
  copilotRowToEvent,
  cursorRowToEvent,
  downloadCopilotUsersReport,
  fetchCopilotUsersReportUrl,
  fetchCursorDailyUsage,
  fetchCursorTeamAgentEdits,
  fetchCursorTeamDau,
  fetchCursorUserAgentEdits,
  parseCopilotUserDayReport,
} from "@techlio/puller";

const connection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
};

const ORG = "550e8400-e29b-41d4-a716-446655440010";
const DEV = "550e8400-e29b-41d4-a716-446655440011";
const DEVICE = "550e8400-e29b-41d4-a716-446655440012";
const RETENTION_DAYS = Number(process.env.RETENTION_DAYS ?? 90);
const CURSOR_API_KEY = process.env.CURSOR_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? process.env.GITHUB_COPILOT_TOKEN;
const GITHUB_ORG = process.env.GITHUB_ORG;

const pullCtx = {
  organizationId: ORG,
  developerId: DEV,
  deviceId: DEVICE,
  connectorVersion: "0.1.0",
  consentVersion: "1",
};

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

async function pullCursorTierB(): Promise<void> {
  if (!CURSOR_API_KEY) {
    console.log(
      "Cursor Tier B puller idle — set CURSOR_API_KEY for Admin + Analytics APIs",
    );
    return;
  }
  const end = Date.now();
  const start = end - 24 * 60 * 60 * 1000;
  const events: ReturnType<typeof cursorRowToEvent>[] = [];

  try {
    const rows = await fetchCursorDailyUsage(CURSOR_API_KEY, start, end);
    events.push(...rows.map((row) => cursorRowToEvent(row, pullCtx)));
  } catch (err) {
    console.warn("Cursor daily-usage-data pull failed", err);
  }

  try {
    const dau = await fetchCursorTeamDau(CURSOR_API_KEY, "7d", "now");
    for (const row of dau) {
      events.push(analyticsRowToEvent(row, "team_dau", pullCtx));
    }
  } catch (err) {
    console.warn("Cursor analytics DAU pull failed", err);
  }

  try {
    const edits = await fetchCursorTeamAgentEdits(CURSOR_API_KEY, "7d", "now");
    for (const row of edits) {
      events.push(analyticsRowToEvent(row, "team_agent_edits", pullCtx));
    }
  } catch (err) {
    console.warn("Cursor analytics agent-edits pull failed", err);
  }

  try {
    const byUser = await fetchCursorUserAgentEdits(CURSOR_API_KEY, "7d", "now");
    for (const row of byUser) {
      events.push(analyticsRowToEvent(row, "user_agent_edits", pullCtx));
    }
  } catch (err) {
    console.warn("Cursor by-user agent-edits pull failed", err);
  }

  if (events.length === 0) return;
  const result = await ingestBatch(ORG, { events });
  console.log("Cursor Tier B pull", { events: events.length, ...result });
}

async function pullCopilotTierB(): Promise<void> {
  if (!GITHUB_TOKEN || !GITHUB_ORG) {
    console.log(
      "Copilot Tier B puller idle — set GITHUB_TOKEN and GITHUB_ORG",
    );
    return;
  }
  const day = new Date();
  day.setUTCDate(day.getUTCDate() - 1);
  const dayStr = day.toISOString().slice(0, 10);
  try {
    const url = await fetchCopilotUsersReportUrl(
      GITHUB_TOKEN,
      GITHUB_ORG,
      dayStr,
    );
    if (!url) {
      console.warn("Copilot report URL not available for", dayStr);
      return;
    }
    const text = await downloadCopilotUsersReport(url);
    const rows = parseCopilotUserDayReport(text);
    const events = rows.map((row) => copilotRowToEvent(row, pullCtx));
    if (events.length === 0) return;
    const result = await ingestBatch(ORG, { events });
    console.log("Copilot Tier B pull", { events: events.length, ...result });
  } catch (err) {
    console.warn("Copilot pull failed", err);
  }
}

async function pullAllTierB(): Promise<void> {
  await pullCursorTierB();
  await pullCopilotTierB();
}

void pullAllTierB();
setInterval(() => void pullAllTierB(), 60 * 60 * 1000);

scheduleNextHourly();
console.log(
  "Worker started (hourly finalize, recalc, retention, Cursor + Copilot Tier B)",
);
