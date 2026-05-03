import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import { createTestApp } from './helpers.js'
import { verifyUserToken } from '../auth/jwtUtil.js'

const uid = 'b0000000-0000-4000-8000-000000000002'

describe('POST /api/users/restore', () => {
  it('returns 404 for unknown code', async () => {
    const mockPool = {
      query: vi.fn(async (_sql, params) => {
        if (params?.[0] === 'ZZZZ-9999') return { rows: [] }
        return { rows: [] }
      }),
    }
    const app = createTestApp(mockPool)
    const res = await request(app)
      .post('/api/users/restore')
      .send({ code: 'ZZZZ-9999' })
      .expect(404)
    expect(res.body.error).toBe('not_found')
  })

  it('returns JWT for valid shortcode', async () => {
    const mockPool = {
      query: vi.fn(async (_sql, params) => {
        if (params?.[0] === 'MARK-1234') return { rows: [{ id: uid }] }
        return { rows: [] }
      }),
    }
    const app = createTestApp(mockPool)
    const res = await request(app).post('/api/users/restore').send({ code: 'mark-1234' }).expect(200)

    expect(res.body.token).toBeTruthy()
    expect(verifyUserToken(res.body.token)).toBe(uid)
  })

  it('same code yields same user id in token', async () => {
    const mockPool = {
      query: vi.fn(async () => ({ rows: [{ id: uid }] })),
    }
    const app = createTestApp(mockPool)
    const r1 = await request(app).post('/api/users/restore').send({ code: 'ANY-1111' }).expect(200)
    const r2 = await request(app).post('/api/users/restore').send({ code: 'ANY-1111' }).expect(200)
    expect(verifyUserToken(r1.body.token)).toBe(verifyUserToken(r2.body.token))
  })
})
