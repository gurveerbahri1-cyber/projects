# Deploying to Vercel

## Why this differs from the local version

The local version (`app/`) uses `node:sqlite` — a file on disk.
Vercel functions are stateless and ephemeral, so that file wouldn't persist
between requests. This version swaps it for **Postgres** and reshapes the
router into a single serverless function at `/api/[...path].js`. The
frontend (`index.html`, `styles.css`, `app.js`) is unchanged — it's just
static files now served from Vercel's edge CDN instead of a local Node
process.

## Steps

### 1. Get a Postgres database
Any hosted Postgres works. Easiest options:
- **Vercel Postgres** (via your project's Storage tab — a few clicks, gives you a `DATABASE_URL` automatically)
- **Neon** or **Supabase** (free tiers, works the same way — copy the connection string)

### 2. Push this project to a Git repo
Vercel deploys from GitHub/GitLab/Bitbucket. Create a repo, push this folder's contents to it.

### 3. Import the project in Vercel
In the Vercel dashboard: **Add New → Project → import your repo**. No framework preset needed — Vercel auto-detects the `/api` folder as serverless functions and everything else as static.

### 4. Set environment variables
In the project's **Settings → Environment Variables**, add:

| Key | Value |
|---|---|
| `DATABASE_URL` | The Postgres connection string from step 1 |
| `AUTH_SECRET` | Any long random string (used to sign login tokens) |
| `ADMIN_SECRET` | Any long random string (protects the one-time DB setup call below) |

### 5. Deploy
Trigger the deploy (pushing to your connected branch does this automatically).

### 6. Initialize the database (once)
After the first successful deploy, run this once to create tables and seed demo accounts:

```bash
curl -X POST https://<your-project>.vercel.app/api/admin/init-db \
  -H "x-admin-secret: <the ADMIN_SECRET you set>"
```

You should get back `{"message":"Database ready","seededCategories":true,"seededUsers":true}`.

### 7. Visit your site
`https://<your-project>.vercel.app` — log in with `host@demo.com` / `guest@demo.com` / `mod@demo.com`, all password `password123`, same as the local demo.

## What you get automatically from Vercel, without configuring anything

- Static assets (`styles.css`, `app.js`) served from the edge CDN with caching
- Auto-deploy on every git push, with preview deployments per branch/PR — this is your CI/CD pipeline
- Each `/api/*` request runs as an isolated serverless function

## Notes

- Rotate `ADMIN_SECRET` (or just stop calling the endpoint) after the initial setup — it's a blunt one-time tool, not meant to stay exposed long-term.
- If you outgrow a single serverless function handling all routes, the next natural split is by resource (`/api/auth.js`, `/api/bookings.js`, etc.) — not needed yet at this scale.
