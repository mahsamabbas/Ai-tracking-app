#!/usr/bin/env node
/** Copy repo-root .env.production.api → apps/api/.env.local if it has a real postgres URL. */
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, ".env.production.api");
const dst = join(root, "apps/api/.env.local");
const dstProd = join(root, "apps/api/.env.production.local");

if (!existsSync(src)) {
  console.log("No .env.production.api at repo root — skip");
  process.exit(0);
}
const text = readFileSync(src, "utf8");
if (text.includes("[SENSITIVE]")) {
  console.log(".env.production.api still has [SENSITIVE] — cannot restore");
  process.exit(1);
}
if (!/postgres(ql)?:\/\//i.test(text)) {
  console.log(".env.production.api has no postgres:// URL — cannot restore");
  process.exit(1);
}
copyFileSync(src, dst);
copyFileSync(src, dstProd);
console.log("Restored apps/api/.env.local and .env.production.local from .env.production.api");
