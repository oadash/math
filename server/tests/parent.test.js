import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import { createTestApp } from './helpers.js'
import { signUserToken } from '../auth/jwtUtil.js'

const userId = 'a0000000-0000-4000-8000-000000000001'
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long!!'

describe('GET /api/parent/summary', () => {
  it('returns 401 without Authorization', async () => {
    const app = createTestApp({ query: vi.fn() })
    await request(app).get('/api/parent/summary').expect(401)
  })

  it('returns summary with JWT and mocked pool', async () => {
    const token = signUserToken(userId)
    const mockPool = {
      query: vi.fn(async (sql) => {
        const s = String(sql)
        if (s.includes('FROM users WHERE')) {
          return { rows: [{ name: 'Марк', age: 8 }] }
        }
        if (s.includes('FROM topics t')) {
          return {
            rows: [
              {
                slug: 'addition_10',
                title_ru: 'Сложение до 10',
                title_en: 'Addition up to 10',
                sort_order: 1,
                attempts: 4,
                correct: 3,
              },
            ],
          }
        }
        if (s.includes('SELECT (now() - interval')) {
          return { rows: [{ t: sevenDaysAgo }] }
        }
        return { rows: [] }
      }),
    }
    const app = createTestApp(mockPool)
    const res = await request(app)
      .get('/api/parent/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body.user).toEqual({ name: 'Марк', age: 8 })
    expect(res.body.periodDays).toBe(7)
    expect(res.body.totals).toEqual({ attempts: 4, correct: 3, percentCorrect: 75 })
    expect(res.body.byTopic).toHaveLength(1)
    expect(res.body.byTopic[0]).toMatchObject({
      slug: 'addition_10',
      titleRu: 'Сложение до 10',
      titleEn: 'Addition up to 10',
      attempts: 4,
      correct: 3,
      percentCorrect: 75,
    })
  })
})
