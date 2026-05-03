import { describe, it, expect } from 'vitest'
import { buildChoices, generateProblem } from '../services/problemGenerator.js'

const SEED_SLUGS = [
  'addition_10',
  'addition_20',
  'subtraction_10',
  'addition_100',
  'subtraction_20',
  'multiplication_2',
  'multiplication_3',
  'multiplication_5',
  'multiplication_10',
  'multiplication_full',
  'division_simple',
]

describe('buildChoices', () => {
  it('has 4 unique ints including answer', () => {
    for (let n = 0; n < 15; n++) {
      const ch = buildChoices(n)
      expect(ch).toHaveLength(4)
      expect(new Set(ch).size).toBe(4)
      expect(ch).toContain(n)
      for (const x of ch) {
        expect(x).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('wrong options within reasonable distance for small answers', () => {
    const ch = buildChoices(7)
    for (const x of ch) {
      if (x !== 7) expect(Math.abs(x - 7)).toBeLessThanOrEqual(6)
    }
  })
})

describe('generateProblem', () => {
  it('covers all seed slugs', () => {
    for (const slug of SEED_SLUGS) {
      const p = generateProblem({ slug })
      expect(p.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
      expect(p.topic_slug).toBe(slug)
      expect(p.display).toContain('?')
      expect(Number.isInteger(p.answer)).toBe(true)
      expect(p.choices).toHaveLength(4)
      expect(p.choices).toContain(p.answer)
    }
  })

  it('addition_10 sums do not exceed 10', () => {
    for (let i = 0; i < 30; i++) {
      const p = generateProblem({ slug: 'addition_10' })
      const m = p.display.match(/(\d+)\s*\+\s*(\d+)/)
      expect(m).toBeTruthy()
      const a = Number(m[1])
      const b = Number(m[2])
      expect(a + b).toBeLessThanOrEqual(10)
      expect(a + b).toBe(p.answer)
    }
  })

  it('throws on unknown slug', () => {
    expect(() => generateProblem({ slug: 'nope' })).toThrow(/Unknown topic slug/)
  })
})
