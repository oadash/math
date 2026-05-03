# Math Adventure — Roadmap v2

> Документ для Cursor. Читай сверху вниз. Каждый таск — отдельный контекст,
> не смешивай несколько тасков в одном запросе к модели.

---

## Контекст проекта

Монорепо: `/server` (Express + pg, Node 20) и `/client` (React 18 + Vite).
Деплой: Railway, PostgreSQL как плагин, Dockerfile в корне.
Ключевые файлы бизнес-логики:
- `server/services/spiralScheduler.js` — алгоритм выбора темы
- `server/services/problemGenerator.js` — генератор задач
- `server/routes/api.js` — все API-роуты
- `server/db/seed.sql` — список тем (idempotent)
- `client/src/screens/GameScreen.jsx` — игровой экран
- `client/src/screens/ProgressScreen.jsx` — экран прогресса
- `client/src/components/IntroCard.jsx` — карточка новой темы

---

## Порядок выполнения

```
TASK-020  →  TASK-019  →  TASK-026  →  TASK-021  →  TASK-022  →  TASK-023  →  TASK-024  →  TASK-025
  (pin)       (tuning)    (grade)     (3–4 кл)    (5–6 кл)    (7 кл)      (8–9 кл)    (10–11 кл)
```

Первые три таска независимы от количества тем — делай их до добавления контента.
Таски 021–025 делай строго по порядку: каждый следующий опирается на prerequisite
предыдущего в seed.sql.

---

## TASK-020 — Ручной выбор темы (pin)

**Почему первым:** снимает главную боль — сейчас нет способа переключиться
на конкретную тему. Быстрый win, затрагивает минимум файлов.

### Backend

**1. Миграция — добавить колонку в users**

В `server/db/migrate.js` после применения schema.sql добавь:

```js
await pool.query(`
  ALTER TABLE users
  ADD COLUMN IF NOT EXISTS pinned_topic_slug TEXT DEFAULT NULL
`)
```

Это идемпотентно — безопасно запускать повторно.

**2. Два новых роута в `server/routes/api.js`**

```
POST /api/topic/pin    { topicSlug: string }
POST /api/topic/unpin  (тело не нужно)
```

Логика `pin`:
- Проверить что тема существует в таблице topics
- Проверить что `user_topic_state.state != 'locked'` для этого userId
- Если проверки прошли: `UPDATE users SET pinned_topic_slug = $2 WHERE id = $1`
- Вернуть `{ ok: true, pinnedSlug }`

Логика `unpin`:
- `UPDATE users SET pinned_topic_slug = NULL WHERE id = $1`
- Вернуть `{ ok: true }`

**3. Изменить `scheduleNextTopic` в `spiralScheduler.js`**

В начале функции, после вызова `runPromotionRules`:

```js
const pinnedRow = await pool.query(
  `SELECT pinned_topic_slug FROM users WHERE id = $1`, [userId]
)
const pinnedSlug = pinnedRow.rows[0]?.pinned_topic_slug ?? null

if (pinnedSlug) {
  const pinned = await pool.query(
    `SELECT uts.state, t.id, t.slug, t.title_ru, t.sort_order
     FROM user_topic_state uts
     JOIN topics t ON t.id = uts.topic_id
     WHERE uts.user_id = $1 AND t.slug = $2 AND uts.state != 'locked'`,
    [userId, pinnedSlug]
  )
  if (pinned.rows.length > 0) {
    const row = pinned.rows[0]
    return {
      topic: { id: row.id, slug: row.slug, title_ru: row.title_ru,
                state: row.state, sort_order: row.sort_order },
      isFirstIntroduction: false,
    }
  }
  // Если тема оказалась locked — сбросить pin и идти дальше по алгоритму
  await pool.query(`UPDATE users SET pinned_topic_slug = NULL WHERE id = $1`, [userId])
}
```

### Frontend

**4. `client/src/api.js` — добавить хелперы**

```js
export async function pinTopic(slug) {
  return api('/api/topic/pin', { method: 'POST', json: { topicSlug: slug } })
}
export async function unpinTopic() {
  return api('/api/topic/unpin', { method: 'POST' })
}
```

**5. `ProgressScreen.jsx` — кнопка "Тренировать"**

