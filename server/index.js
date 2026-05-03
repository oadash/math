import 'dotenv/config'
import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { migrate } from './db/migrate.js'
import { getDatabaseUrl } from './db/databaseUrl.js'
import { poolOptionsForUrl } from './db/poolConfig.js'
import { API_REVISION } from './deployInfo.js'
import { readBuildCommitFile } from './buildCommit.js'
import { createApp } from './createApp.js'

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

const app = createApp({ pool })
const PORT = Number(process.env.PORT) || 3000

const __dirname = dirname(fileURLToPath(import.meta.url))
const clientDistPath = join(__dirname, '../client/dist')
const spaReady = existsSync(join(clientDistPath, 'index.html'))

function start() {
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`)
    console.log(`[spa] client dist: ${spaReady ? clientDistPath : 'missing (API only)'}`)
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
