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
  const map = {
    1: '₁',
    2: '₂',
    3: '₃',
    4: '₄',
    5: '₅',
    6: '₆',
    7: '₇',
    8: '₈',
    9: '₉',
    10: '₁₀',
  }
  return map[n] ?? `_${n}`
}

/**
 * 1 correct + 3 wrong: соседи по числовой прямой.
 * Для неотрицательного ответа неверные варианты тоже неотрицательны (кроме самого ответа).
 */
export function buildChoices(answer) {
  if (!Number.isFinite(answer)) {
    throw new Error('buildChoices: answer must be finite number')
  }
  const candidates = []
  for (let d = -4; d <= 4; d++) {
    if (d === 0) continue
    const v = answer + d
    if (answer >= 0 && v < 0) continue
    candidates.push(v)
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
  let bump = answer >= 0 ? Math.max(answer + 5, 1) : answer + 5
  while (wrong.length < 3) {
    while (seen.has(bump)) bump += answer >= 0 ? 1 : -1
    if (answer >= 0 && bump < 0) bump = 0
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
    return { display: `${a} + ${b} = ?`, answer: a + b }
  },
  addition_20() {
    const s = ri(4, 20)
    const a = ri(1, s - 1)
    const b = s - a
    return { display: `${a} + ${b} = ?`, answer: s }
  },
  subtraction_10() {
    for (let attempt = 0; attempt < 40; attempt++) {
      const a = ri(2, 10)
      const b = ri(1, a - 1)
      const ans = a - b
      if (ans === b || ans === a) continue
      return { display: `${a} − ${b} = ?`, answer: ans }
    }
    return { display: `7 − 2 = ?`, answer: 5 }
  },
  addition_100() {
    const a = ri(10, 90)
    const maxB = Math.min(90, 100 - a)
    const b = ri(10, maxB)
    return { display: `${a} + ${b} = ?`, answer: a + b }
  },
  subtraction_20() {
    for (let attempt = 0; attempt < 50; attempt++) {
      const a = ri(5, 20)
      const b = ri(1, a - 1)
      const ans = a - b
      if (ans === b || ans === a) continue
      return { display: `${a} − ${b} = ?`, answer: ans }
    }
    return { display: `15 − 4 = ?`, answer: 11 }
  },
  multiplication_2() {
    const n = ri(2, 10)
    return { display: `${n} × 2 = ?`, answer: n * 2 }
  },
  multiplication_3() {
    const n = ri(2, 10)
    return { display: `${n} × 3 = ?`, answer: n * 3 }
  },
  multiplication_5() {
    const n = ri(2, 10)
    return { display: `${n} × 5 = ?`, answer: n * 5 }
  },
  multiplication_10() {
    const n = ri(2, 10)
    return { display: `${n} × 10 = ?`, answer: n * 10 }
  },
  multiplication_full() {
    const a = ri(2, 9)
    const b = ri(2, 9)
    return { display: `${a} × ${b} = ?`, answer: a * b }
  },
  division_simple() {
    for (let attempt = 0; attempt < 40; attempt++) {
      const d = ri(2, 9)
      const q = ri(2, 9)
      if (q === d) continue
      const n = d * q
      if ([n, d].includes(q)) continue
      return { display: `${n} ÷ ${d} = ?`, answer: q }
    }
    return { display: `24 ÷ 4 = ?`, answer: 6 }
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
    for (let attempt = 0; attempt < 50; attempt++) {
      const d = ri(2, 9)
      const a = ri(1, d - 1)
      const b = ri(1, d - a)
      const s = a + b
      if (s === d) continue
      return {
        display: `${a}/${d} + ${b}/${d} = ? (числитель)`,
        answer: s,
      }
    }
    return { display: `2/7 + 3/7 = ? (числитель)`, answer: 5 }
  },
  fractions_add_sub_diff() {
    const k = [1, 3][ri(0, 1)]
    return {
      display: `1/2 + ${k}/4 = ? (числитель при знаменателе 4)`,
      answer: 2 + k,
    }
  },
  fractions_multiply() {
    for (let attempt = 0; attempt < 40; attempt++) {
      const n1 = ri(1, 3)
      const d1 = ri(2, 5)
      const n2 = ri(1, 3)
      const d2 = ri(2, 5)
      const num = n1 * n2
      if ([n1, d1, n2, d2].includes(num)) continue
      return {
        display: `${n1}/${d1} × ${n2}/${d2} = ? (числитель несокращённой дроби)`,
        answer: num,
      }
    }
    return { display: `2/3 × 2/3 = ? (числитель несокращённой дроби)`, answer: 4 }
  },
  fractions_divide() {
    const k = ri(3, 8)
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
      display: `${(a / 10).toFixed(1)} + ${(b / 10).toFixed(1)} = ? (сумма в десятых долях, ответ целым без запятой)`,
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
    for (let attempt = 0; attempt < 40; attempt++) {
      const percents = [10, 20, 25, 50]
      const p = percents[ri(0, percents.length - 1)]
      const base = [100, 200, 80, 40, 60][ri(0, 4)]
      const ans = Math.round((base * p) / 100)
      if ([p, base].includes(ans)) continue
      return { display: `${p}% от ${base} = ?`, answer: ans }
    }
    return { display: `10% от 250 = ?`, answer: 25 }
  },
  percent_reverse() {
    for (let attempt = 0; attempt < 50; attempt++) {
      const p = [10, 20, 25, 50][ri(0, 3)]
      const whole = ri(5, 30) * 10
      const part = Math.round((whole * p) / 100)
      if (part === 0 || [p, part].includes(whole)) continue
      return { display: `${p}% от какого числа равно ${part}?`, answer: whole }
    }
    return { display: `25% от какого числа равно 40?`, answer: 160 }
  },
  negative_numbers() {
    for (let attempt = 0; attempt < 60; attempt++) {
      const a = ri(-10, -1)
      const b = ri(1, 10)
      const type = ri(0, 1)
      const ans = a + b
      if (ans === 0) continue
      if (type === 0) return { display: `${a} + ${b} = ?`, answer: ans }
      return { display: `${b} + (${a}) = ?`, answer: ans }
    }
    return { display: `-3 + 5 = ?`, answer: 2 }
  },
  integers_add_sub() {
    for (let attempt = 0; attempt < 80; attempt++) {
      const a = ri(-15, 15)
      const b = ri(-15, 15)
      const type = ri(0, 1)
      if (type === 0) {
        if (b === 0) continue
        const ans = a + b
        if (ans === 0 || ans === a || ans === b) continue
        return { display: `${a} + (${b}) = ?`, answer: ans }
      }
      if (b === 0 || a === b) continue
      const ans = a - b
      if (ans === 0 || ans === a || ans === b) continue
      return { display: `${a} − (${b}) = ?`, answer: ans }
    }
    return { display: `5 − (2) = ?`, answer: 3 }
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
    for (let attempt = 0; attempt < 60; attempt++) {
      const x = ri(1, 20)
      const a = ri(1, 15)
      if (x === a) continue
      const b = x + a
      const type = ri(0, 1)
      if (type === 0) {
        if (x === b) continue
        return { display: `x + ${a} = ${b}, x = ?`, answer: x }
      }
      const rhs = x - a
      if (x === rhs) continue
      return { display: `x − ${a} = ${rhs}, x = ?`, answer: x }
    }
    return { display: `x + 9 = 17, x = ?`, answer: 8 }
  },
  linear_equation_2() {
    for (let attempt = 0; attempt < 80; attempt++) {
      const x = ri(1, 10)
      const a = ri(2, 5)
      const b = ri(1, 10)
      const c = a * x + b
      if ([a, b, c].includes(x)) continue
      return { display: `${a}x + ${b} = ${c}, x = ?`, answer: x }
    }
    return { display: `3x + 2 = 17, x = ?`, answer: 5 }
  },
  linear_equation_3() {
    for (let attempt = 0; attempt < 120; attempt++) {
      const x = ri(1, 10)
      const a = ri(2, 6)
      const c = ri(2, 6)
      if (a === c) continue
      const b = ri(1, 10)
      const d = b + (a - c) * x
      if (d < 0 || d > 30 || [a, b, c, d].includes(x)) continue
      return { display: `${a}x + ${b} = ${c}x + ${d}, x = ?`, answer: x }
    }
    return { display: `5x + 2 = 2x + 17, x = ?`, answer: 5 }
  },
  ratio_proportion() {
    const solutions = []
    for (let aa = 2; aa <= 8; aa++) {
      for (let bb = 2; bb <= 8; bb++) {
        for (let cc = 2; cc <= 8; cc++) {
          const xx = (bb * cc) / aa
          if (
            Number.isInteger(xx) &&
            xx >= 2 &&
            xx <= 30 &&
            ![aa, bb, cc].includes(xx)
          ) {
            solutions.push({ a: aa, b: bb, c: cc, x: xx })
          }
        }
      }
    }
    const s = solutions[ri(0, solutions.length - 1)]
    return { display: `${s.a}/${s.b} = ${s.c}/x, x = ?`, answer: s.x }
  },
  quadratic_simple() {
    for (let attempt = 0; attempt < 80; attempt++) {
      const x1 = ri(1, 8)
      const x2 = ri(x1 + 1, 9)
      const bCoeff = -(x1 + x2)
      const cCoeff = x1 * x2
      if (x1 === Math.abs(bCoeff) || x1 === cCoeff) continue
      const bStr = bCoeff < 0 ? `${bCoeff}` : `+${bCoeff}`
      const cStr = cCoeff > 0 ? `+${cCoeff}` : `${cCoeff}`
      return {
        display: `x² ${bStr}x ${cStr} = 0, меньший корень?`,
        answer: x1,
      }
    }
    return { display: `x² -7x +12 = 0, меньший корень?`, answer: 3 }
  },
  quadratic_vieta() {
    const x1 = ri(1, 9)
    const x2 = ri(1, 9)
    const b = -(x1 + x2)
    const c = x1 * x2
    const type = ri(0, 2)

    if (type === 2 && (b === x1 || b === x2)) {
      return { display: `x² + bx + ${c} = 0, корни ${x1} и ${x2}. Чему равно b?`, answer: b }
    }

    if (type === 0) {
      const bx = b < 0 ? `${b}x` : `+${b}x`
      return {
        display: `x² ${bx} + ? = 0, корни целые положительные. Произведение корней?`,
        answer: c,
      }
    }

    if (type === 1) {
      if (x1 === x2 || x2 === c) {
        return { display: `x² -5x + 6 = 0, один корень = 2. Второй корень?`, answer: 3 }
      }
      const bx = b < 0 ? `${b}x` : `+${b}x`
      return {
        display: `x² ${bx} + ${c} = 0, один корень = ${x1}. Второй корень?`,
        answer: x2,
      }
    }

    return {
      display: `x² + bx + ${c} = 0, корни ${x1} и ${x2}. Чему равно b?`,
      answer: b,
    }
  },
  systems_linear_2() {
    for (let attempt = 0; attempt < 200; attempt++) {
      const x = ri(1, 8)
      const y = ri(1, 8)
      const a1 = ri(1, 4)
      const b1 = ri(1, 4)
      const a2 = ri(1, 4)
      const b2 = ri(1, 4)
      const det = a1 * b2 - a2 * b1
      if (det === 0) continue
      const c1 = a1 * x + b1 * y
      const c2 = a2 * x + b2 * y
      const nums = [a1, b1, c1, a2, b2, c2]
      if (nums.includes(x) || nums.includes(y)) continue
      return {
        display: `${a1}x + ${b1}y = ${c1}\n${a2}x + ${b2}y = ${c2}\nx = ?`,
        answer: x,
      }
    }
    return {
      display: `2x + 3y = 11\nx + y = 5\nx = ?`,
      answer: 4,
    }
  },
  inequalities_linear() {
    for (let attempt = 0; attempt < 60; attempt++) {
      const xMax = ri(2, 8)
      const a = ri(2, 5)
      const b = ri(0, Math.max(0, a - 2))
      const rhs = a * (xMax + 1) + b - 1
      if (a * xMax + b >= rhs) continue
      if ([a, b, rhs].includes(xMax)) continue
      return {
        display: `${a}x + ${b} < ${rhs}, наибольшее целое x?`,
        answer: xMax,
      }
    }
    return { display: `3x + 1 < 16, наибольшее целое x?`, answer: 4 }
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
    const a1 = ri(1, 10)
    const d = ri(1, 5)
    const type = ri(0, 2)

    if (type === 0) {
      const n = ri(5, 10)
      const an = a1 + (n - 1) * d
      return {
        display: `a₁=${a1}, d=${d}. Найди a${toSubscript(n)}?`,
        answer: an,
      }
    }

    if (type === 1) {
      const n1 = ri(2, 4)
      const n2 = n1 + ri(2, 4)
      const an1 = a1 + (n1 - 1) * d
      const an2 = a1 + (n2 - 1) * d
      if (
        d === an1 ||
        d === an2 ||
        d === n1 ||
        d === n2
      ) {
        return { display: `a₂=5, a₅=14. Найди d?`, answer: 3 }
      }
      return {
        display: `a${toSubscript(n1)}=${an1}, a${toSubscript(n2)}=${an2}. Найди d?`,
        answer: d,
      }
    }

    const n = ri(4, 8)
    const sn = Math.round((n / 2) * (2 * a1 + (n - 1) * d))
    if (sn === a1 || sn === d) return { display: `a₁=2, d=3. S₅ = ?`, answer: 40 }
    return {
      display: `a₁=${a1}, d=${d}. S${toSubscript(n)} = ?`,
      answer: sn,
    }
  },
  progressions_geometric() {
    const b1 = ri(2, 5)
    const q = ri(2, 4)
    const n = ri(3, 5)
    const bn = b1 * q ** (n - 1)
    return {
      display: `Геометрическая прогрессия: b₁=${b1}, q=${q}. Чему равен b${toSubscript(n)}?`,
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
      [2, 32, 5],
      [3, 9, 2],
      [3, 27, 3],
      [3, 81, 4],
      [5, 25, 2],
      [5, 125, 3],
      [10, 100, 2],
      [10, 1000, 3],
      [10, 10000, 4],
      [4, 16, 2],
      [4, 64, 3],
      [7, 49, 2],
    ]
    const valid = tbl.filter(([aa, bb, xx]) => xx !== aa && xx !== bb)
    const [a, b, x] = valid[ri(0, valid.length - 1)]
    return { display: `log${toSubscript(a)}(${b}) = ?`, answer: x }
  },
  logarithms_equations() {
    const base = 2
    const x = ri(3, 5)
    const rhs = base ** x
    return { display: `log${toSubscript(base)}(t) = ${x}. Чему равно t?`, answer: rhs }
  },
  exponential_equations() {
    const exp = ri(3, 6)
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
    let c
    let n
    do {
      c = ri(1, 5)
      n = ri(2, 6)
    } while (c * n === c || c * n === n || c * n === 0)

    const type = ri(0, 1)
    if (type === 0) {
      return {
        display: `(${c}x${toSuperscript(n)})' — коэффициент при x${toSuperscript(n - 1)}?`,
        answer: c * n,
      }
    }
    return {
      display: `f(x) = ${c}x${toSuperscript(n)}. f'(x) = ?·x${toSuperscript(n - 1)}`,
      answer: c * n,
    }
  },
  combinatorics_basic() {
    const type = ri(0, 2)

    if (type === 0) {
      const n = ri(4, 9)
      const answer = (n * (n - 1)) / 2
      if (answer === n) return { display: `Из 6 книг выбрать 2. Сколько способов?`, answer: 15 }
      return { display: `Из ${n} книг выбрать 2. Сколько способов?`, answer }
    }

    if (type === 1) {
      const n = ri(3, 7)
      const answer = n * (n - 1)
      if (answer === n) return { display: `5 картин, 2 места на стене. Сколько вариантов?`, answer: 20 }
      return { display: `${n} картин, 2 места на стене. Сколько вариантов?`, answer }
    }

    const n = ri(3, 5)
    const factorials = { 3: 6, 4: 24, 5: 120 }
    return { display: `${n} флага, сколько разных порядков?`, answer: factorials[n] }
  },
  probability_basic() {
    const cases = [
      { display: 'Кубик 1–6. Шанс выпасть чётному (в %)?', answer: 50 },
      { display: 'Монета. Шанс выпасть орлу (в %)?', answer: 50 },
      { display: 'Кубик 1–6. Шанс выпасть > 4 (в %)?', answer: 33 },
      { display: 'Кубик 1–6. Шанс выпасть числу < 3 (в %)?', answer: 33 },
      { display: 'Карточки 1–10. Шанс вытащить чётную (в %)?', answer: 50 },
      { display: 'Из 4 шаров: 1 красный. Шанс вытащить красный (в %)?', answer: 25 },
      { display: 'Из 5 шаров: 1 синий. Шанс вытащить синий (в %)?', answer: 20 },
      { display: '2 монеты. Шанс оба орла (в %)?', answer: 25 },
      { display: '3 монеты. Шанс хотя бы один орёл (в %)?', answer: 88 },
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
