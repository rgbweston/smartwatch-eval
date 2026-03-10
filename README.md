# Smartwatch Battery Evaluation App

Staff equipment study tracking smartwatch battery drainage across Monk Skin Tone (MST) groups.

## Setup

```bash
cp .env.example .env
npm install
```

## Development

```bash
npm run dev
```

- Client (Vite): http://localhost:5173
- Server (Express): http://localhost:3001
- Admin dashboard: http://localhost:5173/admin

## Production

```bash
npm run build
npm start
```

Express serves `client/dist` and handles all `/api/*` routes.

## Deployment (Render)

1. New Web Service → connect repo
2. Build command: `npm install && npm run build`
3. Start command: `npm start`
4. Environment variables: `PORT`, `DATABASE_PATH`, `NODE_ENV=production`

## Data Model

- **participants** — fixed profile per participant code
- **logs** — daily battery readings with fixed + extensible JSON metadata
- **parameter_defs** — researcher-defined extra columns (no migrations needed)

## Admin Features (`/admin`)

- **Logs tab**: filterable table, inline metadata editing, CSV export, backlog entry
- **Participants tab**: participant list with inline metadata editing
- **Parameters tab**: define new per-log or per-participant columns
