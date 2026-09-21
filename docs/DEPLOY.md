# Deploy dashboard + API

## Architecture

| Piece | Where | Notes |
|-------|--------|--------|
| **Web** (`apps/web`) | [Vercel](https://vercel.com) | Next.js |
| **API** (`apps/api`) | [Render](https://render.com) (Docker) | Nest + Fastify + Postgres |
| **Postgres** | Render managed DB | Migrations run on API boot |
| **Redis** | Render (optional) | Late hourly recalc; API sets `SKIP_REDIS=1` if you omit Redis |
| **Connector** | Developer machine | Still `127.0.0.1:9477`; activation stores your API URL |

Local `pnpm dev` uses `http://localhost:3001`. Production uses the Render API URL everywhere the browser and connector need it.

---

## 1. Deploy the API (Render)

1. Push this repo to GitHub.
2. In [Render](https://dashboard.render.com) → **New** → **Blueprint**.
3. Connect the repo and apply `render.yaml` at the repo root.
4. Wait for **techlio-api**, **techlio-postgres**, and **techlio-redis** to go live.
5. Open the **techlio-api** service URL (e.g. `https://techlio-api-xxxx.onrender.com`).
6. Check `GET /v1/health` → `{ "ok": true, ... }`.
7. (Once) seed demo data from your machine:

   ```bash
   DATABASE_URL="<Render Postgres external URL>" pnpm db:seed
   ```

   Use the **external** connection string from the Postgres dashboard if seeding from your laptop.

**Required env (set in Render if not from blueprint):**

- `DATABASE_URL` — from Postgres
- `JWT_SECRET` — long random string (blueprint can generate)
- `ALLOW_DEV_HEADER_AUTH=0`
- `REDIS_URL` — from Redis, or set `SKIP_REDIS=1` to disable recalc queue

---

## 2. Deploy the dashboard (Vercel)

1. **New project** → import the same repo.
2. **Root Directory:** `apps/web`
3. **Environment variables:**

   | Name | Value |
   |------|--------|
   | `NEXT_PUBLIC_API_URL` | `https://<your-render-api-host>` (no trailing slash) |

4. Deploy. Open `https://<your-vercel-app>/login`.

Do **not** deploy `apps/api` as a Vercel Next.js project. The API is the Render Docker service.

---

## 3. Point the connector at production

After login on Vercel, **My connectors → Activate** sends `apiBaseUrl` from `NEXT_PUBLIC_API_URL` to the local connector. Keep `pnpm dev` running on your machine (API + connector, or full stack with API only if web is on Vercel).

For local connector-only against production API:

```bash
# apps/connector/.env — only for testing uploads to prod (use your Render URL)
TECHLIO_API_URL=https://your-api.onrender.com
```

---

## 4. Smoke test

```bash
curl -s https://YOUR_API/v1/health
curl -s -X POST https://YOUR_API/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"manager@techlio.local","password":"manager123"}'
```

If login works but lists are empty, run `pnpm db:seed` against production Postgres (once).

---

## Docker (any host)

```bash
docker build -f infra/Dockerfile.api -t techlio-api .
docker run -p 3001:3001 \
  -e DATABASE_URL=postgres://... \
  -e JWT_SECRET=... \
  techlio-api
```

Compose for full local stack: `docker compose up` (see root `docker-compose.yml`).
