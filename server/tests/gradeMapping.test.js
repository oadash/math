import { describe, it, expect } from 'vitest'
import { getStartSlug, GRADE_START_SLUG } from '../services/gradeMapping.js'
import { SLUG_TO_GRADE } from '../services/seoMeta.js'

describe('gradeMapping', () => {
  it('maps grades 1–11', () => {
    expect(getStartSlug(1)).toBe('addition_10')
    expect(getStartSlug(4)).toBe('division_simple')
    expect(getStartSlug(11)).toBe('derivatives_basic')
  })

  it('defaults for null or unknown', () => {
    expect(getStartSlug(null)).toBe('addition_10')
    expect(getStartSlug(undefined)).toBe('addition_10')
    expect(getStartSlug(99)).toBe('addition_10')
  })

  it('GRADE_START_SLUG has 11 entries', () => {
    expect(Object.keys(GRADE_START_SLUG).length).toBe(11)
  })

  it('start slugs match seo grade mapping', () => {
    for (const [grade, slug] of Object.entries(GRADE_START_SLUG)) {
      expect(SLUG_TO_GRADE[slug]).toBe(Number(grade))
    }
  })
})
