import { describe, it, expect } from 'vitest'
import { buildChoices, buildStringChoices, generateProblem, GENERATOR_SLUGS } from '../services/problemGenerator.js'

const STRING_SLUGS = new Set([
  'fractions_compare',
  'trigonometry_basic',
  'trigonometry_identities',
  'trigonometry_equations',
])

describe('buildChoices', () => {
  it('has 4 unique ints including answer', () => {
    for (let n = -3; n < 15; n++) {
      const ch = buildChoices(n)
      expect(ch).toHaveLength(4)
      expect(new Set(ch).size).toBe(4)
      expect(ch).toContain(n)
    }
  })

  it('wrong options within reasonable distance for small answers', () => {
    const ch = buildChoices(7)
    for (const x of ch) {
      if (x !== 7) expect(Math.abs(x - 7)).toBeLessThanOrEqual(8)
    }
  })
})

describe('buildStringChoices', () => {
  it('includes correct string once', () => {
    const ch = buildStringChoices('1/2', ['1/3', '1/4', '2/3', '3/4'])
    expect(ch).toHaveLength(4)
    expect(new Set(ch).size).toBe(4)
    expect(ch).toContain('1/2')
  })
})

describe('generateProblem', () => {
  it('covers all generator slugs', () => {
    for (const slug of GENERATOR_SLUGS) {
      const p = generateProblem({ slug })
      expect(p.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
      expect(p.topic_slug).toBe(slug)
      expect(p.display).toMatch(/\?|Найди|чему равн/i)

      if (STRING_SLUGS.has(slug)) {
        expect(p.stringAnswer).toBeTruthy()
        expect(p.stringChoices).toHaveLength(4)
        expect(new Set(p.stringChoices).size).toBe(4)
        expect(p.stringChoices).toContain(p.stringAnswer)
        expect(p.answer).toBeUndefined()
        expect(p.choices).toBeUndefined()
      } else {
        expect(Number.isFinite(p.answer)).toBe(true)
        expect(p.choices).toHaveLength(4)
        expect(p.choices).toContain(p.answer)
        expect(p.stringChoices).toBeUndefined()
      }
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
