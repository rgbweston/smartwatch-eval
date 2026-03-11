# Smartwatch Battery Evaluation App

Staff equipment study tracking smartwatch battery drainage across Monk Skin Tone (MST) groups.

## Live App

**URL**: https://smartwatch-eval.onrender.com
**Admin**: https://smartwatch-eval.onrender.com/admin

## Stack

- **Hosting**: Render (free tier web service — spins down after 15 min inactivity, see [Keep-Alive](#keep-alive) below)
- **Database**: Turso Cloud (hosted libSQL) — free tier: 500 DB rows, 1 GB storage
- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express

## Local Development

No Turso account needed — runs with a local SQLite file.

```bash
cp .env.example .env
npm install
npm run dev
```

- Client (Vite): http://localhost:5173
- Server (Express): http://localhost:3001
- Admin dashboard: http://localhost:5173/admin

## Production Deployment (Render)

### Environment variables required

| Variable | Description |
|----------|-------------|
| `TURSO_DATABASE_URL` | e.g. `libsql://your-db.turso.io` |
| `TURSO_AUTH_TOKEN` | Auth token from Turso dashboard |
| `NODE_ENV` | Set to `production` |

### Redeploy

Push to `main` — Render auto-deploys on every push.

### First-time setup

1. New Web Service → connect repo
2. Build command: `npm install && npm run build`
3. Start command: `npm start`
4. Add the environment variables above

## Viewing Data

**Primary — Admin Dashboard** (`/admin`):
- **Logs tab**: filterable table of all submissions, inline metadata editing, CSV export
- **Participants tab**: participant list with metadata
- **Parameters tab**: define new per-log or per-participant columns

**Secondary — Turso web UI** (turso.tech → your database):
- Shows raw SQL rows; useful for one-off queries but harder to use than the admin dashboard

### Exporting data

Go to `/admin` → Logs tab → **Export CSV** button. Downloads all logs with any custom parameters as columns.

## Adding Custom Parameters

Go to `/admin` → Parameters tab → define a name, type (text/number), and scope (log/participant).
The new column appears immediately as an editable cell in the Logs or Participants tab. No database migration needed.

## Data Model

- **participants** — one row per participant (username, MST group, device model, extensible metadata)
- **logs** — daily battery readings with fixed + extensible JSON metadata
- **parameter_defs** — researcher-defined extra columns

## Keep-Alive

Render free tier spins down after 15 minutes of inactivity. The server pings its own `/api/health` every 10 minutes to stay awake.

### UptimeRobot (recommended backup)

For more reliable uptime and email alerts if the service goes down:

1. Go to [uptimerobot.com](https://uptimerobot.com) → free account → **New Monitor**
2. Type: **HTTP(s)**
3. URL: `https://smartwatch-eval.onrender.com/api/health`
4. Interval: **5 minutes** (free tier maximum frequency)

This acts as an external backup ping and sends email alerts if the service goes down.
