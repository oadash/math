# TASK-AUDIT — Качество задач и тесты

## Контекст

Найден баг: некоторые задачи тривиальны — ответ буквально виден в условии.
Пример: "Корни x² + bx + c = 0 равны 7 и 9. Чему равна сумма корней?" — ответ
очевиден без знания теоремы. Нужно найти все такие случаи, починить генераторы
и написать тесты которые не дадут регрессии.

**Затрагиваемые файлы:**
- `server/services/problemGenerator.js` — генераторы задач
- `server/tests/problemGenerator.test.js` — тесты

**Не трогать:** маршруты, БД, фронт, railway.toml, Dockerfile.

---

## Шаг 1 — Сначала напиши скрипт аудита

Создай файл `server/scripts/audit-problems.mjs` и запусти его.
Он покажет все сломанные темы до того как ты начнёшь что-то чинить.

```js
// server/scripts/audit-problems.mjs
import { generateProblem } from '../services/problemGenerator.js'

const SLUGS = [
  'addition_10', 'addition_20', 'subtraction_10', 'addition_100',
  'subtraction_20', 'multiplication_2', 'multiplication_3', 'multiplication_5',
  'multiplication_10', 'multiplication_full', 'division_simple',
  // Добавь сюда все темы из ROADMAP.md по мере их реализации
]

const RUNS = 500
const issues = []

for (const slug of SLUGS) {
  const trivialCount = { count: 0, example: null }
  const zeroAnswerCount = { count: 0, example: null }
  const negativeChoiceCount = { count: 0, example: null }
  const duplicateChoiceCount = { count: 0, example: null }

  for (let i = 0; i < RUNS; i++) {
    const p = generateProblem({ slug })
    const numsInDisplay = (p.display.match(/-?\d+(\.\d+)?/g) ?? []).map(Number)

    // Ответ торчит в условии
    if (numsInDisplay.includes(p.answer) && trivialCount.count === 0) {
      trivialCount.count++
      trivialCount.example = { display: p.display, answer: p.answer }
    }

    // Ответ = 0 (почти всегда баг)
    if (p.answer === 0 && zeroAnswerCount.count === 0) {
      zeroAnswerCount.count++
      zeroAnswerCount.example = { display: p.display, answer: p.answer }
    }

    // Отрицательные choices (кроме тем с отрицательными числами)
    const allowNegative = ['negative_numbers', 'integers_add_sub', 'integers_multiply', 'linear_equation_3']
    if (!allowNegative.includes(slug)) {
      const hasNeg = p.choices.some(c => typeof c === 'number' && c < 0)
      if (hasNeg && negativeChoiceCount.count === 0) {
        negativeChoiceCount.count++
        negativeChoiceCount.example = { display: p.display, choices: p.choices }
      }
    }

    // Дублирующиеся choices
    if (new Set(p.choices).size !== p.choices.length && duplicateChoiceCount.count === 0) {
      duplicateChoiceCount.count++
      duplicateChoiceCount.example = { display: p.display, choices: p.choices }
    }
  }

  const topicIssues = []
  if (trivialCount.count > 0) topicIssues.push(`  ❌ ТРИВИАЛЬНАЯ: "${trivialCount.example.display}" → ${trivialCount.example.answer}`)
  if (zeroAnswerCount.count > 0) topicIssues.push(`  ❌ ОТВЕТ=0: "${zeroAnswerCount.example.display}"`)
  if (negativeChoiceCount.count > 0) topicIssues.push(`  ⚠️  НЕГАТИВНЫЙ CHOICE: choices=${JSON.stringify(negativeChoiceCount.example.choices)}`)
  if (duplicateChoiceCount.count > 0) topicIssues.push(`  ❌ ДУБЛИРУЮЩИЙСЯ CHOICE: choices=${JSON.stringify(duplicateChoiceCount.example.choices)}`)

  if (topicIssues.length > 0) {
    issues.push(`[${slug}]:\n${topicIssues.join('\n')}`)
  } else {
    console.log(`✅ [${slug}]`)
  }
}

if (issues.length > 0) {
  console.log('\n=== НАЙДЕНЫ ПРОБЛЕМЫ ===')
  issues.forEach(i => console.log('\n' + i))
  process.exit(1)
} else {
  console.log('\n✅ Все темы прошли аудит')
}
```

Запусти:
```bash
node server/scripts/audit-problems.mjs
```

Зафиксируй вывод — он покажет что именно чинить.

---

## Шаг 2 — Почини каждый сломанный генератор

Ниже — правила для каждой темы. Применяй только к тем которые аудит пометил как сломанные.

---

