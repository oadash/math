import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import 'dotenv/config'
import pg from 'pg'
import { getDatabaseUrl } from './databaseUrl.js'
import { poolOptionsForUrl } from './poolConfig.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Applies server/db/schema.sql once when the public.users table is missing.
 * Then applies server/db/seed.sql (idempotent) so topics exist on every deploy.
 */
export async function migrate(pool) {
  const { rows } = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users'
    ) AS exists
  `)
  if (!rows[0].exists) {
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
    await pool.query(sql)
    console.log('migrate: schema applied')
  } else {
    console.log('migrate: schema already present')
  }

  const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8')
  await pool.query(seed)
  console.log('migrate: seed applied')
}

async function runCli() {
  const url = getDatabaseUrl()
  if (!url) {
    console.error('migrate: DATABASE_URL (or POSTGRES_URL) is not set')
    process.exit(1)
  }
  const pool = new pg.Pool(poolOptionsForUrl(url))
  try {
    await migrate(pool)
  } finally {
    await pool.end()
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
  runCli().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
