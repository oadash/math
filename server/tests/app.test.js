import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createTestApp } from './helpers.js'
import { signUserToken } from '../auth/jwtUtil.js'
import { invalidateTopicCache } from '../services/topicCache.js'

const userId = 'a0000000-0000-4000-8000-000000000001'

describe('HTTP app', () => {
  beforeEach(() => {
    invalidateTopicCache()
  })

  it('GET /health returns ok', async () => {
    const app = createTestApp(null)
    const res = await request(app).get('/health').expect(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.service).toBe('math-adventure-api')
    expect(res.body.databaseConfigured).toBe(false)
    expect(res.headers['x-api-revision']).toBeDefined()
  })

  it('GET /api/me without token returns 401 when DB pool exists', async () => {
    const mockPool = { query: async () => ({ rows: [] }) }
    const app = createTestApp(mockPool)
    await request(app).get('/api/me').expect(401)
  })

  it('POST /api/users rejects grade out of 1–11', async () => {
    const app = createTestApp({ query: vi.fn() })
    await request(app).post('/api/users').send({ name: 'Аня', age: 8, grade: 12 }).expect(400)
  })

  it('POST /api/users with pool=null returns 503', async () => {
    const app = createTestApp(null)
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Тест', age: 8 })
      .expect(503)
    expect(res.body.error).toBe('database_unavailable')
  })

  it('POST /api/topic/pin without token returns 401', async () => {
    const app = createTestApp({ query: vi.fn() })
    await request(app).post('/api/topic/pin').send({ topicSlug: 'addition_10' }).expect(401)
  })

  it('POST /api/topic/pin allows locked topic (самостоятельная практика)', async () => {
    const token = signUserToken(userId)
    const mockPool = {
      query: vi.fn(async (sql) => {
        const s = String(sql)
        if (s.includes('FROM topics') && s.includes('ORDER BY sort_order')) {
          return {
            rows: [
              {
                id: '11111111-1111-4111-8111-111111111111',
                slug: 'fractions_simple',
                title_ru: 'Дроби',
                title_en: 'Fractions',
                prerequisite_topic_id: null,
                sort_order: 10,
              },
            ],
          }
        }
        if (s.includes('FROM user_topic_state WHERE')) {
          return { rows: [{ state: 'locked' }] }
        }
        if (s.includes('UPDATE users SET pinned_topic_slug')) {
          return { rowCount: 1, rows: [] }
        }
        return { rows: [] }
      }),
    }
    const app = createTestApp(mockPool)
    const res = await request(app)
      .post('/api/topic/pin')
      .set('Authorization', `Bearer ${token}`)
      .send({ topicSlug: 'fractions_simple' })
      .expect(200)
    expect(res.body.ok).toBe(true)
  })

  it('POST /api/topic/pin returns 403 without user_topic_state row', async () => {
    const token = signUserToken(userId)
    const mockPool = {
      query: vi.fn(async (sql) => {
        const s = String(sql)
        if (s.includes('FROM topics') && s.includes('ORDER BY sort_order')) {
          return {
            rows: [
              {
                id: '11111111-1111-4111-8111-111111111111',
                slug: 'addition_10',
                title_ru: 'Сложение',
                title_en: 'Addition',
                prerequisite_topic_id: null,
                sort_order: 1,
              },
            ],
          }
        }
        if (s.includes('FROM user_topic_state WHERE')) {
          return { rows: [] }
        }
        return { rows: [] }
      }),
    }
    const app = createTestApp(mockPool)
    await request(app)
      .post('/api/topic/pin')
      .set('Authorization', `Bearer ${token}`)
      .send({ topicSlug: 'addition_10' })
      .expect(403)
  })

  it('POST /api/topic/unpin clears pin with JWT', async () => {
    const token = signUserToken(userId)
    const mockPool = {
      query: vi.fn(async (sql) => {
        if (String(sql).includes('UPDATE users SET pinned_topic_slug = NULL')) {
          return { rowCount: 1, rows: [] }
        }
        return { rows: [] }
      }),
    }
    const app = createTestApp(mockPool)
    await request(app)
      .post('/api/topic/unpin')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(mockPool.query).toHaveBeenCalled()
    const unpinCall = mockPool.query.mock.calls.find((c) =>
      String(c[0]).includes('pinned_topic_slug = NULL'),
    )
    expect(unpinCall).toBeDefined()
  })
})
