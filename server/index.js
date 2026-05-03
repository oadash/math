import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import pg from 'pg'
import { migrate } from './db/migrate.js'
import { getDatabaseUrl, getDatabaseUrlHints } from './db/databaseUrl.js'

const { Pool } = pg

const databaseUrl = getDatabaseUrl()

if (!databaseUrl) {
  console.warn(
    '[db] DATABASE_URL is missing or empty at startup. Add it in Railway → server service → Variables, then redeploy.',
  )
} else {
  console.log('[db] Database URL is set')
}

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      max: 10,
      connectionTimeoutMillis: 15_000,
      ssl:
        process.env.PGSSLMODE === 'require' || process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : undefined,
    })
  : null

const app = express()
const PORT = Number(process.env.PORT) || 3000

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
)
app.use(express.json())
app.use(cookieParser())

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'math-adventure-api' })
})

app.get('/health/db', async (_req, res) => {
  if (!pool) {
    return res.status(503).json({
      ok: false,
      db: 'DATABASE_URL not set',
      hints: getDatabaseUrlHints(),
      fix: 'Railway: open Postgres → Connect → link to this service, or set DATABASE_URL via Variable Reference from Postgres. Redeploy after saving.',
    })
  }
  try {
    await pool.query('SELECT 1')
    return res.json({ ok: true, db: 'up' })
  } catch (err) {
    console.error(err)
    return res.status(503).json({ ok: false, db: 'error' })
  }
})

function start() {
  // Bind port before migrate so Railway health checks don’t SIGTERM a slow/hung DB connect.
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`)
    void runMigrateAfterListen()
  })
}

async function runMigrateAfterListen() {
  if (!pool) return
  try {
    await migrate(pool)
  } catch (err) {
    console.error('migrate failed (HTTP is up; fix DB and redeploy)', err)
  }
}

start()