### Правила переработки генераторов

#### Общий принцип для всех тем
Ответ **никогда не должен присутствовать в числах условия**.
Единственное исключение: темы типа `decimals_basic` где по природе задачи
это неизбежно — их нужно добавить в whitelist в тестах.

---

### `quadratic_vieta` — Теорема Виета

**Проблема:** "корни 7 и 9, сумма корней?" — ответ 16 очевиден.

**Правильный подход:** скрыть корни, показать коэффициенты — пусть ребёнок
восстанавливает корни или коэффициенты из теоремы.

```js
quadratic_vieta() {
  const x1 = ri(1, 9)
  const x2 = ri(1, 9)
  const b = -(x1 + x2)   // x1 + x2 = -b
  const c = x1 * x2      // x1 * x2 = c

  const type = ri(0, 2)

  if (type === 0) {
    // Дано уравнение → найти произведение корней (= c)
    // b в условии есть, c нет → ответ c не торчит
    return {
      display: `x² ${b < 0 ? b : '+' + b}x + ? = 0, корни целые положительные. Произведение корней?`,
      answer: c,
    }
  }

  if (type === 1) {
    // Дан один корень и c → найти второй корень
    // Показываем x1 и c, спрашиваем x2
    return {
      display: `x² + ${b < 0 ? b : b}x + ${c} = 0, один корень = ${x1}. Второй корень?`,
      answer: x2,
    }
  }

  // type === 2: дано c и один корень, найти b (= -(x1+x2))
  return {
    display: `x² + bx + ${c} = 0, корни ${x1} и ${x2}. Чему равно b?`,
    answer: b,  // b = -(x1+x2), не совпадает с x1 и x2
  }
},
```

**Проверь:** в type=2 убедись что `b` не совпадает с `x1` или `x2`.
Добавь рекурсивный перезапуск если совпадает:
```js
if (b === x1 || b === x2) return generators.quadratic_vieta()
```

---

### `quadratic_simple` — Квадратные уравнения

**Проблема:** "x² - 16x + 63 = 0, меньший корень?" — если показываем
оба корня в условии через их сумму/произведение, ребёнок может угадать.

**Правило:** показывай только коэффициенты уравнения, не корни.

```js
quadratic_simple() {
  const x1 = ri(1, 8)
  const x2 = ri(x1 + 1, 9)  // x2 > x1 всегда, чтобы "меньший" имел смысл
  const bCoeff = -(x1 + x2)
  const cCoeff = x1 * x2

  const bStr = bCoeff < 0 ? `${bCoeff}` : `+${bCoeff}`
  const cStr = cCoeff > 0 ? `+${cCoeff}` : `${cCoeff}`

  return {
    display: `x² ${bStr}x ${cStr} = 0, меньший корень?`,
    answer: x1,
  }
},
```

**Проверь:** `x1` не должен совпадать ни с `bCoeff` ни с `cCoeff`.
```js
if (x1 === Math.abs(bCoeff) || x1 === cCoeff) return generators.quadratic_simple()
```

---

### `linear_equation_3` — Уравнения ax + b = cx + d

**Проблема:** если x получается маленьким числом которое есть среди коэффициентов.

```js
linear_equation_3() {
  // Гарантируем что x не совпадает ни с одним коэффициентом
  let x, a, b, c, d
  let attempts = 0
  do {
    x = ri(1, 10)
    a = ri(2, 6)
    c = ri(2, 6)
    if (a === c) continue  // иначе деление на 0
    // ax + b = cx + d → b - d = (c - a)x → выбираем b произвольно
    b = ri(1, 10)
    d = b - (a - c) * x  // d = b - (a-c)*x
    attempts++
  } while (
    attempts < 50 && (
      d < 0 || d > 30 ||  // d должен быть разумным
      [a, b, c, d].includes(x)  // x не должен совпадать с коэффициентами
    )
  )
  return { display: `${a}x + ${b} = ${c}x + ${d}, x = ?`, answer: x }
},
```

---

### `ratio_proportion` — Пропорции

**Проблема:** рекурсия через `return generators.ratio_proportion()` может
зацикливаться и не гарантирует что x не торчит в условии.

```js
ratio_proportion() {
  // a/b = c/x → x = b*c/a
  // Генерируем так чтобы x гарантированно целый и не совпадал с a,b,c
  const solutions = []
  for (let a = 2; a <= 8; a++)
    for (let b = 2; b <= 8; b++)
      for (let c = 2; c <= 8; c++) {
        const x = (b * c) / a
        if (Number.isInteger(x) && x >= 2 && x <= 30 && ![a, b, c].includes(x))
          solutions.push({ a, b, c, x })
      }
  const s = solutions[ri(0, solutions.length - 1)]
  return { display: `${s.a}/${s.b} = ${s.c}/x, x = ?`, answer: s.x }
},
```