Рядом с каждым не-locked топиком добавить кнопку. При клике:
1. Вызвать `pinTopic(slug)`
2. `navigate('/play')`

```jsx
{t.state !== 'locked' && (
  <button
    className="btn btn--ghost topic-tree__train-btn"
    onClick={async () => {
      await pinTopic(t.slug)
      navigate('/play')
    }}
  >
    Тренировать
  </button>
)}
```

**6. `GameScreen.jsx` — баннер активного пина**

В начале `loadProblem` сохранять `payload.topic.slug` в state.
Добавить над задачей (если `pinnedSlug` присутствует):

```jsx
{pinnedSlug && (
  <div className="pin-banner">
    <span>Тренируем: {payload?.topic?.title_ru}</span>
    <button
      className="btn btn--ghost"
      onClick={async () => { await unpinTopic(); setPinnedSlug(null); loadProblem() }}
    >
      × Случайная тема
    </button>
  </div>
)}
```

**7. CSS для `.pin-banner`** — добавить в `index.css`:

```css
.pin-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #e8e4ff;
  border-radius: var(--radius);
  padding: 0.5rem 0.85rem;
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--accent);
}
```

### Тесты

Добавить в `server/tests/app.test.js`:
- POST `/api/topic/pin` без токена → 401
- POST `/api/topic/pin` с mock pool где тема locked → 403
- POST `/api/topic/unpin` → обновляет поле (mock pool)

---

## TASK-019 — Тюнинг spiral scheduler

**Почему вторым:** одно изменение в одном файле, большой педагогический эффект.
Делай после TASK-020 чтобы можно было тестировать pin вместе с новыми порогами.

### Изменения в `spiralScheduler.js`

**1. Снизить порог разблокировки с 5/7 до 3/5**

Найди блок с `lastNAnswersChronological(pool, userId, topic_id, 7)` и замени:

```js
// БЫЛО:
const last7 = await lastNAnswersChronological(pool, userId, topic_id, 7)
if (last7.length >= 5 && maxConsecutiveCorrect(last7) >= 5) {

// СТАЛО:
const last5 = await lastNAnswersChronological(pool, userId, topic_id, 5)
if (last5.length >= 3 && maxConsecutiveCorrect(last5) >= 3) {
```

**2. Добавить "peeking" — предварительный показ следующей темы**

В функцию `pickWeightedTopicRow` добавить логику peek-тем.
После получения основных активных тем:

```js
// Найти locked темы чей prerequisite в practicing со streak >= 3
const peekRows = await pool.query(
  `SELECT t.id, t.slug, t.title_ru, t.sort_order
   FROM topics t
   JOIN user_topic_state prereq_uts
     ON prereq_uts.topic_id = t.prerequisite_topic_id
    AND prereq_uts.user_id = $1
    AND prereq_uts.state = 'practicing'
    AND prereq_uts.correct_streak >= 3
   JOIN user_topic_state this_uts
     ON this_uts.topic_id = t.id
    AND this_uts.user_id = $1
    AND this_uts.state = 'locked'`,
  [userId]
)

// Добавить peek-темы с весом 10 и флагом isPeek
const peekWeighted = peekRows.rows.map(row => ({ row: { ...row, state: 'peeking' }, w: 10 }))
const allWeighted = [...weighted, ...peekWeighted]
```

В `scheduleNextTopic` если выбранная тема имеет `state === 'peeking'`:
- `isFirstIntroduction: true` (покажет IntroCard)
- Не менять state в БД (тема остаётся locked до официального порога)
- Вернуть специальный флаг `isPeek: true` в ответе

На фронте в `GameScreen.jsx`: если `isPeek === true` — показать IntroCard
как обычно, но после нажатия "Попробуем!" засчитать ответ в обычном режиме
(правильный ответ не разблокирует тему, только снимет накопленный peek-долг).

**3. Обновить тесты**

В `spiralScheduler.test.js` изменить тест `unlocks locked topics`:
- Поменять массив из 7 ответов на 5
- Поменять условие проверки с 5/7 на 3/5

Добавить тест для peek:
```js
it('includes peek topics when prereq has streak >= 3', async () => { ... })
```

---

## TASK-026 — Выбор класса при регистрации

**Почему третьим:** влияет на стартовое состояние новых пользователей.
Делай до добавления новых тем чтобы маппинг класса → стартовая тема
сразу включал все уровни.

