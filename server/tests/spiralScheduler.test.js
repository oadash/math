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

  it('unlocks locked topics when 5 consecutive in last 7', async () => {
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
          return { rows: Array(7).fill({ is_correct: true }) }
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
        if (sql.includes('FROM user_topic_state uts') && sql.includes('JOIN topics')) {
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
        return { rows: [] }
      }),
    }

    const out = await scheduleNextTopic(pool, 'u1')
    expect(out).not.toBeNull()
    expect(out.topic.slug).toBe('addition_10')
    expect(out.isFirstIntroduction).toBe(true)
  })
})
