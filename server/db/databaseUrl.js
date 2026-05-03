/**
 * Railway / local: primary name is DATABASE_URL; some setups expose POSTGRES_*.
 */
export function getDatabaseUrl() {
  const raw =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL
  const url = typeof raw === 'string' ? raw.trim() : ''
  return url.length > 0 ? url : null
}
