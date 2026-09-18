import * as vscode from "vscode";

const CONNECTOR = "http://127.0.0.1:9477";
const SESSION_ID = globalThis.crypto.randomUUID();

function hostProvider(): string {
  const name = vscode.env.appName.toLowerCase();
  if (name.includes("cursor")) return "cursor";
  if (name.includes("visual studio code")) return "vscode";
  return "cursor";
}

async function postJson(path: string, body: Record<string, unknown>): Promise<void> {
  try {
    await fetch(`${CONNECTOR}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    /* connector offline — queue on next retry when it is up */
  }
}

async function postExtensionEvent(body: Record<string, unknown>): Promise<void> {
  await postJson("/hooks/extension", {
    session_id: SESSION_ID,
    provider: hostProvider(),
    appName: vscode.env.appName,
    ...body,
  });
}

export function activate(context: vscode.ExtensionContext) {
  const status = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  );
  status.text = `Techlio: ${hostProvider()}`;
  status.show();

  void postJson("/host", {
    provider: hostProvider(),
    appName: vscode.env.appName,
  });
  void postExtensionEvent({ event_type: "session_started" });

  context.subscriptions.push(
    vscode.commands.registerCommand("techlio.pauseCollection", async () => {
      await fetch(`${CONNECTOR}/pause`, { method: "POST" });
      status.text = "Techlio: paused";
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("techlio.resumeCollection", async () => {
      await fetch(`${CONNECTOR}/resume`, { method: "POST" });
      status.text = `Techlio: ${hostProvider()}`;
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("techlio.setTaskContext", async () => {
      const label = await vscode.window.showInputBox({
        prompt: "Project / work item label",
      });
      if (label) {
        await postExtensionEvent({
          event_type: "task_context_changed",
          label,
        });
        vscode.window.showInformationMessage(`Context set: ${label}`);
      }
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      const rel = vscode.workspace.asRelativePath(doc.uri);
      void postExtensionEvent({
        event_type: "file_modified",
        file_path: rel.slice(0, 512),
      });
    }),
  );

  context.subscriptions.push(
    vscode.tasks.onDidEndTaskProcess((e) => {
      const name = e.execution.task.name.toLowerCase();
      let eventType: string | null = null;
      if (name.includes("test")) eventType = "test_completed";
      else if (name.includes("build")) eventType = "build_completed";
      else if (name.includes("lint")) eventType = "lint_completed";
      if (eventType) {
        void postExtensionEvent({
          event_type: eventType,
        });
      }
    }),
  );
}

export function deactivate() {
  void postExtensionEvent({ event_type: "session_ended" });
}
