import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createTestApp } from './helpers.js'

describe('HTTP app', () => {
  it('GET /health returns ok', async () => {
    const app = createTestApp(null)
    const res = await request(app).get('/health').expect(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.service).toBe('math-adventure-api')
    expect(res.headers['x-api-revision']).toBeDefined()
  })

  it('GET /api/me without token returns 401 when DB pool exists', async () => {
    const mockPool = { query: async () => ({ rows: [] }) }
    const app = createTestApp(mockPool)
    await request(app).get('/api/me').expect(401)
  })

  it('POST /api/users with pool=null returns 503', async () => {
    const app = createTestApp(null)
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Тест', age: 8 })
      .expect(503)
    expect(res.body.error).toBe('database_unavailable')
  })
})
