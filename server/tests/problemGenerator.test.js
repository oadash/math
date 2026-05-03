import { describe, it, expect } from 'vitest'
import { buildChoices, buildStringChoices, generateProblem, GENERATOR_SLUGS } from '../services/problemGenerator.js'
import { generateProblemEn } from '../services/problemGeneratorEn.js'

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

const NUMERIC_SLUGS = GENERATOR_SLUGS.filter((s) => !STRING_SLUGS.has(s))

const TRIVIAL_ANSWER_WHITELIST = new Set([
  'decimals_basic',
  'fractions_simple',
  'geometry_area_basic',
])

const NEGATIVE_CHOICES_WHITELIST = new Set([
  'negative_numbers',
  'integers_add_sub',
  'integers_multiply',
  'linear_equation_3',
  'quadratic_vieta',
  'quadratic_simple',
])

const QUALITY_RUNS = 200

const ANSWER_RANGES = {
  addition_10: { min: 2, max: 10 },
  addition_20: { min: 2, max: 20 },
  subtraction_10: { min: 1, max: 9 },
  addition_100: { min: 20, max: 100 },
  subtraction_20: { min: 1, max: 19 },
  multiplication_2: { min: 4, max: 20 },
  multiplication_3: { min: 6, max: 30 },
  multiplication_5: { min: 10, max: 50 },
  multiplication_10: { min: 20, max: 100 },
  multiplication_full: { min: 4, max: 81 },
  division_simple: { min: 2, max: 9 },
  multiplication_big: { min: 22, max: 180 },
  division_remainder: { min: 1, max: 8 },
  fractions_simple: { min: 4, max: 15 },
  fractions_add_sub: { min: 2, max: 16 },
  fractions_add_sub_diff: { min: 3, max: 5 },
  fractions_multiply: { min: 1, max: 9 },
  fractions_divide: { min: 3, max: 8 },
  decimals_basic: { min: 1, max: 9 },
  decimals_add_sub: { min: 15, max: 99 },
  decimals_multiply: { min: 4, max: 72 },
  percent_basic: { min: 4, max: 100 },
  percent_reverse: { min: 50, max: 300 },
  negative_numbers: { min: -9, max: 9 },
  integers_add_sub: { min: -30, max: 30 },
  integers_multiply: { min: -81, max: 81 },
  powers_basic: { min: 4, max: 1000 },
  square_root_basic: { min: 2, max: 12 },
  linear_equation_1: { min: 1, max: 20 },
  linear_equation_2: { min: 1, max: 10 },
  linear_equation_3: { min: 1, max: 10 },
  ratio_proportion: { min: 2, max: 30 },
  quadratic_simple: { min: 1, max: 8 },
  quadratic_vieta: { min: -18, max: 81 },
  systems_linear_2: { min: 1, max: 8 },
  inequalities_linear: { min: 2, max: 8 },
  geometry_area_basic: { min: 5, max: 147 },
  progressions_arithmetic: { min: 1, max: 220 },
  progressions_geometric: { min: 8, max: 1280 },
  logarithms_basic: { min: 2, max: 5 },
  logarithms_equations: { min: 8, max: 32 },
  exponential_equations: { min: 3, max: 6 },
  derivatives_basic: { min: 4, max: 30 },
  combinatorics_basic: { min: 6, max: 120 },
  probability_basic: { min: 17, max: 88 },
}

describe('problem quality — answer not trivially visible', () => {
  for (const slug of NUMERIC_SLUGS) {
    it(`[${slug}] answer never appears verbatim in display numbers`, () => {
      if (TRIVIAL_ANSWER_WHITELIST.has(slug)) return

      for (let i = 0; i < QUALITY_RUNS; i++) {
        const p = generateProblem({ slug })
        const numsInDisplay = (p.display.match(/-?\d+(\.\d+)?/g) ?? []).map(Number)
        expect(numsInDisplay).not.toContain(p.answer)
      }
    })
  }
})

describe('problem quality — choices are valid', () => {
  for (const slug of NUMERIC_SLUGS) {
    it(`[${slug}] choices: 4 unique values, contains answer, negatives per policy`, () => {
      for (let i = 0; i < QUALITY_RUNS; i++) {
        const p = generateProblem({ slug })

        expect(new Set(p.choices).size).toBe(4)
        expect(p.choices).toContain(p.answer)

        if (!NEGATIVE_CHOICES_WHITELIST.has(slug)) {
          const negatives = p.choices.filter((c) => typeof c === 'number' && c < 0)
          expect(negatives).toHaveLength(0)
        }
      }
    })
  }
})

