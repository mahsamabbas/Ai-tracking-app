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
- **Tier A implemented:** Claude Code hooks. Codex and Gemini are planned adapters
  only; their OTLP routes reject with 501 until normalization exists.
- **Tier B** (daily aggregates only): Cursor Admin API, GitHub Copilot reports.
  Cursor/VS Code companions contribute file and task-context signals only; they
  do not expose the host agent's internal model/tool stream.
