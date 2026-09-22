/**
 * Downloadable connector: start the agent immediately, then keep it running
 * at sign-in. Developers never need the git repo or pnpm.
 */
async function main(): Promise<void> {
  const { installBackgroundService } = await import("./install-service.js");
  if (!process.argv.includes("--service")) {
    await installBackgroundService();
  }
  await import("./index.js");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
