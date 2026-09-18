# Tech context

- **Monorepo:** pnpm + Turborepo, TypeScript
- **Connector:** Node, OTLP + Claude hooks, encrypted SQLite queue, Ed25519 signing
- **API:** NestJS + Fastify, `@techlio/server-core` + Postgres + Drizzle
- **Worker:** BullMQ + Redis, hourly finalize at :05 UTC
- **Web:** Next.js 15 App Router, Tailwind, Recharts. All metrics come from the
  API — nothing is aggregated in the browser.
- **Migrations:** `infra/sql/*.sql` applied by `scripts/migrate.mjs`, tracked in
  `schema_migrations`.
- **Demo data:** `packages/server-core/src/seed.ts`, deterministic, run with
  `pnpm db:seed`.
- **Tier A** (full session/model/tool telemetry through the local connector):
  Cursor, Claude Code, Codex, Gemini
- **Tier B** (daily aggregates only): Cursor Admin API, GitHub Copilot reports.
  The VS Code companion contributes file and task-context signals only.
