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

/**
 * @param {object} opts
 * @param {import('pg').Pool | null} opts.pool
 * @param {string} [opts.clientDist]
 * @param {string} [opts.spaIndexPath]
 */
export function createApp(opts) {
  const { pool } = opts
  const clientDist = opts.clientDist ?? defaultClientDist
  const spaIndexPath = opts.spaIndexPath ?? defaultSpaIndex
  const spaReady = existsSync(spaIndexPath)

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
      origin: true,
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
        req.path.startsWith('/practice') ||
        req.path.startsWith('/en/practice') ||
        req.path === '/sitemap.xml' ||
        req.path === '/robots.txt'
      ) {
        return next()
      }
      res.sendFile(spaIndexPath)
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
