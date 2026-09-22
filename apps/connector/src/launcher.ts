/**
 * Packaged executable entry.
 * Double-click installs a background service. `--service` runs the agent.
 * `tsx src/index.ts` during development is unchanged.
 */
const execName = process.execPath.split(/[/\\]/).pop() ?? "";
const packaged = /techlio-connector/i.test(execName);

async function main(): Promise<void> {
  const service = process.argv.includes("--service") || !packaged;
  if (service) {
    await import("./index.js");
    return;
  }
  const { installBackgroundService } = await import("./install-service.js");
  await installBackgroundService();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