---

### `systems_linear_2` — Системы уравнений

Генерируй x и y, строй коэффициенты из них — не наоборот.
Проверяй что x и y не совпадают ни с одним из a1, b1, c1, a2, b2, c2.

```js
systems_linear_2() {
  let x, y, a1, b1, a2, b2
  let attempts = 0
  do {
    x = ri(1, 8)
    y = ri(1, 8)
    a1 = ri(1, 4); b1 = ri(1, 4)
    a2 = ri(1, 4); b2 = ri(1, 4)
    // Проверка что система не вырождена
    const det = a1 * b2 - a2 * b1
    if (det === 0) continue
    attempts++
  } while (
    attempts < 100 && (
      [a1, b1, a1*x + b1*y, a2, b2, a2*x + b2*y].includes(x) ||
      [a1, b1, a1*x + b1*y, a2, b2, a2*x + b2*y].includes(y)
    )
  )
  const c1 = a1 * x + b1 * y
  const c2 = a2 * x + b2 * y
  return {
    display: `${a1}x + ${b1}y = ${c1}\n${a2}x + ${b2}y = ${c2}\nx = ?`,
    answer: x,
  }
},
```

---

### `progressions_arithmetic` — Арифметическая прогрессия

Не спрашивай сумму или элемент который буквально перечислен в условии.

```js
progressions_arithmetic() {
  const a1 = ri(1, 10)
  const d = ri(1, 5)
  const type = ri(0, 2)

  if (type === 0) {
    // Дано a1 и d, найти a_n где n > 3 (чтобы ответ не был в условии)
    const n = ri(5, 10)
    const an = a1 + (n - 1) * d
    return { display: `a₁=${a1}, d=${d}. Найди a${n}`, answer: an }
  }

  if (type === 1) {
    // Дано два элемента, найти d
    const n1 = ri(2, 4)
    const n2 = n1 + ri(2, 4)
    const an1 = a1 + (n1 - 1) * d
    const an2 = a1 + (n2 - 1) * d
    // d не должен совпадать с an1 или an2
    if (d === an1 || d === an2) return generators.progressions_arithmetic()
    return { display: `a${n1}=${an1}, a${n2}=${an2}. Найди d`, answer: d }
  }

  // type === 2: найти сумму первых n членов
  const n = ri(4, 8)
  const sn = Math.round(n / 2 * (2 * a1 + (n - 1) * d))
  // sn не должен совпадать с a1 или d
  if (sn === a1 || sn === d) return generators.progressions_arithmetic()
  return { display: `a₁=${a1}, d=${d}. S${n}=?`, answer: sn }
},
```

---

### `logarithms_basic` — Логарифмы

```js
logarithms_basic() {
  const table = [
    [2,4,2],[2,8,3],[2,16,4],[2,32,5],
    [3,9,2],[3,27,3],[3,81,4],
    [5,25,2],[5,125,3],
    [10,100,2],[10,1000,3],[10,10000,4],
    [4,16,2],[4,64,3],
    [7,49,2],
  ]
  // Фильтруем: ответ (x) не должен совпадать с a или b
  const valid = table.filter(([a, b, x]) => x !== a && x !== b)
  const [a, b, x] = valid[ri(0, valid.length - 1)]
  return { display: `log${toSubscript(a)}(${b}) = ?`, answer: x }
},
```

---

### `derivatives_basic` — Производные

