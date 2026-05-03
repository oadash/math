/** Первая тема для ребёнка данного класса (1–11). Остальные до неё по sort_order — mastered. */
export const GRADE_START_SLUG = {
  1: 'addition_10',
  2: 'addition_20',
  3: 'multiplication_2',
  4: 'division_simple',
  5: 'fractions_simple',
  6: 'fractions_add_sub_diff',
  7: 'linear_equation_1',
  8: 'quadratic_simple',
  9: 'progressions_arithmetic',
  10: 'logarithms_basic',
  11: 'derivatives_basic',
}

export function getStartSlug(grade) {
  if (grade == null) return 'addition_10'
  return GRADE_START_SLUG[grade] ?? 'addition_10'
}
