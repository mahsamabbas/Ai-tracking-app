# Connector download bundle

Employees install the local agent with **Node.js only** (no git clone).

Maintainers: from repo root run:

```bash
pnpm connector:bundle
```

Then deploy the web app so `techlio-connector.zip` is served at `/downloads/techlio-connector.zip`.
