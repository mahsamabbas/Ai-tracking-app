#!/usr/bin/env node
/**
 * Builds downloadable connector executables (Windows and macOS).
 * Double-click installs a background service. No Node.js install required.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const downloads = join(root, "apps/web/public/downloads");
const out = join(downloads, "build");

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const bundle = join(out, "techlio.cjs");
const built = spawnSync(
  "npx",
  [
    "--yes",
    "esbuild@0.25.0",
    join(root, "apps/connector/src/launcher.ts"),
    "--bundle",
    "--platform=node",
    "--format=cjs",
    "--target=node20",
    `--outfile=${bundle}`,
  ],
  { cwd: root, stdio: "inherit" },
);
if (built.status !== 0) process.exit(built.status ?? 1);

const targets = [
  ["bun-darwin-x64", "techlio-connector-macos-x64"],
  ["bun-darwin-arm64", "techlio-connector-macos-arm64"],
  ["bun-windows-x64", "techlio-connector-win-x64.exe"],
];
for (const [target, name] of targets) {
  const compiled = spawnSync(
    "bun",
    [
      "build",
      "--compile",
      `--target=${target}`,
      `--outfile=${join(downloads, name)}`,
      bundle,
    ],
    { cwd: root, stdio: "inherit" },
  );
  if (compiled.status !== 0) {
    console.error(`Failed to build ${name}`);
    process.exit(compiled.status ?? 1);
  }
}

const extBuild = spawnSync("pnpm", ["--filter", "techlio-activity-companion", "run", "build"], {
  cwd: root,
  stdio: "inherit",
});
if (extBuild.status === 0) {
  const vsix = spawnSync(
    "npx",
    ["--yes", "@vscode/vsce", "package", "--no-dependencies", "--allow-missing-repository", "-o", join(downloads, "techlio-companion.vsix")],
    { cwd: join(root, "apps/extension"), stdio: "inherit" },
  );
  if (vsix.status !== 0) console.warn("Companion extension package failed; the connector executable is still usable.");
}

console.log("Executables are in", downloads);
