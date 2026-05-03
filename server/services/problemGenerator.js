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

/** 1 correct + 3 wrong: из диапазона ±3, неотрицательные, все разные. */
export function buildChoices(answer) {
  const candidates = []
  for (let d = -3; d <= 3; d++) {
    if (d === 0) continue
    const v = answer + d
    if (v >= 0) candidates.push(v)
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
  let bump = answer + 4
  while (wrong.length < 3) {
    while (seen.has(bump) || bump < 0) bump++
    seen.add(bump)
    wrong.push(bump)
    bump++
  }
  return shuffle([answer, ...wrong])
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
}

/**
 * @param {{ slug: string }} topic
 * @returns {{ id: string, topic_slug: string, display: string, answer: number, choices: number[] }}
 */
export function generateProblem(topic) {
  const slug = typeof topic === 'string' ? topic : topic.slug
  const gen = generators[slug]
  if (!gen) {
    throw new Error(`Unknown topic slug: ${slug}`)
  }
  const { display, answer } = gen()
  return {
    id: randomUUID(),
    topic_slug: slug,
    display,
    answer,
    choices: buildChoices(answer),
  }
}