```js
derivatives_basic() {
  // (c * x^n)' = c * n * x^(n-1)
  // Спрашиваем коэффициент производной = c*n
  // c*n не должен совпадать с c или n
  let c, n
  do {
    c = ri(1, 5)
    n = ri(2, 6)
  } while (c * n === c || c * n === n || c * n === 0)

  const type = ri(0, 1)
  if (type === 0) {
    return {
      display: `(${c}x${toSuperscript(n)})' — коэффициент при x${toSuperscript(n-1)}?`,
      answer: c * n,
    }
  }
  // Или: дана производная, найти исходный показатель
  // Это сложнее — оставь для v2
  return {
    display: `f(x) = ${c}x${toSuperscript(n)}. f'(x) = ?·x${toSuperscript(n-1)}`,
    answer: c * n,
  }
},
```

---

### `combinatorics_basic` — Комбинаторика

```js
combinatorics_basic() {
  const type = ri(0, 2)

  if (type === 0) {
    // C(n, 2) = n*(n-1)/2 — выбор без порядка
    const n = ri(4, 9)
    const answer = n * (n - 1) / 2
    if (answer === n) return generators.combinatorics_basic()
    return { display: `Из ${n} книг выбрать 2. Сколько способов?`, answer }
  }

  if (type === 1) {
    // A(n, 2) = n*(n-1) — размещение с порядком
    const n = ri(3, 7)
    const answer = n * (n - 1)
    if (answer === n) return generators.combinatorics_basic()
    return { display: `${n} картин, 2 места на стене. Сколько вариантов?`, answer }
  }

  // P(n) = n! для малых n — перестановки
  const n = ri(3, 5)
  const factorials = { 3: 6, 4: 24, 5: 120 }
  return { display: `${n} флага, сколько разных порядков?`, answer: factorials[n] }
},
```

---

### `probability_basic` — Вероятность

Ответы в процентах (целые числа). Следи чтобы % не совпадал с числами в условии.

```js
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
```

---

## Шаг 3 — Напиши тесты

Полностью замени блок тестов качества в `server/tests/problemGenerator.test.js`.
Добавь после существующих тестов:

```js
// ─── Тесты качества задач ────────────────────────────────────────────────────

// Темы где ответ по природе задачи может совпасть с числом в условии — это нормально
const TRIVIAL_ANSWER_WHITELIST = new Set([
  'decimals_basic',      // "1.7 — сколько целых?" → ответ 1, есть в "1.7"
  'fractions_simple',    // доля от числа, результат может быть в условии
  'geometry_area_basic', // стороны фигуры могут совпасть с площадью
])

// Темы где отрицательные choices допустимы
const NEGATIVE_CHOICES_WHITELIST = new Set([
  'negative_numbers',
  'integers_add_sub',
  'integers_multiply',
  'linear_equation_3',
  'quadratic_vieta',     // b = -(x1+x2) отрицательный
  'quadratic_simple',    // bCoeff отрицательный
])

const QUALITY_SLUGS = [
  'addition_10', 'addition_20', 'subtraction_10', 'addition_100',
  'subtraction_20', 'multiplication_2', 'multiplication_3', 'multiplication_5',
  'multiplication_10', 'multiplication_full', 'division_simple',
  'quadratic_simple', 'quadratic_vieta', 'linear_equation_1',
  'linear_equation_2', 'linear_equation_3', 'systems_linear_2',
  'ratio_proportion', 'powers_basic', 'square_root_basic',
  'progressions_arithmetic', 'progressions_geometric',
  'logarithms_basic', 'derivatives_basic',
  'combinatorics_basic', 'probability_basic',
]

const RUNS = 300

describe('problem quality — answer not trivially visible', () => {
  for (const slug of QUALITY_SLUGS) {
    // Пропускаем темы которых ещё нет в генераторе
    let hasGenerator = true
    try { generateProblem({ slug }) } catch { hasGenerator = false }
    if (!hasGenerator) continue

    it(`[${slug}] answer never appears verbatim in display numbers`, () => {
      if (TRIVIAL_ANSWER_WHITELIST.has(slug)) return

      for (let i = 0; i < RUNS; i++) {
        const p = generateProblem({ slug })
        const numsInDisplay = (p.display.match(/-?\d+(\.\d+)?/g) ?? []).map(Number)
        expect(numsInDisplay).not.toContain(p.answer)
      }
    })
  }
})

describe('problem quality — choices are valid', () => {
  for (const slug of QUALITY_SLUGS) {
    let hasGenerator = true
    try { generateProblem({ slug }) } catch { hasGenerator = false }
    if (!hasGenerator) continue

    it(`[${slug}] choices: 4 unique values, contains answer, no negatives`, () => {
      for (let i = 0; i < RUNS; i++) {
        const p = generateProblem({ slug })

        // 4 уникальных
        expect(
          new Set(p.choices).size,
          `[${slug}] duplicate choices: ${JSON.stringify(p.choices)}`
        ).toBe(4)

        // Правильный ответ среди вариантов
        expect(
          p.choices,
          `[${slug}] answer ${p.answer} not in choices ${JSON.stringify(p.choices)}`
        ).toContain(p.answer)

        // Нет отрицательных (кроме whitelist)
        if (!NEGATIVE_CHOICES_WHITELIST.has(slug)) {
          const negatives = p.choices.filter(c => typeof c === 'number' && c < 0)
          expect(
            negatives,
            `[${slug}] negative choices: ${JSON.stringify(p.choices)}`
          ).toHaveLength(0)
        }
      }
    })
  }
})

