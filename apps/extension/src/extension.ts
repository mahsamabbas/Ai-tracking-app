import * as vscode from "vscode";

const CONNECTOR = "http://127.0.0.1:9477";

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
      const project = await vscode.window.showInputBox({
        prompt: "Project / work item label",
      });
      if (project) {
        vscode.window.showInformationMessage(`Context set: ${project}`);
      }
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(() => {
      /* file metadata signals only — no content upload */
    }),
  );
}

export function deactivate() {}