### Backend

**1. Миграция**

В `migrate.js`:
```js
await pool.query(`
  ALTER TABLE users
  ADD COLUMN IF NOT EXISTS grade INTEGER DEFAULT NULL
`)
```

**2. `POST /api/users` — принять grade**

```js
const grade = req.body?.grade ? Number(req.body.grade) : null
// grade: 1..11 или null — валидация:
if (grade !== null && (!Number.isInteger(grade) || grade < 1 || grade > 11)) {
  return res.status(400).json({ error: 'bad_request', message: 'grade: 1–11 или null' })
}
// INSERT:
INSERT INTO users (name, age, grade) VALUES ($1, $2, $3)
```

**3. Маппинг класс → стартовая тема**

Создать файл `server/services/gradeMapping.js`:

```js
// Первая тема с которой начинает ребёнок данного класса.
// Все темы до неё (по sort_order) будут сразу 'mastered'.
// Сама стартовая тема — 'introducing'.
export const GRADE_START_SLUG = {
  1:  'addition_10',
  2:  'addition_20',
  3:  'multiplication_2',
  4:  'division_simple',
  5:  'fractions_simple',
  6:  'fractions_add_sub_diff',
  7:  'linear_equation_1',
  8:  'quadratic_simple',
  9:  'progressions_arithmetic',
  10: 'logarithms_basic',
  11: 'derivatives_basic',
}

export function getStartSlug(grade) {
  return GRADE_START_SLUG[grade] ?? 'addition_10'
}
```

**4. Применить маппинг при создании пользователя**

В `POST /api/users` заменить логику инициализации `user_topic_state`:

```js
const startSlug = getStartSlug(grade)
// Найти sort_order стартовой темы
const startTopic = topics.rows.find(t => t.slug === startSlug)
const startOrder = startTopic?.sort_order ?? 1

for (const t of topics.rows) {
  let state
  if (t.sort_order < startOrder) state = 'mastered'  // пройдено
  else if (t.slug === startSlug)  state = 'introducing'
  else                            state = 'locked'
  await client.query(
    `INSERT INTO user_topic_state (user_id, topic_id, state) VALUES ($1, $2, $3::topic_progress_state)`,
    [userId, t.id, state]
  )
}
```

### Frontend

**5. `WelcomeScreen.jsx` — добавить выбор класса**

После поля возраста добавить select или группу кнопок:

```jsx
<label className="welcome__label welcome__label--small" htmlFor="kid-grade">
  В каком классе? (необязательно)
</label>
<select
  id="kid-grade"
  className="welcome__input"
  value={grade}
  onChange={e => setGrade(e.target.value)}
>
  <option value="">Не знаю / выберу сам</option>
  {[1,2,3,4,5,6,7,8,9,10,11].map(g => (
    <option key={g} value={g}>{g} класс</option>
  ))}
</select>
```

В `onSubmit` передавать `grade: grade ? Number(grade) : null` в тело запроса.

**6. Добавить `grade` в state `WelcomeScreen`:**
```js
const [grade, setGrade] = useState('')
```

---

## TASK-021 — Новые темы: 3–4 класс

Делай строго по этому порядку: сначала seed.sql, потом генераторы, потом IntroCard.

### seed.sql — добавить после `division_simple`

```sql
INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'multiplication_big', 'Умножение двузначных', id, 12
FROM topics WHERE slug = 'multiplication_full'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'division_remainder', 'Деление с остатком', id, 13
FROM topics WHERE slug = 'division_simple'
ON CONFLICT (slug) DO UPDATE SET title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id, sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'fractions_simple', 'Простые дроби', id, 14
FROM topics WHERE slug = 'division_simple'
ON CONFLICT (slug) DO UPDATE SET title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id, sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'fractions_compare', 'Сравнение дробей', id, 15
FROM topics WHERE slug = 'fractions_simple'
ON CONFLICT (slug) DO UPDATE SET title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id, sort_order = EXCLUDED.sort_order;
```

### problemGenerator.js — добавить генераторы

