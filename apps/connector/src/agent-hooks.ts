import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_NAME = "report-hook.mjs";
const CLAUDE_EVENTS = [
  "SessionStart",
  "SessionEnd",
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
  "PostToolUseFailure",
  "Stop",
] as const;
const CURSOR_EVENTS = [
  "sessionStart",
  "sessionEnd",
  "beforeSubmitPrompt",
  "preToolUse",
  "postToolUse",
  "postToolUseFailure",
  "afterFileEdit",
  "stop",
] as const;

function installDir(): string {
  return join(homedir(), ".techlio", "connector");
}

const HOOK_SOURCE = `#!/usr/bin/env node
const providerArg = process.argv[2] || "claude_code";
const chunks = [];
process.stdin.on("data", (chunk) => chunks.push(chunk));
process.stdin.on("end", () => {
  let raw = {};
  try { raw = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch { raw = {}; }
  const roots = Array.isArray(raw.workspace_roots) ? raw.workspace_roots : [];
  const cwd = typeof raw.cwd === "string" ? raw.cwd : typeof roots[0] === "string" ? roots[0] : undefined;
  const name = typeof raw.hook_event_name === "string" ? raw.hook_event_name : "";
  const provider = /^[a-z]/.test(name) ? "cursor" : /^[A-Z]/.test(name) ? "claude_code" : providerArg;
  const body = {
    provider,
    hook_event_name: raw.hook_event_name,
    session_id: raw.session_id || raw.conversation_id || raw.generation_id,
    tool_name: raw.tool_name || raw.tool,
    cwd,
    file_path: typeof raw.file_path === "string" ? raw.file_path : undefined,
    model: raw.model || raw.model_name,
    status: raw.status,
  };
  fetch("http://127.0.0.1:9477/hooks/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => undefined).finally(() => process.stdout.write("{}\\n"));
});
`;

function bundledScript(): string | undefined {
  try {
    return join(dirname(fileURLToPath(import.meta.url)), "../hook/report-hook.mjs");
  } catch {
    return undefined;
  }
}

function commandFor(scriptPath: string, provider: "claude_code" | "cursor"): string {
  const node = process.execPath.includes("node") ? process.execPath : "node";
  return `"${node}" "${scriptPath}" ${provider}`;
}

function readJson(path: string): Record<string, unknown> {
  if (!existsSync(path)) return {};
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function installScript(): string {
  const dir = installDir();
  mkdirSync(dir, { recursive: true });
  const dest = join(dir, SCRIPT_NAME);
  const source = bundledScript();
  if (source && existsSync(source)) copyFileSync(source, dest);
  else writeFileSync(dest, HOOK_SOURCE);
  chmodSync(dest, 0o755);
  return dest;
}

function installClaude(scriptPath: string): void {
  const path = join(homedir(), ".claude", "settings.json");
  mkdirSync(dirname(path), { recursive: true });
  const settings = readJson(path);
  const hooks = (settings.hooks && typeof settings.hooks === "object"
    ? settings.hooks
    : {}) as Record<string, unknown>;
  const command = commandFor(scriptPath, "claude_code");
  for (const eventName of CLAUDE_EVENTS) {
    const existing = Array.isArray(hooks[eventName]) ? hooks[eventName] : [];
    const already = JSON.stringify(existing).includes(SCRIPT_NAME);
    hooks[eventName] = already
      ? existing
      : [
          ...existing,
          {
            matcher: ".*",
            hooks: [{ type: "command", command }],
          },
        ];
  }
  settings.hooks = hooks;
  writeFileSync(path, `${JSON.stringify(settings, null, 2)}\n`);
}

function installCursor(scriptPath: string): void {
  const path = join(homedir(), ".cursor", "hooks.json");
  mkdirSync(dirname(path), { recursive: true });
  const settings = readJson(path);
  const hooks = (settings.hooks && typeof settings.hooks === "object"
    ? settings.hooks
    : {}) as Record<string, unknown>;
  const command = commandFor(scriptPath, "cursor");
  for (const eventName of CURSOR_EVENTS) {
    const existing = Array.isArray(hooks[eventName]) ? hooks[eventName] : [];
    const already = JSON.stringify(existing).includes(SCRIPT_NAME);
    hooks[eventName] = already
      ? existing
      : [...existing, { command }];
  }
  settings.version = 1;
  settings.hooks = hooks;
  writeFileSync(path, `${JSON.stringify(settings, null, 2)}\n`);
}

/** Point Claude Code and Cursor at the local connector. Existing settings are kept. */
export function ensureAgentHooks(): { claude: boolean; cursor: boolean } {
  const scriptPath = installScript();
  let claude = false;
  let cursor = false;
  try {
    installClaude(scriptPath);
    claude = true;
  } catch {
    claude = false;
  }
  try {
    installCursor(scriptPath);
    cursor = true;
  } catch {
    cursor = false;
  }
  return { claude, cursor };
}
