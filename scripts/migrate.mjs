#!/usr/bin/env node
/**
 * Applies every infra/sql/*.sql file in filename order exactly once.
 * Tracked in schema_migrations so repeated runs are cheap and safe.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sqlDir = join(root, "infra", "sql");

function resolveMigrateUrl() {
  return (
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    "postgres://techlio:techlio@localhost:5432/techlio_activity"
  );
}

const pool = new pg.Pool({
  connectionString: resolveMigrateUrl(),
});

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const { rows } = await pool.query("SELECT name FROM schema_migrations");
  const applied = new Set(rows.map((r) => r.name));

  const files = readdirSync(sqlDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(sqlDir, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [
        file,
      ]);
      await client.query("COMMIT");
      console.log(`  applied ${file}`);
      ran++;
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`  FAILED  ${file}\n${err.message}`);
      process.exitCode = 1;
      return;
    } finally {
      client.release();
    }
  }

  console.log(
    ran === 0
      ? `Schema up to date (${files.length} migrations).`
      : `Applied ${ran} migration(s).`,
  );
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