```js
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
  // Только 1/2, 1/3, 1/4, 2/3, 3/4 — answer как процент для choices
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
  // Сравни дроби — какая больше? Answer: 1 = левая, 2 = правая
  // Реализация: вычисли ответ как числовое значение большей дроби × 100
  // Упрощённо: choices — сами дроби в виде строк, answer — числитель/знаменатель × 100
  // Для простоты на старте: "Какая дробь больше: 1/2 или 1/3?" answer = 50 (1/2*100)
  const pairs = [
    { a: [1,2], b: [1,3] }, { a: [2,3], b: [1,2] },
    { a: [3,4], b: [2,3] }, { a: [1,4], b: [1,3] },
  ]
  const p = pairs[ri(0, pairs.length - 1)]
  const va = p.a[0] / p.a[1]
  const vb = p.b[0] / p.b[1]
  const winner = va > vb ? p.a : p.b
  // display: вопрос, answer: числитель победителя (для choices нужен отдельный подход)
  // ВАЖНО: для тем со строковыми choices см. примечание ниже
  return {
    display: `${p.a[0]}/${p.a[1]} или ${p.b[0]}/${p.b[1]} — что больше?`,
    answer: Math.round(Math.max(va, vb) * 12), // LCM-friendly integer
  }
},
```

> **Примечание по дробям:** choices для `fractions_compare` лучше возвращать
> как строки `["1/2", "1/3", "2/3", "3/4"]`. Это требует изменения типа choices
> с `number[]` на `(number | string)[]` в `buildChoices` и в типах API.
> Сделай это в рамках этого же таска — добавь в `generateProblem` опциональный
> параметр `stringChoices?: string[]` который, если передан, используется
> вместо `buildChoices(answer)`.

### IntroCard.jsx — добавить описания

```js
multiplication_big: { emoji: '🔢', text: 'Умножаем двузначные числа на однозначные. Почти как раньше, но чуть больше!' },
division_remainder: { emoji: '📦', text: 'Иногда при делении остаётся кусочек. Найдём остаток!' },
fractions_simple: { emoji: '🍕', text: 'Дроби — это части целого. Половина пиццы — это 1/2!' },
fractions_compare: { emoji: '⚖️', text: 'Какая дробь больше? Учимся сравнивать!' },
```

---

## TASK-022 — Новые темы: 5–6 класс

### seed.sql — добавить (sort_order 16–26)

| slug | title_ru | prereq | order |
|------|----------|--------|-------|
| `fractions_add_sub` | Сложение дробей | `fractions_compare` | 16 |
| `fractions_add_sub_diff` | Дроби с разными знаменателями | `fractions_add_sub` | 17 |
| `fractions_multiply` | Умножение дробей | `fractions_add_sub_diff` | 18 |
| `fractions_divide` | Деление дробей | `fractions_multiply` | 19 |
| `decimals_basic` | Десятичные дроби | `fractions_simple` | 20 |
| `decimals_add_sub` | Сложение десятичных | `decimals_basic` | 21 |
| `decimals_multiply` | Умножение десятичных | `decimals_add_sub` | 22 |
| `percent_basic` | Проценты | `decimals_multiply` | 23 |
| `percent_reverse` | Обратные задачи с % | `percent_basic` | 24 |
| `negative_numbers` | Отрицательные числа | `division_remainder` | 25 |
| `integers_add_sub` | Сложение/вычитание целых | `negative_numbers` | 26 |

### Ключевые генераторы

```js
fractions_add_sub() {
  const d = ri(2, 9)
  const a = ri(1, d - 1)
  const b = ri(1, d - a)
  return { display: `${a}/${d} + ${b}/${d} = ?`, answer: a + b, denominator: d }
  // answer — числитель результата, denominator — знаменатель
  // На фронте показывать как "(a+b)/d"
},

decimals_basic() {
  const a = ri(1, 9)
  const b = ri(1, 9)
  return { display: `${a}.${b} — это сколько целых?`, answer: a }
},

percent_basic() {
  const percents = [10, 20, 25, 50]
  const p = percents[ri(0, percents.length - 1)]
  const base = [100, 200, 80, 40, 60][ri(0, 4)]
  return { display: `${p}% от ${base} = ?`, answer: Math.round(base * p / 100) }
},

negative_numbers() {
  const a = ri(-10, -1)
  const b = ri(1, 10)
  const type = ri(0, 1)
  if (type === 0) return { display: `${a} + ${b} = ?`, answer: a + b }
  return { display: `${b} + (${a}) = ?`, answer: a + b }
},
```

