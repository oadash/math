/**
 * Railway Postgres expects TLS. NODE_ENV is not always "production" on Railway,
 * so we also key off RAILWAY_* and host in the URL.
 */
export function poolOptionsForUrl(databaseUrl) {
  const needSsl =
    process.env.PGSSLMODE === 'require' ||
    process.env.NODE_ENV === 'production' ||
    process.env.RAILWAY_ENVIRONMENT !== undefined ||
    process.env.RAILWAY_PROJECT_ID !== undefined ||
    /\.railway\.app$/i.test(databaseUrl) ||
    /\.railway\.internal$/i.test(databaseUrl)

  const disableSsl =
    process.env.DATABASE_SSL === '0' || process.env.DATABASE_SSL === 'false'

  const ssl = needSsl && !disableSsl ? { rejectUnauthorized: false } : undefined

  return {
    connectionString: databaseUrl,
    max: 10,
    connectionTimeoutMillis: 15_000,
    ssl,
  }
}
