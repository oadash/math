import { randomUUID } from 'crypto'

const ri = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a

function shuffle(a) {
  const arr = [...a]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function gcd(a, b) {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y) {
    const t = y
    y = x % y
    x = t
  }
  return x || 1
}

function toSuperscript(n) {
  const map = { 2: '²', 3: '³', 4: '⁴', 5: '⁵' }
  return map[n] ?? `^${n}`
}

function toSubscript(n) {
  const map = { 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', 10: '₁₀' }
  return map[n] ?? `_${n}`
}

/** 1 correct + 3 wrong: соседи по числовой прямой, допускаются отрицательные. */
export function buildChoices(answer) {
  if (!Number.isFinite(answer)) {
    throw new Error('buildChoices: answer must be finite number')
  }
  const candidates = []
  for (let d = -4; d <= 4; d++) {
    if (d === 0) continue
    candidates.push(answer + d)
  }
  const wrong = []
  const seen = new Set([answer])
  for (const v of shuffle([...new Set(candidates)])) {
    if (wrong.length >= 3) break
    if (!seen.has(v)) {
      seen.add(v)
      wrong.push(v)
    }
  }
  let bump = answer + 5
  while (wrong.length < 3) {
    while (seen.has(bump)) bump += answer >= 0 ? 1 : -1
    seen.add(bump)
    wrong.push(bump)
    bump += 1
  }
  return shuffle([answer, ...wrong])
}

export function buildStringChoices(correct, distractorPool, count = 4) {
  const uniq = [...new Set(distractorPool.filter((s) => s !== correct))]
  const wrong = shuffle(uniq).slice(0, count - 1)
  let k = 0
  while (wrong.length < count - 1) {
    wrong.push(`…${k++}`)
  }
  return shuffle([correct, ...wrong])
}

const generators = {
  addition_10() {
    let a = ri(1, 9)
    let b = ri(1, Math.min(9, 10 - a))
    if (a + b < 2) return generators.addition_10()
    return { display: `${a} + ${b} = ?`, answer: a + b }
  },
  addition_20() {
    const s = ri(4, 20)
    const a = ri(1, s - 1)
    const b = s - a
    return { display: `${a} + ${b} = ?`, answer: s }
  },
  subtraction_10() {
    const a = ri(2, 10)
    const b = ri(1, a - 1)
    return { display: `${a} − ${b} = ?`, answer: a - b }
  },
  addition_100() {
    const a = ri(10, 90)
    const maxB = Math.min(90, 100 - a)
    if (maxB < 10) return generators.addition_100()
    const b = ri(10, maxB)
    return { display: `${a} + ${b} = ?`, answer: a + b }
  },
  subtraction_20() {
    const a = ri(5, 20)
    const b = ri(1, a - 1)
    return { display: `${a} − ${b} = ?`, answer: a - b }
  },
  multiplication_2() {
    const n = ri(1, 10)
    return { display: `${n} × 2 = ?`, answer: n * 2 }
  },
  multiplication_3() {
    const n = ri(1, 10)
    return { display: `${n} × 3 = ?`, answer: n * 3 }
  },
  multiplication_5() {
    const n = ri(2, 10)
    return { display: `${n} × 5 = ?`, answer: n * 5 }
  },
  multiplication_10() {
    const n = ri(1, 10)
    return { display: `${n} × 10 = ?`, answer: n * 10 }
  },
  multiplication_full() {
    const a = ri(2, 9)
    const b = ri(2, 9)
    return { display: `${a} × ${b} = ?`, answer: a * b }
  },
  division_simple() {
    const d = ri(2, 9)
    const q = ri(2, 9)
    const n = d * q
    return { display: `${n} ÷ ${d} = ?`, answer: q }
  },
  multiplication_big() {
    const a = ri(11, 20)
    const b = ri(2, 9)
    return { display: `${a} × ${b} = ?`, answer: a * b }
  },
  division_remainder() {
    const d = ri(2, 9)
    const q = ri(2, 9)
    const r = ri(1, d - 1)
    const n = d * q + r
    return { display: `${n} ÷ ${d} = ? (остаток)`, answer: r }
  },
  fractions_simple() {
    const pairs = [
      { display: '1/2 от 20', answer: 10 },
      { display: '1/4 от 20', answer: 5 },
      { display: '3/4 от 20', answer: 15 },
      { display: '1/3 от 12', answer: 4 },
      { display: '2/3 от 12', answer: 8 },
      { display: '1/2 от 16', answer: 8 },
      { display: '1/4 от 16', answer: 4 },
    ]
    const p = pairs[ri(0, pairs.length - 1)]
    return { display: `${p.display} = ?`, answer: p.answer }
  },
  fractions_compare() {
    const pairs = [
      { a: [1, 2], b: [1, 3] },
      { a: [2, 3], b: [1, 2] },
      { a: [3, 4], b: [2, 3] },
      { a: [1, 4], b: [1, 3] },
    ]
    const p = pairs[ri(0, pairs.length - 1)]
    const sa = `${p.a[0]}/${p.a[1]}`
    const sb = `${p.b[0]}/${p.b[1]}`
    const va = p.a[0] / p.a[1]
    const vb = p.b[0] / p.b[1]
    const winStr = va >= vb ? sa : sb
    const pool = ['1/2', '1/3', '1/4', '2/3', '3/4', '2/5', '3/5', '5/6', '4/5']
    return {
      display: `Какая дробь больше: ${sa} или ${sb}?`,
      stringAnswer: winStr,
      stringChoices: buildStringChoices(winStr, pool),
    }
  },
  fractions_add_sub() {
    const d = ri(2, 9)
    const a = ri(1, d - 1)
    const b = ri(1, d - a)
    return {
      display: `${a}/${d} + ${b}/${d} = ? (числитель)`,
      answer: a + b,
    }
  },
  fractions_add_sub_diff() {
    const k = ri(1, 3)
    return {
      display: `1/2 + ${k}/4 = ? (числитель при знаменателе 4)`,
      answer: 2 + k,
    }
  },
  fractions_multiply() {
    const n1 = ri(1, 3)
    const d1 = ri(2, 5)
    const n2 = ri(1, 3)
    const d2 = ri(2, 5)
    const num = n1 * n2
    const den = d1 * d2
    const g = gcd(num, den)
    const n = num / g
    return {
      display: `${n1}/${d1} × ${n2}/${d2} = ? (числитель несокращённой дроби)`,
      answer: num,
    }
  },
  fractions_divide() {
    const k = ri(2, 8)
    return { display: `1/2 ÷ 1/${2 * k} = ?`, answer: k }
  },
  decimals_basic() {
    const a = ri(1, 9)
    const b = ri(1, 9)
    return { display: `${a}.${b} — сколько целых? (ответ: целая часть)`, answer: a }
  },
  decimals_add_sub() {
    const a = ri(12, 45)
    const b = ri(3, 54)
    return {
      display: `${(a / 10).toFixed(1)} + ${(b / 10).toFixed(1)} = ? (ответ в десятых: 1.5 → 15)`,
      answer: a + b,
    }
  },
  decimals_multiply() {
    const a = ri(2, 8)
    const b = ri(2, 9)
    const p = a * b
    return {
      display: `${(a / 10).toFixed(1)} × ${b} = ? (ответ в десятых)`,
      answer: p,
    }
  },
  percent_basic() {
    const percents = [10, 20, 25, 50]
    const p = percents[ri(0, percents.length - 1)]
    const base = [100, 200, 80, 40, 60][ri(0, 4)]
    return { display: `${p}% от ${base} = ?`, answer: Math.round((base * p) / 100) }
  },
  percent_reverse() {
    const p = [10, 20, 25, 50][ri(0, 3)]
    const whole = ri(5, 30) * 10
    const part = Math.round((whole * p) / 100)
    return { display: `${p}% от какого числа равно ${part}?`, answer: whole }
  },
  negative_numbers() {
    const a = ri(-10, -1)
    const b = ri(1, 10)
    const type = ri(0, 1)
    if (type === 0) return { display: `${a} + ${b} = ?`, answer: a + b }
    return { display: `${b} + (${a}) = ?`, answer: a + b }
  },
  integers_add_sub() {
    const a = ri(-15, 15)
    const b = ri(-15, 15)
    const type = ri(0, 1)
    if (type === 0) return { display: `${a} + (${b}) = ?`, answer: a + b }
    return { display: `${a} − (${b}) = ?`, answer: a - b }
  },
  integers_multiply() {
    const signs = [
      [-1, 1],
      [1, -1],
      [-1, -1],
    ]
    const [sa, sb] = signs[ri(0, 2)]
    const a = ri(2, 9) * sa
    const b = ri(2, 9) * sb
    return { display: `(${a}) × (${b}) = ?`, answer: a * b }
  },
  powers_basic() {
    const pairs = [
      [2, 2],
      [2, 3],
      [2, 4],
      [3, 2],
      [3, 3],
      [4, 2],
      [5, 2],
      [10, 2],
      [10, 3],
    ]
    const [base, exp] = pairs[ri(0, pairs.length - 1)]
    return { display: `${base}${toSuperscript(exp)} = ?`, answer: base ** exp }
  },
  square_root_basic() {
    const roots = [4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144]
    const n = roots[ri(0, roots.length - 1)]
    return { display: `√${n} = ?`, answer: Math.sqrt(n) }
  },
  linear_equation_1() {
    const x = ri(1, 20)
    const a = ri(1, 15)
    const b = x + a
    const type = ri(0, 1)
    if (type === 0) return { display: `x + ${a} = ${b}, x = ?`, answer: x }
    return { display: `x − ${a} = ${x - a}, x = ?`, answer: x }
  },
  linear_equation_2() {
    const x = ri(1, 10)
    const a = ri(2, 5)
    const b = ri(1, 10)
    const c = a * x + b
    return { display: `${a}x + ${b} = ${c}, x = ?`, answer: x }
  },
  linear_equation_3() {
    const x = ri(1, 8)
    const a = ri(3, 7)
    const c = ri(2, a - 1)
    const coeff = a - c
    const b = ri(1, 12)
    const d = coeff * x + b
    return { display: `${a}x + ${b} = ${c}x + ${d}, x = ?`, answer: x }
  },
  ratio_proportion() {
    for (let t = 0; t < 50; t++) {
      const ca = ri(2, 8)
      const cx = ri(2, 8)
      const cc = ri(2, 8)
      const num = ca * cx
      if (num % cc !== 0) continue
      const cb = num / cc
      if (cb < 2 || cb > 20) continue
      return { display: `${ca}/${cb} = ${cc}/x, x = ?`, answer: cx }
    }
    return { display: `2/4 = 3/x, x = ?`, answer: 6 }
  },
  quadratic_simple() {
    const r1 = ri(1, 8)
    const r2 = ri(1, 8)
    const B = -(r1 + r2)
    const C = r1 * r2
    const Babs = Math.abs(B)
    const mid =
      B === 0 ? '' : B < 0 ? ` − ${Babs}x` : B > 0 ? ` + ${B}x` : ''
    return {
      display: `x²${mid} + ${C} = 0, меньший корень?`,
      answer: Math.min(r1, r2),
    }
  },
  quadratic_vieta() {
    const r1 = ri(2, 8)
    const r2 = ri(3, 9)
    return {
      display: `Корни x² + bx + c = 0 равны ${r1} и ${r2}. Чему равна сумма корней?`,
      answer: r1 + r2,
    }
  },
  systems_linear_2() {
    const x = ri(2, 9)
    const y = ri(2, 9)
    const s = x + y
    const d = x - y
    return {
      display: `x + y = ${s}, x − y = ${d}. Найди x?`,
      answer: x,
    }
  },
  inequalities_linear() {
    const xMax = ri(2, 8)
    const a = ri(2, 5)
    const b = ri(0, Math.max(0, a - 2))
    const rhs = a * (xMax + 1) + b - 1
    if (a * xMax + b >= rhs) return generators.inequalities_linear()
    return {
      display: `${a}x + ${b} < ${rhs}, наибольшее целое x?`,
      answer: xMax,
    }
  },
  geometry_area_basic() {
    const shapes = [
      () => {
        const a = ri(3, 12)
        const b = ri(3, 12)
        return { display: `Прямоугольник ${a}×${b}, площадь?`, answer: a * b }
      },
      () => {
        const a = ri(3, 12)
        const h = ri(3, 12)
        return { display: `Треугольник, основание ${a}, высота ${h}, площадь?`, answer: Math.round((a * h) / 2) }
      },
      () => {
        const r = ri(2, 7)
        return { display: `Круг r=${r}, площадь (π≈3)?`, answer: 3 * r * r }
      },
    ]
    return shapes[ri(0, shapes.length - 1)]()
  },
  progressions_arithmetic() {
    const a1 = ri(2, 10)
    const d = ri(2, 5)
    const n = ri(4, 8)
    const an = a1 + d * (n - 1)
    return {
      display: `Арифметическая прогрессия: a₁=${a1}, d=${d}. Чему равен a${n}?`,
      answer: an,
    }
  },
  progressions_geometric() {
    const b1 = ri(2, 5)
    const q = ri(2, 4)
    const n = ri(3, 5)
    const bn = b1 * q ** (n - 1)
    return {
      display: `Геометрическая прогрессия: b₁=${b1}, q=${q}. Чему равен b${n}?`,
      answer: bn,
    }
  },
  trigonometry_basic() {
    const table = [
      { display: 'sin 30°', answerStr: '1/2' },
      { display: 'sin 60°', answerStr: '√3/2' },
      { display: 'cos 60°', answerStr: '1/2' },
      { display: 'cos 30°', answerStr: '√3/2' },
      { display: 'sin 45°', answerStr: '√2/2' },
      { display: 'cos 45°', answerStr: '√2/2' },
      { display: 'tg 45°', answerStr: '1' },
      { display: 'tg 30°', answerStr: '√3/3' },
    ]
    const entry = table[ri(0, table.length - 1)]
    const pool = ['1/2', '√3/2', '√2/2', '√3/3', '1', '√3', '0']
    return {
      display: `${entry.display} = ?`,
      stringAnswer: entry.answerStr,
      stringChoices: buildStringChoices(entry.answerStr, pool),
    }
  },
  logarithms_basic() {
    const tbl = [
      [2, 4, 2],
      [2, 8, 3],
      [2, 16, 4],
      [3, 9, 2],
      [3, 27, 3],
      [5, 25, 2],
      [10, 100, 2],
      [10, 1000, 3],
    ]
    const [a, b, x] = tbl[ri(0, tbl.length - 1)]
    return { display: `log${toSubscript(a)}(${b}) = ?`, answer: x }
  },
  logarithms_equations() {
    const base = 2
    const x = ri(3, 5)
    const rhs = base ** x
    return { display: `log${toSubscript(base)}(t) = ${x}. Чему равно t?`, answer: rhs }
  },
  exponential_equations() {
    const exp = ri(2, 6)
    const rhs = 2 ** exp
    return { display: `2^x = ${rhs}, x = ?`, answer: exp }
  },
  trigonometry_identities() {
    const correct = '1'
    const pool = ['0', '1/2', '√2/2', '2', '1/4']
    return {
      display: 'sin²30° + cos²30° = ?',
      stringAnswer: correct,
      stringChoices: buildStringChoices(correct, pool),
    }
  },
  trigonometry_equations() {
    const correct = '30°'
    const pool = ['30°', '45°', '60°', '90°', '0°']
    return {
      display: 'sin x = 1/2 (0° ≤ x ≤ 90°). x = ?',
      stringAnswer: correct,
      stringChoices: buildStringChoices(correct, pool),
    }
  },
  derivatives_basic() {
    const n = ri(2, 5)
    const c = ri(1, 4)
    return {
      display: `Производная ${c}x${toSuperscript(n)} — коэффициент при x${toSuperscript(n - 1)}?`,
      answer: c * n,
    }
  },
  combinatorics_basic() {
    const type = ri(0, 1)
    if (type === 0) {
      const n = ri(4, 8)
      return { display: `Из ${n} человек выбрать 2. Сколько способов?`, answer: (n * (n - 1)) / 2 }
    }
    const n = ri(3, 6)
    return { display: `${n} человек, 2 места. Сколько вариантов рассадки?`, answer: n * (n - 1) }
  },
  probability_basic() {
    const cases = [
      { display: 'Кубик: шанс выпасть чётному (в %)?', answer: 50 },
      { display: 'Монета: орёл (в %)?', answer: 50 },
      { display: 'Кубик: шанс выпасть > 4 (в %)?', answer: 33 },
      { display: 'Кубик: шанс выпасть 1 (в %)?', answer: 17 },
      { display: '2 монеты: оба орла (в %)?', answer: 25 },
    ]
    return cases[ri(0, cases.length - 1)]
  },
}

/** Все slug, для которых есть генератор (совпадает с seed после ROADMAP). */
export const GENERATOR_SLUGS = Object.freeze(Object.keys(generators))

/**
 * @param {{ slug: string }} topic
 * @returns {object} задача с choices+answer или stringChoices+stringAnswer
 */
export function generateProblem(topic) {
  const slug = typeof topic === 'string' ? topic : topic.slug
  const gen = generators[slug]
  if (!gen) {
    throw new Error(`Unknown topic slug: ${slug}`)
  }
  const raw = gen()
  const id = randomUUID()
  if (raw.stringChoices != null && raw.stringAnswer != null) {
    return {
      id,
      topic_slug: slug,
      display: raw.display,
      stringAnswer: raw.stringAnswer,
      stringChoices: raw.stringChoices,
    }
  }
  const answer = raw.answer
  if (!Number.isFinite(answer)) {
    throw new Error(`Invalid numeric answer for ${slug}`)
  }
  return {
    id,
    topic_slug: slug,
    display: raw.display,
    answer,
    choices: buildChoices(answer),
  }
}
