import { describe, it, expect, vi } from 'vitest'
import { maxConsecutiveCorrect, runPromotionRules, scheduleNextTopic } from '../services/spiralScheduler.js'

describe('maxConsecutiveCorrect', () => {
  it('returns 0 for empty', () => {
    expect(maxConsecutiveCorrect([])).toBe(0)
  })

  it('counts longest run', () => {
    expect(maxConsecutiveCorrect([true, true, false, true, true, true])).toBe(3)
    expect(maxConsecutiveCorrect([true, true, true, true])).toBe(4)
  })
})

describe('runPromotionRules', () => {
  it('promotes practicing to mastered when 10 correct in last 12', async () => {
    const masteredParams = []
    let practicingSelects = 0

    const pool = {
      query: vi.fn(async (sql, params) => {
        if (sql.includes('FROM user_topic_state') && sql.includes('practicing')) {
          practicingSelects += 1
          if (practicingSelects === 1) return { rows: [{ topic_id: 'topic-a' }] }
          return { rows: [] }
        }
        if (sql.includes('FROM answers')) {
          return { rows: Array(12).fill({ is_correct: true }) }
        }
        if (sql.includes("SET state = 'mastered'")) {
          masteredParams.push(params)
          return { rowCount: 1 }
        }
        if (sql.includes("SET state = 'introducing'")) {
          return { rowCount: 0 }
        }
        return { rows: [] }
      }),
    }

    await runPromotionRules(pool, 'user-1')
    expect(masteredParams.length).toBe(1)
    expect(masteredParams[0]).toEqual(['user-1', 'topic-a'])
  })

  it('unlocks locked topics when 3 consecutive in last 5', async () => {
    const unlockSql = []
    let practicingSelects = 0

    const pool = {
      query: vi.fn(async (sql) => {
        if (sql.includes('FROM user_topic_state') && sql.includes('practicing')) {
          practicingSelects += 1
          if (practicingSelects <= 2) return { rows: [{ topic_id: 'parent-id' }] }
          return { rows: [] }
        }
        if (sql.includes('FROM answers')) {
          return { rows: Array(5).fill({ is_correct: true }) }
        }
        if (sql.includes("SET state = 'mastered'")) {
          return { rowCount: 0 }
        }
        if (sql.includes("SET state = 'introducing'")) {
          unlockSql.push(sql)
          return { rowCount: 1 }
        }
        return { rows: [] }
      }),
    }

    await runPromotionRules(pool, 'user-2')
    expect(unlockSql.length).toBe(1)
  })
})

describe('scheduleNextTopic', () => {
  it('returns introducing topic and isFirstIntroduction true', async () => {
    const pool = {
      query: vi.fn(async (sql) => {
        const s = String(sql)
        if (s.includes(`state = 'practicing'`) && s.includes('SELECT topic_id') && !s.includes('JOIN')) {
          return { rows: [] }
        }
        if (s.includes('FROM answers')) return { rows: [] }
        if (s.includes('pinned_topic_slug')) return { rows: [{ pinned_topic_slug: null }] }
        if (s.includes('FROM user_topic_state uts') && s.includes(`IN ('introducing', 'practicing', 'mastered')`)) {
          return {
            rows: [
              {
                id: 'tid',
                slug: 'addition_10',
                title_ru: 'Сложение до 10',
                state: 'introducing',
                sort_order: 1,
              },
            ],
          }
        }
        if (s.includes('prerequisite_topic_id') && s.includes('correct_streak >= 3')) {
          return { rows: [] }
        }
        return { rows: [] }
      }),
    }

    const out = await scheduleNextTopic(pool, 'u1')
    expect(out).not.toBeNull()
    expect(out.topic.slug).toBe('addition_10')
    expect(out.isFirstIntroduction).toBe(true)
    expect(out.isPeek).toBe(false)
  })

  it('can pick peek topic when prereq has streak >= 3', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.86)
    const pool = {
      query: vi.fn(async (sql) => {
        const s = String(sql)
        if (s.includes(`state = 'practicing'`) && s.includes('SELECT topic_id') && !s.includes('JOIN')) {
          return { rows: [] }
        }
        if (s.includes('FROM answers')) return { rows: [] }
        if (s.includes('pinned_topic_slug')) return { rows: [{ pinned_topic_slug: null }] }
        if (s.includes(`IN ('introducing', 'practicing', 'mastered')`)) {
          return {
            rows: [
              {
                id: 'act-id',
                slug: 'addition_10',
                title_ru: 'Активная',
                state: 'practicing',
                sort_order: 1,
              },
            ],
          }
        }
        if (s.includes('prerequisite_topic_id') && s.includes('correct_streak >= 3')) {
          return {
            rows: [
              {
                id: 'peek-id',
                slug: 'addition_20',
                title_ru: 'Следующая',
                sort_order: 2,
              },
            ],
          }
        }
        return { rows: [] }
      }),
    }

    const out = await scheduleNextTopic(pool, 'u1')
    expect(out).not.toBeNull()
    expect(out.isPeek).toBe(true)
    expect(out.topic.slug).toBe('addition_20')
    expect(out.topic.state).toBe('peeking')
    expect(out.isFirstIntroduction).toBe(true)
    vi.restoreAllMocks()
  })

  it('prioritizes never-attempted introducing topic before weighted random', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const pool = {
      query: vi.fn(async (sql) => {
        const s = String(sql)
        if (s.includes(`state = 'practicing'`) && s.includes('SELECT topic_id') && !s.includes('JOIN')) {
          return { rows: [] }
        }
        if (s.includes('FROM answers')) return { rows: [] }
        if (s.includes('pinned_topic_slug')) return { rows: [{ pinned_topic_slug: null }] }
        if (s.includes(`IN ('introducing', 'practicing', 'mastered')`)) {
          return {
            rows: [
              {
                id: 'act-id',
                slug: 'addition_10',
                title_ru: 'Активная',
                state: 'practicing',
                total_attempts: 20,
                sort_order: 1,
              },
              {
                id: 'new-id',
                slug: 'addition_20',
                title_ru: 'Новая',
                state: 'introducing',
                total_attempts: 0,
                sort_order: 2,
              },
            ],
          }
        }
        if (s.includes('prerequisite_topic_id') && s.includes('correct_streak >= 3')) {
          return { rows: [] }
        }
        return { rows: [] }
      }),
    }

    const out = await scheduleNextTopic(pool, 'u1')
    expect(out).not.toBeNull()
    expect(out.topic.slug).toBe('addition_20')
    expect(out.isFirstIntroduction).toBe(true)
    vi.restoreAllMocks()
  })
})
