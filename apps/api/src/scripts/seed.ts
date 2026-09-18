import { pool, seedDemoOrganization } from "@techlio/server-core";

const days = Number(process.env.SEED_DAYS ?? 90);

seedDemoOrganization({ days })
  .then((r) => {
    console.log(
      `Seeded ${r.employees} employees · ${r.devices} connectors · ${r.sessions} sessions · ${r.events} events · ${r.snapshots} hourly snapshots (${days} days).`,
    );
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => void pool.end());