> **Важно для дробей со знаменателями:** рассмотри хранение ответа как
> `{ numerator, denominator }` в `problem_json` с отдельным полем `answerDisplay`
> (строка "3/4"). Сервер сравнивает `given === numerator` (пользователь вводит
> числитель, знаменатель показывается). Это проще чем строковые choices.
> Обсуди с Cursor перед реализацией.

---

## TASK-023 — Новые темы: 7 класс

### seed.sql (sort_order 27–33)

| slug | title_ru | prereq | order |
|------|----------|--------|-------|
| `integers_multiply` | Умножение целых чисел | `integers_add_sub` | 27 |
| `powers_basic` | Степени чисел | `integers_multiply` | 28 |
| `square_root_basic` | Квадратные корни | `powers_basic` | 29 |
| `linear_equation_1` | Уравнения: x + a = b | `integers_add_sub` | 30 |
| `linear_equation_2` | Уравнения: ax + b = c | `linear_equation_1` | 31 |
| `linear_equation_3` | Уравнения: ax + b = cx + d | `linear_equation_2` | 32 |
| `ratio_proportion` | Пропорции | `fractions_divide` | 33 |

### Ключевые генераторы

```js
integers_multiply() {
  const signs = [[-1,1],[1,-1],[-1,-1]]
  const [sa, sb] = signs[ri(0, 2)]
  const a = ri(2, 9) * sa
  const b = ri(2, 9) * sb
  return { display: `(${a}) × (${b}) = ?`, answer: a * b }
},

powers_basic() {
  const pairs = [[2,2],[2,3],[2,4],[3,2],[3,3],[4,2],[5,2],[10,2],[10,3]]
  const [base, exp] = pairs[ri(0, pairs.length - 1)]
  return { display: `${base}${toSuperscript(exp)} = ?`, answer: Math.pow(base, exp) }
},

square_root_basic() {
  const roots = [4,9,16,25,36,49,64,81,100,121,144]
  const n = roots[ri(0, roots.length - 1)]
  return { display: `√${n} = ?`, answer: Math.sqrt(n) }
},

linear_equation_1() {
  const x = ri(1, 20)
  const a = ri(1, 15)
  const b = x + a
  const type = ri(0, 1)
  if (type === 0) return { display: `x + ${a} = ${b}, x = ?`, answer: x }
  return { display: `x - ${a} = ${x - a}, x = ?`, answer: x }
},

linear_equation_2() {
  const x = ri(1, 10)
  const a = ri(2, 5)
  const b = ri(1, 10)
  const c = a * x + b
  return { display: `${a}x + ${b} = ${c}, x = ?`, answer: x }
},

ratio_proportion() {
  // a/b = c/x, найти x
  const b = ri(2, 8)
  const c = ri(2, 8)
  const x = ri(2, 8)
  const a = b * c / x  // может не быть целым — подбери так чтобы было
  // Генерируй: a = ri(2,8), x = ri(2,8), b = a*x/c где c = ri(2,8)
  const ca = ri(2, 6)
  const cx = ri(2, 6)
  const cc = ri(2, 6)
  const cb = ca * cx / cc
  if (!Number.isInteger(cb)) return generators.ratio_proportion()
  return { display: `${ca}/${cb} = ${cc}/x, x = ?`, answer: cx }
},
```

### Вспомогательная функция `toSuperscript`

```js
function toSuperscript(n) {
  const map = { 2: '²', 3: '³', 4: '⁴', 5: '⁵' }
  return map[n] ?? `^${n}`
}
```

---

## TASK-024 — Новые темы: 8–9 класс

### seed.sql (sort_order 34–41)

| slug | title_ru | prereq | order |
|------|----------|--------|-------|
| `quadratic_simple` | Квадратные уравнения | `linear_equation_3` | 34 |
| `quadratic_vieta` | Теорема Виета | `quadratic_simple` | 35 |
| `systems_linear_2` | Системы уравнений | `linear_equation_3` | 36 |
| `inequalities_linear` | Линейные неравенства | `linear_equation_2` | 37 |
| `geometry_area_basic` | Площади фигур | `ratio_proportion` | 38 |
| `progressions_arithmetic` | Арифметическая прогрессия | `linear_equation_2` | 39 |
| `progressions_geometric` | Геометрическая прогрессия | `progressions_arithmetic` | 40 |
| `trigonometry_basic` | Тригонометрия: основы | `square_root_basic` | 41 |

