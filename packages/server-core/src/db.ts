import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgres://techlio:techlio@localhost:5432/techlio_activity",
});

pool.query(`ALTER TABLE connector_health ADD COLUMN IF NOT EXISTS provider TEXT`).catch(() => {
  /* table may not exist yet on first boot */
});

export const db = drizzle(pool, { schema });