describe('problem quality — answer in expected range', () => {
  // Мин и макс возможного ответа для каждой темы
  const RANGES = {
    addition_10:           { min: 2,   max: 10  },
    addition_20:           { min: 2,   max: 20  },
    subtraction_10:        { min: 1,   max: 9   },
    addition_100:          { min: 20,  max: 100 },
    subtraction_20:        { min: 1,   max: 19  },
    multiplication_2:      { min: 2,   max: 20  },
    multiplication_3:      { min: 3,   max: 30  },
    multiplication_5:      { min: 10,  max: 50  },
    multiplication_10:     { min: 10,  max: 100 },
    multiplication_full:   { min: 4,   max: 81  },
    division_simple:       { min: 2,   max: 9   },
    powers_basic:          { min: 4,   max: 1000 },
    square_root_basic:     { min: 2,   max: 12  },
    linear_equation_1:     { min: 1,   max: 20  },
    linear_equation_2:     { min: 1,   max: 10  },
    linear_equation_3:     { min: 1,   max: 10  },
    ratio_proportion:      { min: 2,   max: 30  },
    quadratic_simple:      { min: 1,   max: 8   },
    progressions_arithmetic: { min: 1, max: 500 },
    logarithms_basic:      { min: 2,   max: 5   },
    derivatives_basic:     { min: 2,   max: 30  },
    combinatorics_basic:   { min: 3,   max: 120 },
    probability_basic:     { min: 1,   max: 100 },
  }

  for (const [slug, { min, max }] of Object.entries(RANGES)) {
    let hasGenerator = true
    try { generateProblem({ slug }) } catch { hasGenerator = false }
    if (!hasGenerator) continue

    it(`[${slug}] answer always in [${min}, ${max}]`, () => {
      for (let i = 0; i < RUNS; i++) {
        const p = generateProblem({ slug })
        expect(p.answer).toBeGreaterThanOrEqual(min)
        expect(p.answer).toBeLessThanOrEqual(max)
      }
    })
  }
})

describe('problem quality — display is well-formed', () => {
  for (const slug of QUALITY_SLUGS) {
    let hasGenerator = true
    try { generateProblem({ slug }) } catch { hasGenerator = false }
    if (!hasGenerator) continue

    it(`[${slug}] display contains ? and is non-empty`, () => {
      for (let i = 0; i < RUNS; i++) {
        const p = generateProblem({ slug })
        expect(p.display.length).toBeGreaterThan(3)
        expect(p.display).toContain('?')
      }
    })

    it(`[${slug}] always returns valid uuid`, () => {
      const p = generateProblem({ slug })
      expect(p.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
    })
  }
})

describe('problem quality — no infinite loops', () => {
  it('generates 1000 problems across all topics without hanging', () => {
    const start = Date.now()
    for (let i = 0; i < 1000; i++) {
      const slug = QUALITY_SLUGS[i % QUALITY_SLUGS.length]
      try { generateProblem({ slug }) } catch { /* тема ещё не реализована */ }
    }
    const elapsed = Date.now() - start
    // 1000 задач должны генерироваться меньше чем за 2 секунды
    expect(elapsed).toBeLessThan(2000)
  })
})
```

---

## Шаг 4 — Запусти и убедись

```bash
# Аудит-скрипт (должен показать ✅ по всем темам)
node server/scripts/audit-problems.mjs

# Полные тесты
npm test --workspace=server
```

Все тесты должны проходить. Если какой-то падает — чини генератор,
не меняй тест под баг.

---

## Чеклист приёмки

- [ ] `audit-problems.mjs` выводит только ✅
- [ ] `npm test --workspace=server` — все тесты зелёные
- [ ] Вручную проверить `quadratic_vieta`: ответ не виден в условии
- [ ] Вручную проверить `ratio_proportion`: нет зацикливания
- [ ] Вручную проверить `linear_equation_3`: все коэффициенты разумные (0–30)
- [ ] Вручную проверить `systems_linear_2`: два уравнения отображаются корректно

---

## Промпт для Cursor

```
Read TASK-AUDIT.md completely.

1. Create server/scripts/audit-problems.mjs exactly as specified and run it.
   Show me the full output before making any changes.

2. Fix only the generators that the audit flagged as broken.
   Use the exact implementations from the "Fix each broken generator" section.

3. Add all quality tests to server/tests/problemGenerator.test.js
   exactly as specified in Step 3.

4. Run npm test --workspace=server and show me the output.

Do not modify routes, DB, frontend, railway.toml or Dockerfile.
Do not fix tests by weakening assertions — fix the generators instead.
Ask before making any assumption not covered in this file.
```
