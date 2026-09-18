# Tech context

- **Monorepo:** pnpm + Turborepo, TypeScript
- **Connector:** Node, OTLP + Claude hooks, encrypted SQLite queue, Ed25519 signing
- **API:** NestJS + Fastify, `@techlio/server-core` + Postgres + Drizzle
- **Worker:** BullMQ + Redis, hourly finalize at :05 UTC
- **Web:** Next.js 15, TanStack Query, polling/SSE-ready
- **Tier A:** Claude Code, Codex, Gemini via connector
- **Tier B:** Cursor Admin API, GitHub Copilot metrics (daily only)
