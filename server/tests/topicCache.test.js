import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAllTopics, invalidateTopicCache, getTopicBySlug } from '../services/topicCache.js'

describe('topicCache', () => {
  beforeEach(() => {
    invalidateTopicCache()
  })

  it('first getAllTopics queries DB, second uses cache', async () => {
    const row = {
      id: '1',
      slug: 'addition_10',
      title_ru: 'Сложение',
      title_en: 'Add',
      prerequisite_topic_id: null,
      sort_order: 1,
    }
    const query = vi.fn().mockResolvedValue({ rows: [row] })
    const pool = { query }

    const a = await getAllTopics(pool)
    const b = await getAllTopics(pool)

    expect(query).toHaveBeenCalledTimes(1)
    expect(a).toEqual([row])
    expect(b).toEqual([row])
  })

  it('invalidateTopicCache clears cache', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] })
    await getAllTopics({ query })
    invalidateTopicCache()
    await getAllTopics({ query })
    expect(query).toHaveBeenCalledTimes(2)
  })

  it('getTopicBySlug returns from cache', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{ id: '1', slug: 'a', title_ru: 'A', title_en: null, prerequisite_topic_id: null, sort_order: 1 }],
    })
    await getAllTopics({ query })
    expect(getTopicBySlug('a')?.title_ru).toBe('A')
    expect(getTopicBySlug('missing')).toBeNull()
  })

  it('getTopicBySlug is null when cache cold', () => {
    invalidateTopicCache()
    expect(getTopicBySlug('a')).toBeNull()
  })
})
