import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { API_REVISION, getDeployInfo } from './deployInfo.js'
import { readBuildCommitFile } from './buildCommit.js'
import { createApiRouter } from './routes/api.js'
import { createSitemapRouter } from './routes/sitemap.js'
import { createPracticeRouter } from './routes/practice.js'
import { getDatabaseUrlHints } from './db/databaseUrl.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const defaultClientDist = join(__dirname, '../client/dist')
const defaultSpaIndex = join(defaultClientDist, 'index.html')
const DEFAULT_ALLOWED_ORIGINS = new Set([
  'https://trainmath.fyi',
  'https://www.trainmath.fyi',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
])

function isAllowedCorsOrigin(origin) {
  if (!origin) return true
  const extra = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return DEFAULT_ALLOWED_ORIGINS.has(origin) || extra.includes(origin)
}

/**
 * @param {object} opts
 * @param {import('pg').Pool | null} opts.pool
 * @param {string} [opts.clientDist]
 * @param {string} [opts.spaIndexPath]
 * @param {{ ready: boolean, error?: string | null }} [opts.readiness]
 */
export function createApp(opts) {
  const { pool } = opts
  const clientDist = opts.clientDist ?? defaultClientDist
  const spaIndexPath = opts.spaIndexPath ?? defaultSpaIndex
  const spaReady = existsSync(spaIndexPath)
  const readiness = opts.readiness ?? { ready: true, error: null }

  const app = express()

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
      origin(origin, cb) {
        cb(null, isAllowedCorsOrigin(origin))
      },
      credentials: true,
    }),
  )
  app.use(express.json())
  app.use(cookieParser())

  app.use('/api', createApiRouter(pool))
  app.use(createSitemapRouter(pool))
  if (pool) {
    app.use(createPracticeRouter(pool))
  }

  app.get('/debug/build-commit', (_req, res) => {
    res.type('text/plain').send(readBuildCommitFile() ?? 'NO_FILE_NOT_DOCKER_OR_LOCAL')
  })

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      ready: readiness.ready,
      migrationsReady: readiness.ready,
      migrationError: readiness.error ?? null,
      service: 'math-adventure-api',
      databaseConfigured: Boolean(pool),
      buildCommitFile: readBuildCommitFile(),
      deploy: getDeployInfo(),
    })
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
        ready: readiness.ready,
        migrationsReady: readiness.ready,
        migrationError: readiness.error ?? null,
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

  if (spaReady) {
    app.use(
      '/app',
      express.static(clientDist, {
        index: false,
        maxAge: process.env.NODE_ENV === 'production' ? '2h' : 0,
      }),
    )
    app.get('*', (req, res, next) => {
      if (
        req.path.startsWith('/api') ||
        req.path.startsWith('/health') ||
        req.path.startsWith('/debug') ||
        req.path === '/' ||
        req.path === '/en' ||
        req.path === '/en/' ||
        req.path === '/topics' ||
        req.path === '/en/topics' ||
        req.path.startsWith('/practice') ||
        req.path.startsWith('/en/practice') ||
        req.path === '/sitemap.xml' ||
        req.path === '/robots.txt'
      ) {
        return next()
      }
      if (req.path === '/app' || req.path.startsWith('/app/')) {
        if (req.path.startsWith('/app/assets/')) {
          return next()
        }
        return res.sendFile(spaIndexPath)
      }
      return next()
    })
  } else {
    app.get('/', (_req, res) => {
      res
        .type('text/plain')
        .send('Math Adventure API — нет client/dist; выполни npm run build в корне монорепо.')
    })
  }

  return app
}
