import * as vscode from "vscode";

const CONNECTOR = "http://127.0.0.1:9477";
const SESSION_ID = globalThis.crypto.randomUUID();

async function postExtensionEvent(body: Record<string, unknown>): Promise<void> {
  try {
    await fetch(`${CONNECTOR}/hooks/extension`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: SESSION_ID, ...body }),
    });
  } catch {
    /* connector offline */
  }
}

export function activate(context: vscode.ExtensionContext) {
  const status = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  );
  status.text = "Techlio: collecting";
  status.show();

  context.subscriptions.push(
    vscode.commands.registerCommand("techlio.pauseCollection", async () => {
      await fetch(`${CONNECTOR}/pause`, { method: "POST" });
      status.text = "Techlio: paused";
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("techlio.resumeCollection", async () => {
      await fetch(`${CONNECTOR}/resume`, { method: "POST" });
      status.text = "Techlio: collecting";
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
          metadata: { tool_name: e.execution.task.name.slice(0, 128) },
        });
      }
    }),
  );
}

export function deactivate() {}
