let cache = null

export async function getAllTopics(pool) {
  if (cache) return cache
  const { rows } = await pool.query(
    'SELECT id, slug, title_ru, title_en, prerequisite_topic_id, sort_order FROM topics ORDER BY sort_order',
  )
  cache = rows
  return cache
}

export function invalidateTopicCache() {
  cache = null
}

export function getTopicBySlug(slug) {
  if (!cache) return null
  return cache.find((t) => t.slug === slug) ?? null
}
