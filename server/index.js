import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import pg from 'pg'
import { migrate } from './db/migrate.js'
import { getDatabaseUrl, getDatabaseUrlHints } from './db/databaseUrl.js'
import { poolOptionsForUrl } from './db/poolConfig.js'
import { API_REVISION, getDeployInfo } from './deployInfo.js'
import { readBuildCommitFile } from './buildCommit.js'

const { Pool } = pg

const databaseUrl = getDatabaseUrl()

if (!databaseUrl) {
  console.warn(
    '[db] DATABASE_URL is missing or empty at startup. Add it in Railway → server service → Variables, then redeploy.',
  )
} else {
  console.log('[db] Database URL is set')
}

const pool = databaseUrl ? new Pool(poolOptionsForUrl(databaseUrl)) : null

const app = express()
const PORT = Number(process.env.PORT) || 3000

app.use((req, res, next) => {
  res.setHeader('X-API-Revision', API_REVISION)
  if (req.path === '/health' || req.path.startsWith('/health/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
  }
  next()
})

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
)
app.use(express.json())
app.use(cookieParser())

app.get('/debug/build-commit', (_req, res) => {
  res.type('text/plain').send(readBuildCommitFile() ?? 'NO_FILE_NOT_DOCKER_OR_LOCAL')
})

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'math-adventure-api',
    buildCommitFile: readBuildCommitFile(),
    deploy: getDeployInfo(),
  })
})

app.get('/', (_req, res) => {
  res.type('text/plain').send('Math Adventure API — /health /health/db')
})

app.get('/health/db', async (_req, res) => {
  if (!pool) {
    return res.status(503).json({
      ok: false,
      db: 'DATABASE_URL not set',
      hints: getDatabaseUrlHints(),
      fix: 'Railway: Postgres service → Connect → выбери этот Node-сервис, чтобы подставился DATABASE_URL. Redeploy.',
      deploy: getDeployInfo(),
    })
  }
  try {
    await pool.query('SELECT 1')
    let topics = null
    try {
      const r = await pool.query('SELECT count(*)::int AS n FROM topics')
      topics = r.rows[0]?.n ?? null
    } catch (e) {
      if (e.code !== '42P01') throw e
    }
    return res.json({
      ok: true,
      db: 'up',
      topics,
      deploy: getDeployInfo(),
    })
  } catch (err) {
    console.error(err)
    return res.status(503).json({
      ok: false,
      db: 'error',
      code: err.code,
      message: err.message,
      deploy: getDeployInfo(),
    })
  }
})

function start() {
  // Bind port before migrate so Railway health checks don’t SIGTERM a slow/hung DB connect.
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`)
    console.log(
      `[deploy] API_REVISION=${API_REVISION} BUILD_COMMIT.txt=${readBuildCommitFile() ?? 'absent'} env.RAILWAY_GIT_COMMIT_SHA=${process.env.RAILWAY_GIT_COMMIT_SHA ?? 'n/a'}`,
    )
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
