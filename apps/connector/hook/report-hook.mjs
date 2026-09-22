#!/usr/bin/env node
/**
 * Claude Code / Cursor hook. Forwards allowlisted fields only.
 * Prompt text, tool input, command text, and file contents are dropped here.
 */
const providerArg = process.argv[2] || "claude_code";
const chunks = [];
process.stdin.on("data", (chunk) => chunks.push(chunk));
process.stdin.on("end", () => {
  let raw = {};
  try {
    raw = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    raw = {};
  }
  const roots = Array.isArray(raw.workspace_roots) ? raw.workspace_roots : [];
  const cwd = typeof raw.cwd === "string"
    ? raw.cwd
    : typeof roots[0] === "string"
      ? roots[0]
      : undefined;
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
  })
    .catch(() => undefined)
    .finally(() => {
      process.stdout.write("{}\n");
    });
});