describe('problem quality — answer in expected range', () => {
  for (const slug of NUMERIC_SLUGS) {
    const range = ANSWER_RANGES[slug]
    if (!range) throw new Error(`Add ANSWER_RANGES for ${slug}`)

    it(`[${slug}] answer always in [${range.min}, ${range.max}]`, () => {
      for (let i = 0; i < QUALITY_RUNS; i++) {
        const p = generateProblem({ slug })
        expect(p.answer).toBeGreaterThanOrEqual(range.min)
        expect(p.answer).toBeLessThanOrEqual(range.max)
      }
    })
  }
})

describe('problem quality — display is well-formed', () => {
  for (const slug of NUMERIC_SLUGS) {
    it(`[${slug}] display contains ? and is non-empty`, () => {
      for (let i = 0; i < QUALITY_RUNS; i++) {
        const p = generateProblem({ slug })
        expect(p.display.length).toBeGreaterThan(3)
        expect(p.display).toContain('?')
      }
    })

    it(`[${slug}] always returns valid uuid`, () => {
      const p = generateProblem({ slug })
      expect(p.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
    })
  }
})

describe('problem quality — no infinite loops', () => {
  it('generates 1000 problems across all topics without hanging', () => {
    const start = Date.now()
    const slugs = [...GENERATOR_SLUGS]
    for (let i = 0; i < 1000; i++) {
      generateProblem({ slug: slugs[i % slugs.length] })
    }
    expect(Date.now() - start).toBeLessThan(2000)
  })
})

describe('generateProblemEn', () => {
  it('covers all generator slugs', () => {
    for (const slug of GENERATOR_SLUGS) {
      const p = generateProblemEn({ slug })
      expect(p.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
      expect(p.topic_slug).toBe(slug)
      expect(p.display).toContain('?')

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

  it('throws on unknown slug', () => {
    expect(() => generateProblemEn({ slug: 'nope' })).toThrow(/Unknown topic slug/)
  })
})

describe('problem quality EN — answer not trivially visible', () => {
  for (const slug of NUMERIC_SLUGS) {
    it(`[${slug}] answer never appears verbatim in display numbers`, () => {
      if (TRIVIAL_ANSWER_WHITELIST.has(slug)) return

      for (let i = 0; i < QUALITY_RUNS; i++) {
        const p = generateProblemEn({ slug })
        const numsInDisplay = (p.display.match(/-?\d+(\.\d+)?/g) ?? []).map(Number)
        expect(numsInDisplay).not.toContain(p.answer)
      }
    })
  }
})

describe('problem quality EN — choices are valid', () => {
  for (const slug of NUMERIC_SLUGS) {
    it(`[${slug}] choices: 4 unique values, contains answer, negatives per policy`, () => {
      for (let i = 0; i < QUALITY_RUNS; i++) {
        const p = generateProblemEn({ slug })

        expect(new Set(p.choices).size).toBe(4)
        expect(p.choices).toContain(p.answer)

        if (!NEGATIVE_CHOICES_WHITELIST.has(slug)) {
          const negatives = p.choices.filter((c) => typeof c === 'number' && c < 0)
          expect(negatives).toHaveLength(0)
        }
      }
    })
  }
})

describe('problem quality EN — answer in expected range', () => {
  for (const slug of NUMERIC_SLUGS) {
    const range = ANSWER_RANGES[slug]
    if (!range) throw new Error(`Add ANSWER_RANGES for ${slug}`)

    it(`[${slug}] answer always in [${range.min}, ${range.max}]`, () => {
      for (let i = 0; i < QUALITY_RUNS; i++) {
        const p = generateProblemEn({ slug })
        expect(p.answer).toBeGreaterThanOrEqual(range.min)
        expect(p.answer).toBeLessThanOrEqual(range.max)
      }
    })
  }
})

describe('problem quality EN — display is well-formed', () => {
  for (const slug of NUMERIC_SLUGS) {
    it(`[${slug}] display contains ? and is non-empty`, () => {
      for (let i = 0; i < QUALITY_RUNS; i++) {
        const p = generateProblemEn({ slug })
        expect(p.display.length).toBeGreaterThan(3)
        expect(p.display).toContain('?')
      }
    })

    it(`[${slug}] always returns valid uuid`, () => {
      const p = generateProblemEn({ slug })
      expect(p.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
    })
  }
})

describe('problem quality EN — no infinite loops', () => {
  it('generates 1000 problems across all topics without hanging', () => {
    const start = Date.now()
    const slugs = [...GENERATOR_SLUGS]
    for (let i = 0; i < 1000; i++) {
      generateProblemEn({ slug: slugs[i % slugs.length] })
    }
    expect(Date.now() - start).toBeLessThan(2000)
  })
})
