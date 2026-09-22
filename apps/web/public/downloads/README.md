# Connector downloads

Employees download a connector program from the dashboard. They do not clone this
repo, install Node.js, or run `pnpm`.

Maintainers: from repo root run:

```bash
pnpm connector:pack
```

Then deploy the web app so these files are served:

- `/downloads/techlio-connector-win-x64.exe`
- `/downloads/techlio-connector-macos-arm64`
- `/downloads/techlio-connector-macos-x64`
