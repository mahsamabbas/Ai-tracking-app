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
pool.query(`
  CREATE TABLE IF NOT EXISTS portal_users (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL,
    developer_id UUID
  )
`).catch(() => {});
pool.query(`
  CREATE TABLE IF NOT EXISTS activity_exports (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    requested_by UUID,
    format TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ready',
    content TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`).catch(() => {});

export const db = drizzle(pool, { schema });
