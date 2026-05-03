import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import 'dotenv/config'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Applies server/db/schema.sql once when the public.users table is missing.
 */
export async function migrate(pool) {
  const { rows } = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users'
    ) AS exists
  `)
  if (rows[0].exists) {
    console.log('migrate: schema already present, skipping')
    return
  }
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
  await pool.query(sql)
  console.log('migrate: schema applied')
}

async function runCli() {
  if (!process.env.DATABASE_URL) {
    console.error('migrate: DATABASE_URL is not set')
    process.exit(1)
  }
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.PGSSLMODE === 'require' || process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : undefined,
  })
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
