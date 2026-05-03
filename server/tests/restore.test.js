import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { createTestApp } from './helpers.js'
import { verifyUserToken } from '../auth/jwtUtil.js'

const uid = 'b0000000-0000-4000-8000-000000000002'

describe('POST /api/users/restore', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long!!'
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

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

  it('rate-limits after 10 failed restore attempts from one IP', async () => {
    const mockPool = {
      query: vi.fn(async () => ({ rows: [] })),
    }
    const app = createTestApp(mockPool)

    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/api/users/restore')
        .send({ code: `NOPE-${1000 + i}` })
        .expect(404)
    }

    const res = await request(app)
      .post('/api/users/restore')
      .send({ code: 'NOPE-9999' })
      .expect(429)
    expect(res.body.error).toBe('rate_limited')
  })

  it('successful restore clears failed-attempt counter', async () => {
    const mockPool = {
      query: vi.fn(async (_sql, params) => {
        if (params?.[0] === 'GOOD-1111') return { rows: [{ id: uid }] }
        return { rows: [] }
      }),
    }
    const app = createTestApp(mockPool)

    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/users/restore')
        .send({ code: `BAD-${1000 + i}` })
        .expect(404)
    }

    await request(app).post('/api/users/restore').send({ code: 'GOOD-1111' }).expect(200)

    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/api/users/restore')
        .send({ code: `BAD-${2000 + i}` })
        .expect(404)
    }

    await request(app).post('/api/users/restore').send({ code: 'BAD-9999' }).expect(429)
  })
})
