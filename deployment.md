The app is deployed across three free services. Total cost: **$0/month**.

## Production URLs

| Component | URL |
|---|---|
| Frontend (primary) | https://weldsim.goodlabs.site |
| Frontend (Cloudflare Pages) | https://welding-simulator-complete.pages.dev |
| Backend API | https://weldsim-api.onrender.com |
| Database | Neon Postgres (managed) |

## Architecture
┌──────────────────────────┐
│ Cloudflare Pages │ Static React SPA
│ weldsim.goodlabs.site │ Global CDN, HTTPS
└────────────┬─────────────┘
│ HTTPS + fetch
↓
┌──────────────────────────┐
│ Render Web Service │ Node.js / Express
│ weldsim-api.onrender.com│ Docker container
└────────────┬─────────────┘
│ postgres://
↓
┌──────────────────────────┐
│ Neon Postgres │ Managed Postgres 16
│ eu-central-1 │ SSL required
└──────────────────────────┘

text

## Environment variables

### Render (backend)

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `DATABASE_URL` | Neon connection string |
| `JWT_SECRET` | (random 96-char hex) |
| `JWT_REFRESH_SECRET` | (random 96-char hex) |
| `CORS_ORIGIN` | `https://weldsim.goodlabs.site,https://welding-simulator-complete.pages.dev` |

### Cloudflare Pages (frontend)

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://weldsim-api.onrender.com/api` |
| `VITE_WS_URL` | `wss://weldsim-api.onrender.com/ws` |

## Deploying updates

Both Cloudflare Pages and Render watch the `main` branch of this repo:

1. Make your changes locally
2. `git commit` and `git push origin main`
3. Both platforms rebuild and redeploy automatically (~2-4 min each)
4. GitHub Actions runs backend tests, frontend tests, and Docker builds on every push

## Known limitations (free tier)

- **Render cold starts**: backend sleeps after 15 min idle, ~30-60s wake-up on next request
- **No Render Shell access**: free tier doesn't include shell. Run migrations locally with `DATABASE_URL` env var, or use `psql -f database/schema.sql`.

## Running migrations against production

From your local machine:

```bash
cd backend
export DATABASE_URL="postgresql://neondb_owner:PASSWORD@HOST/neondb?sslmode=require"
export NODE_ENV=production

node src/db/migrate.js
node src/db/seed.js
Or use psql directly:

PGPASSWORD='...' psql -h HOST -U neondb_owner -d neondb --set=sslmode=require -f database/schema.sql

Adding a new origin (domain)
Add the domain in Cloudflare Pages → Custom domains

Update CORS_ORIGIN on Render to include the new domain (comma-separated)

Update VITE_API_URL / VITE_WS_URL in Cloudflare Pages env vars if the backend URL changed

Trigger a redeploy on both platforms

Cost breakdown
Service	Plan	Cost
Cloudflare Pages	Free	$0
Render Web Service	Free	$0
Neon Postgres	Free	$0
Total		$0/month
EOF		
git add -A
git commit -m "docs: add DEPLOYMENT.md with production URLs, env vars, and troubleshooting"
git push

text

**Paste the output.**

---

## What to do now

1. **Open https://weldsim.goodlabs.site in the browser**
2. **Log in as student** → try the full welding flow
3. **Log out → log in as trainer** → click a student
4. **Report back:**
   - Does it all work?
   - Any errors (F12 console, Network tab)?
5. **Add + commit `DEPLOYMENT.md`** — paste output

If everything works, we move to **Tasks 8 (docs polish) + 9 (security audit)** — the last mile.

Take your time. Paste outputs.