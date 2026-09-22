#!/usr/bin/env node
/**
 * Builds downloadable connector executables (Windows and macOS).
 * Double-click starts the local connector. Employees never need this repo.
 */
import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
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
    ["build", "--compile", `--target=${target}`, `--outfile=${join(downloads, name)}`, bundle],
    { cwd: root, stdio: "inherit" },
  );
  if (compiled.status !== 0) {
    console.error(`Failed to build ${name}`);
    process.exit(compiled.status ?? 1);
  }
}

function writeMacApp(binaryPath, stageDir) {
  rmSync(stageDir, { recursive: true, force: true });
  const macOs = join(stageDir, "Techlio Connector.app", "Contents", "MacOS");
  mkdirSync(macOs, { recursive: true });
  const exe = join(macOs, "techlio-connector");
  copyFileSync(binaryPath, exe);
  chmodSync(exe, 0o755);
  writeFileSync(
    join(stageDir, "Techlio Connector.app", "Contents", "Info.plist"),
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>Techlio Connector</string>
  <key>CFBundleDisplayName</key><string>Techlio Connector</string>
  <key>CFBundleIdentifier</key><string>com.techlio.connector</string>
  <key>CFBundleVersion</key><string>0.1.0</string>
  <key>CFBundleShortVersionString</key><string>0.1.0</string>
  <key>CFBundleExecutable</key><string>techlio-connector</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>NSHighResolutionCapable</key><true/>
</dict></plist>
`,
  );
  spawnSync("codesign", ["--force", "--sign", "-", join(stageDir, "Techlio Connector.app")], {
    stdio: "inherit",
  });
}

function writeDmg(stageDir, dmgPath) {
  rmSync(dmgPath, { force: true });
  const created = spawnSync(
    "hdiutil",
    [
      "create",
      "-volname",
      "Techlio Connector",
      "-srcfolder",
      stageDir,
      "-ov",
      "-format",
      "UDZO",
      dmgPath,
    ],
    { stdio: "inherit" },
  );
  if (created.status !== 0) {
    console.error(`Failed to create ${dmgPath}`);
    process.exit(created.status ?? 1);
  }
}

const arm = join(downloads, "techlio-connector-macos-arm64");
const intel = join(downloads, "techlio-connector-macos-x64");
const universal = join(out, "techlio-connector-macos-universal");
const lipo = spawnSync("lipo", ["-create", arm, intel, "-output", universal], { stdio: "inherit" });
if (lipo.status === 0) {
  const stage = join(out, "dmg-universal");
  writeMacApp(universal, stage);
  writeDmg(stage, join(downloads, "techlio-connector-macos.dmg"));
} else {
  console.warn("Universal Mac binary failed; shipping separate Intel and Apple silicon disk images.");
}
for (const [binary, dmgName, stageName] of [
  [arm, "techlio-connector-macos-arm64.dmg", "dmg-arm"],
  [intel, "techlio-connector-macos-x64.dmg", "dmg-intel"],
]) {
  const stage = join(out, stageName);
  writeMacApp(binary, stage);
  writeDmg(stage, join(downloads, dmgName));
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
