#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function check(path, needPostgres) {
  if (!existsSync(path)) {
    console.log(`  MISSING  ${path}`);
    return false;
  }
  const text = readFileSync(path, "utf8");
  if (text.includes("[SENSITIVE]")) {
    console.log(`  BAD      ${path}  (literal [SENSITIVE] — re-run in Terminal.app)`);
    return false;
  }
  if (needPostgres && !/postgres(ql)?:\/\//i.test(text)) {
    console.log(`  BAD      ${path}  (no postgres:// URL)`);
    return false;
  }
  console.log(`  OK       ${path}`);
  return true;
}

let ok = true;
console.log("API:");
ok = check(join(root, "apps/api/.env.local"), true) && ok;
ok = check(join(root, "apps/api/.env.production.local"), true) && ok;
console.log("Web:");
ok = check(join(root, "apps/web/.env.local"), false) && ok;
if (existsSync(join(root, "apps/web/.env.local"))) {
  const w = readFileSync(join(root, "apps/web/.env.local"), "utf8");
  if (!w.includes("NEXT_PUBLIC_API_URL")) {
    console.log("  WARN     apps/web/.env.local missing NEXT_PUBLIC_API_URL");
    ok = false;
  }
}
process.exit(ok ? 0 : 1);
