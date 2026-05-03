import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import pg from 'pg'
import { migrate } from './db/migrate.js'

const { Pool } = pg

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
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
    return res.status(503).json({ ok: false, db: 'DATABASE_URL not set' })
  }
  try {
    await pool.query('SELECT 1')
    return res.json({ ok: true, db: 'up' })
  } catch (err) {
    console.error(err)
    return res.status(503).json({ ok: false, db: 'error' })
  }
})

async function start() {
  if (pool) {
    try {
      await migrate(pool)
    } catch (err) {
      console.error('migrate failed', err)
      process.exit(1)
    }
  }

  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`)
  })
}

start()
