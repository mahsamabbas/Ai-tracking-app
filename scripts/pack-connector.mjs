#!/usr/bin/env node
/**
 * Builds a standalone connector zip for the dashboard download.
 * Users only need Node.js — not this git repo.
 */
import { execSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, cpSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "apps/web/public/downloads/techlio-connector");
const zipPath = join(root, "apps/web/public/downloads/techlio-connector.zip");

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const built = spawnSync(
  "npx",
  [
    "--yes",
    "esbuild@0.25.0",
    join(root, "apps/connector/src/index.ts"),
    "--bundle",
    "--platform=node",
    "--format=esm",
    "--target=node20",
    `--outfile=${join(out, "agent.mjs")}`,
    "--external:better-sqlite3",
    "--banner:js=import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  ],
  { cwd: root, stdio: "inherit" },
);
if (built.status !== 0) process.exit(built.status ?? 1);

writeFileSync(
  join(out, "package.json"),
  JSON.stringify(
    {
      name: "techlio-connector",
      private: true,
      type: "module",
      dependencies: { "better-sqlite3": "11.7.0" },
    },
    null,
    2,
  ),
);

writeFileSync(
  join(out, ".env.example"),
  `TECHLIO_API_URL=https://tracking-app-api-three.vercel.app
TECHLIO_DASHBOARD_ORIGINS=https://tracking-app-api-t9yd.vercel.app
CONNECTOR_PORT=9477
CONNECTOR_DB=
`,
);

writeFileSync(
  join(out, "run.sh"),
  `#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
export CONNECTOR_DB="\${CONNECTOR_DB:-$HOME/.techlio-connector/queue.db}"
mkdir -p "$(dirname "$CONNECTOR_DB")"
exec node agent.mjs
`,
);

writeFileSync(
  join(out, "run.ps1"),
  `$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
if (Test-Path .env) {
  Get-Content .env | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $eq = $line.IndexOf("=")
    if ($eq -lt 1) { return }
    $key = $line.Substring(0, $eq).Trim()
    $val = $line.Substring($eq + 1).Trim().Trim('"')
    if ($key) { Set-Item -Path "env:$key" -Value $val }
  }
}
if (-not $env:CONNECTOR_DB) {
  $env:CONNECTOR_DB = Join-Path $env:USERPROFILE ".techlio-connector\\queue.db"
}
New-Item -ItemType Directory -Force -Path (Split-Path $env:CONNECTOR_DB) | Out-Null
node agent.mjs
`,
);

const downloads = dirname(zipPath);
rmSync(zipPath, { force: true });
execSync(`cd "${downloads}" && zip -qr techlio-connector.zip techlio-connector`, {
  stdio: "inherit",
});
cpSync(join(out, "agent.mjs"), join(downloads, "agent.mjs"));
console.log("Wrote", zipPath);
