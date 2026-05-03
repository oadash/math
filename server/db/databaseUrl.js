function trimUrl(raw) {
  const url = typeof raw === 'string' ? raw.trim() : ''
  return url.length > 0 ? url : null
}

/**
 * Some platforms only set discrete PG* vars on the app service.
 */
function buildUrlFromPgEnv() {
  const host = process.env.PGHOST?.trim()
  const port = (process.env.PGPORT || '5432').trim()
  const user = process.env.PGUSER?.trim()
  const password = process.env.PGPASSWORD ?? ''
  const database = process.env.PGDATABASE?.trim()
  if (!host || !user || !database) return null
  const u = encodeURIComponent(user)
  const p = encodeURIComponent(password)
  return `postgresql://${u}:${p}@${host}:${port}/${database}`
}

/**
 * Railway / local: DATABASE_URL; fallbacks POSTGRES_*, PG* pieces.
 */
export function getDatabaseUrl() {
  return (
    trimUrl(process.env.DATABASE_URL) ||
    trimUrl(process.env.POSTGRES_URL) ||
    trimUrl(process.env.POSTGRES_PRISMA_URL) ||
    buildUrlFromPgEnv()
  )
}

/** For /health/db diagnostics (booleans only, no secrets). */
export function getDatabaseUrlHints() {
  return {
    DATABASE_URL: Boolean(trimUrl(process.env.DATABASE_URL)),
    POSTGRES_URL: Boolean(trimUrl(process.env.POSTGRES_URL)),
    PGHOST: Boolean(process.env.PGHOST?.trim()),
    PGUSER: Boolean(process.env.PGUSER?.trim()),
    PGDATABASE: Boolean(process.env.PGDATABASE?.trim()),
  }
}