### Ключевые генераторы

```js
quadratic_simple() {
  // x² - (a+b)x + a*b = 0, найти наименьший корень
  const a = ri(1, 8)
  const b = ri(1, 8)
  const B = -(a + b)
  const C = a * b
  const Babs = Math.abs(B)
  const Bsign = B < 0 ? '-' : '+'
  return {
    display: `x² ${Bsign} ${Babs}x + ${C} = 0, меньший корень?`,
    answer: Math.min(a, b),
  }
},

trigonometry_basic() {
  const table = [
    { display: 'sin 30°', answer: 50, answerStr: '1/2' },   // ×100
    { display: 'sin 60°', answer: 87, answerStr: '√3/2' },
    { display: 'cos 60°', answer: 50, answerStr: '1/2' },
    { display: 'cos 30°', answer: 87, answerStr: '√3/2' },
    { display: 'sin 45°', answer: 71, answerStr: '√2/2' },
    { display: 'cos 45°', answer: 71, answerStr: '√2/2' },
    { display: 'tg 45°',  answer: 1,  answerStr: '1' },
    { display: 'tg 30°',  answer: 58, answerStr: '√3/3' },
  ]
  // Для этой темы choices — строки. Используй stringChoices.
  const entry = table[ri(0, table.length - 1)]
  const allStrs = ['1/2', '√3/2', '√2/2', '√3/3', '1', '√3', '0']
  const wrong = allStrs.filter(s => s !== entry.answerStr).slice(0, 3)
  return {
    display: `${entry.display} = ?`,
    answer: entry.answer,
    stringChoices: shuffle([entry.answerStr, ...wrong]),
  }
},

geometry_area_basic() {
  const shapes = [
    () => { const a=ri(3,12),b=ri(3,12); return { display:`Прямоугольник ${a}×${b}, площадь?`, answer: a*b } },
    () => { const a=ri(3,12),h=ri(3,12); return { display:`Треугольник, основание ${a}, высота ${h}, площадь?`, answer: Math.round(a*h/2) } },
    () => { const r=ri(2,7); return { display:`Круг r=${r}, площадь (π≈3)?`, answer: 3*r*r } },
  ]
  return shapes[ri(0, shapes.length - 1)]()
},
```

> **Для `trigonometry_basic`:** choices — строки типа "√3/2". Это требует
> что фронт отображает строки в кнопках choices, а сервер сравнивает
> `given === answer` (числовое) через маппинг строка → число.
> Лучшее решение: в `problem_json` хранить `stringChoices: string[]`,
> `stringAnswer: "√3/2"`. POST /api/answer принимает `answerGiven: string`,
> сравнивает с `payload.stringAnswer`. Реализуй в этом таске.

---

## TASK-025 — Новые темы: 10–11 класс

### seed.sql (sort_order 42–49)

| slug | title_ru | prereq | order |
|------|----------|--------|-------|
| `logarithms_basic` | Логарифмы: основы | `powers_basic` | 42 |
| `logarithms_equations` | Логарифмические уравнения | `logarithms_basic` | 43 |
| `exponential_equations` | Показательные уравнения | `logarithms_basic` | 44 |
| `trigonometry_identities` | Тригонометрические тождества | `trigonometry_basic` | 45 |
| `trigonometry_equations` | Тригонометрические уравнения | `trigonometry_identities` | 46 |
| `derivatives_basic` | Производные: основы | `logarithms_equations` | 47 |
| `combinatorics_basic` | Комбинаторика | `progressions_geometric` | 48 |
| `probability_basic` | Вероятность | `combinatorics_basic` | 49 |

### Ключевые генераторы

