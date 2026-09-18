import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

/**
 * Schema is owned by `infra/sql/*.sql` and applied with `pnpm db:migrate`.
 * The runtime never creates tables on boot.
 */
export const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgres://techlio:techlio@localhost:5432/techlio_activity",
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
