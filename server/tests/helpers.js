import { createApp } from '../createApp.js'

/** Приложение без SPA и без БД — только API-роуты и /health. */
export function createTestApp(pool = null) {
  return createApp({
    pool,
    clientDist: '/var/nonexistent-math-client-dist',
    spaIndexPath: '/var/nonexistent-math-client-dist/index.html',
  })
}
