import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

/**
 * Schema is owned by `infra/sql/*.sql` and applied with `pnpm db:migrate`.
 * The runtime never creates tables on boot.
 */
export function resolveDatabaseConnectionString(): string {
  const fromEnv =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL;
  if (fromEnv) return fromEnv;
  if (process.env.VERCEL) {
    throw new Error(
      "DATABASE_URL or POSTGRES_URL is missing on Vercel. Link Neon to project tracking-app-api and redeploy.",
    );
  }
  return "postgres://techlio:techlio@localhost:5432/techlio_activity";
}

export const pool = new pg.Pool({
  connectionString: resolveDatabaseConnectionString(),
});

export const db = drizzle(pool, { schema });

export async function isDatabaseReady(): Promise<boolean> {
  try {
    await pool.query("SELECT 1 FROM employees LIMIT 1");
    return true;
  } catch {
    return false;
  }
}
