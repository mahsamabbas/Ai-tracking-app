import { spawn, execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";

const API_URL = "https://tracking-app-api-three.vercel.app";
const DASHBOARD = "https://tracking-app-api-t9yd.vercel.app";
const VSIX_URL = `${DASHBOARD}/downloads/techlio-companion.vsix`;

function installDir(): string {
  return join(homedir(), ".techlio", "connector");
}

function exeName(): string {
  return platform() === "win32" ? "techlio-connector.exe" : "techlio-connector";
}

function writeEnv(dir: string): void {
  const envPath = join(dir, ".env");
  if (existsSync(envPath)) return;
  const queue = join(homedir(), ".techlio-connector", "queue.db");
  mkdirSync(join(homedir(), ".techlio-connector"), { recursive: true });
  writeFileSync(
    envPath,
    [
      `TECHLIO_API_URL=${API_URL}`,
      `TECHLIO_DASHBOARD_ORIGINS=${DASHBOARD}`,
      "CONNECTOR_PORT=9477",
      `CONNECTOR_DB=${queue}`,
      "",
    ].join(platform() === "win32" ? "\r\n" : "\n"),
  );
}

function registerWindows(dest: string): void {
  const task = "TechlioConnector";
  const command = `"${dest}" --service`;
  try {
    execFileSync(
      "schtasks",
      ["/Create", "/TN", task, "/TR", command, "/SC", "ONLOGON", "/F"],
      { stdio: "ignore" },
    );
  } catch {
    console.log("Could not register the sign-in task. The connector will still start now.");
  }
}

function registerMac(dest: string): void {
  const label = "com.techlio.connector";
  const plistDir = join(homedir(), "Library", "LaunchAgents");
  mkdirSync(plistDir, { recursive: true });
  const logDir = join(homedir(), ".techlio-connector");
  mkdirSync(logDir, { recursive: true });
  const plist = join(plistDir, `${label}.plist`);
  writeFileSync(
    plist,
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>${label}</string>
  <key>ProgramArguments</key>
  <array><string>${dest}</string><string>--service</string></array>
  <key>WorkingDirectory</key><string>${installDir()}</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${join(logDir, "connector.log")}</string>
  <key>StandardErrorPath</key><string>${join(logDir, "connector.err.log")}</string>
</dict></plist>
`,
  );
  const domain = `gui/${process.getuid?.() ?? ""}`;
  try {
    execFileSync("launchctl", ["bootout", `${domain}/${label}`], { stdio: "ignore" });
  } catch {
    /* not loaded yet */
  }
  execFileSync("launchctl", ["bootstrap", domain, plist], { stdio: "ignore" });
  execFileSync("launchctl", ["enable", `${domain}/${label}`], { stdio: "ignore" });
  execFileSync("launchctl", ["kickstart", "-k", `${domain}/${label}`], { stdio: "ignore" });
}

function which(cmd: string): boolean {
  const probe = platform() === "win32" ? "where" : "which";
  const result = spawnSync(probe, [cmd], { stdio: "ignore" });
  return result.status === 0;
}

function connectIdes(): void {
  let vsix = "";
  try {
    const file = join(installDir(), "techlio-companion.vsix");
    execFileSync(
      platform() === "win32" ? "curl.exe" : "curl",
      ["-fsSL", VSIX_URL, "-o", file],
      { stdio: "ignore" },
    );
    if (existsSync(file)) vsix = file;
  } catch {
    /* companion download is optional */
  }
  if (!vsix) return;
  for (const cmd of ["cursor", "code"]) {
    if (!which(cmd)) continue;
    const result = spawnSync(cmd, ["--install-extension", vsix, "--force"], {
      stdio: "ignore",
    });
    if (result.status === 0) {
      console.log(`Connected ${cmd}. Restart that app if it is already open.`);
    }
  }
}

export async function installBackgroundService(): Promise<void> {
  const dir = installDir();
  mkdirSync(dir, { recursive: true });
  const dest = join(dir, exeName());
  if (process.execPath !== dest) {
    copyFileSync(process.execPath, dest);
  }
  if (platform() !== "win32") chmodSync(dest, 0o755);
  writeEnv(dir);

  console.log("Installing Techlio connector…");
  if (platform() === "win32") {
    registerWindows(dest);
    const child = spawn(dest, ["--service"], {
      cwd: dir,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();
  } else if (platform() === "darwin") {
    registerMac(dest);
  } else {
    const child = spawn(dest, ["--service"], {
      cwd: dir,
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  }
  connectIdes();

  console.log("");
  console.log("Techlio connector is running in the background.");
  console.log("This computer: http://127.0.0.1:9477");
  console.log("Go back to the dashboard, open My connectors, and activate your key.");
  console.log("You can close this window.");
  console.log("");
  await new Promise((resolve) => setTimeout(resolve, 8_000));
}