```js
logarithms_basic() {
  // log_a(b) = x где b = a^x
  const table = [
    [2,4,2],[2,8,3],[2,16,4],[3,9,2],[3,27,3],[5,25,2],[10,100,2],[10,1000,3]
  ]
  const [a,b,x] = table[ri(0, table.length - 1)]
  return { display: `log${toSubscript(a)}(${b}) = ?`, answer: x }
},

derivatives_basic() {
  // d/dx(x^n) = n*x^(n-1), но спрашиваем коэффициент производной
  const n = ri(2, 5)
  const c = ri(1, 4)
  // c*x^n → производная c*n*x^(n-1), спрашиваем коэффициент = c*n
  return { display: `Производная ${c}x${toSuperscript(n)} — коэффициент?`, answer: c * n }
},

combinatorics_basic() {
  const type = ri(0, 1)
  if (type === 0) {
    // C(n,2) = n*(n-1)/2
    const n = ri(4, 8)
    return { display: `Из ${n} человек выбрать 2. Сколько способов?`, answer: n*(n-1)/2 }
  }
  // A(n,2) = n*(n-1)
  const n = ri(3, 6)
  return { display: `${n} человек, 2 места. Сколько вариантов рассадки?`, answer: n*(n-1) }
},

probability_basic() {
  // Классическая вероятность × 100 (в процентах)
  const cases = [
    { display: 'Кубик: шанс выпасть чётному (в %)?', answer: 50 },
    { display: 'Монета: орёл (в %)?', answer: 50 },
    { display: 'Кубик: шанс выпасть > 4 (в %)?', answer: 33 },
    { display: 'Кубик: шанс выпасть 1 (в %)?', answer: 17 },
    { display: '2 монеты: оба орла (в %)?', answer: 25 },
  ]
  return cases[ri(0, cases.length - 1)]
},
```

```js
function toSubscript(n) {
  const map = { 2:'₂', 3:'₃', 4:'₄', 5:'₅', 6:'₆', 7:'₇', 8:'₈', 9:'₉', 10:'₁₀' }
  return map[n] ?? `_${n}`
}
```

---

## Общие рекомендации для Cursor

### Промпт для старта каждого таска

```
Read ROADMAP.md, section TASK-0XX.
Implement only this task. Ask before making assumptions.
Run existing tests after changes: npm test --workspace=server
```

### Порядок работы внутри каждого таска

1. Сначала изменения в `server/db/` (схема, seed)
2. Потом изменения в `server/services/`
3. Потом изменения в `server/routes/api.js`
4. Потом изменения в `client/src/`
5. В конце — тесты

### Что не трогать без явного указания

- `railway.toml` и `Dockerfile` — не менять
- `server/db/schema.sql` — только через `migrate.js` (ALTER TABLE)
- `client/vite.config.js` — не менять

### Проверка после каждого таска

```bash
# Бэкенд-тесты
npm test --workspace=server

# Локальный запуск
npm run dev --workspace=server   # терминал 1
npm run dev --workspace=client   # терминал 2

# Проверить health
curl http://localhost:3000/health
curl http://localhost:3000/health/db
```

### Проблемы с дробями и строковыми choices

Темы `fractions_compare`, `trigonometry_basic`, `trigonometry_identities`
требуют строковые choices (`["1/2", "√3/2", ...]`). Архитектурное решение:

1. `generateProblem` может возвращать `stringChoices: string[] | null`
2. Если `stringChoices` есть — клиент показывает строки в кнопках
3. `POST /api/answer` принимает `answerGiven: number | string`
4. `signProblemToken` включает `stringAnswer: string | null`
5. Сервер сравнивает: если `stringAnswer` есть — строковое сравнение

Реализуй это в TASK-022 (первое появление дробей со строковыми choices),
чтобы TASK-024 уже мог переиспользовать.

---

## Статус тасков

| Таск | Статус | Приоритет |
|------|--------|-----------|
| TASK-020 pin | ✅ готово | 🔴 высокий |
| TASK-019 tuning | ✅ готово | 🔴 высокий |
| TASK-026 grade | ⬜ не начат | 🟡 средний |
| TASK-021 3–4 кл | ⬜ не начат | 🟡 средний |
| TASK-022 5–6 кл | ⬜ не начат | 🟢 низкий |
| TASK-023 7 кл | ⬜ не начат | 🟢 низкий |
| TASK-024 8–9 кл | ⬜ не начат | 🟢 низкий |
| TASK-025 10–11 кл | ⬜ не начат | 🟢 низкий |

Обновляй таблицу по ходу работы: `⬜` → `🔄` (в процессе) → `✅` (готово).
