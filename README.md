# Math Adventure

Adaptive math trainer for kids 7–10. Monorepo: **server** (Express + PostgreSQL via `pg`) and **client** (React 18 + Vite).

## Requirements

- Node.js 20
- PostgreSQL (for full API usage; optional for local UI-only dev)

## Setup

```bash
npm install
cp server/.env.example server/.env   # set DATABASE_URL when using the DB
```

## Development

Terminal 1 — API (default port 3000):

```bash
npm run dev --workspace=server
```

Terminal 2 — Vite dev server (port 5173, proxies `/api` to the server):

```bash
npm run dev --workspace=client
```

## Production build

```bash
npm run build
npm start
```

## Database schema

Apply `server/db/schema.sql` to your PostgreSQL database (migration script comes in a later task).

## License

Private project.
