import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getJwtSecret,
  signUserToken,
  verifyUserToken,
  signProblemToken,
  verifyProblemToken,
} from '../auth/jwtUtil.js'

describe('jwtUtil', () => {
  const prev = { ...process.env }

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long!!'
    delete process.env.NODE_ENV
  })

  afterEach(() => {
    process.env = { ...prev }
  })

  it('getJwtSecret uses JWT_SECRET', () => {
    expect(getJwtSecret()).toBe('test-secret-at-least-32-chars-long!!')
  })

  it('getJwtSecret returns null when JWT_SECRET is missing', () => {
    delete process.env.JWT_SECRET
    expect(getJwtSecret()).toBeNull()
  })

  it('round-trip user token', () => {
    const t = signUserToken('550e8400-e29b-41d4-a716-446655440000')
    expect(verifyUserToken(t)).toBe('550e8400-e29b-41d4-a716-446655440000')
  })

  it('round-trip problem token', () => {
    const payload = { problemId: 'p1', topicSlug: 'addition_10', answer: 7 }
    const t = signProblemToken(payload)
    expect(verifyProblemToken(t)).toMatchObject(payload)
  })
})
