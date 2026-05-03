# TASKS-NEW.md — Новые задачи для Cursor

Все задачи из предыдущего ROADMAP.md выполнены.
Это следующая очередь. Порядок выполнения строгий — каждая задача отдельный сеанс.

```
TASK-CACHE → TASK-RESTORE → TASK-I18N → TASK-SEO-001 → TASK-SEO-002 → TASK-PARENT-UI
```

---

## TASK-CACHE — Кеш тем в памяти

**Зачем:** SEO-страницы будут запрашиваться часто. Каждый раз ходить в БД
за списком тем — лишняя нагрузка. Темы не меняются в рантайме — кешируем.

**Затрагиваемые файлы:**
- `server/services/topicCache.js` — создать
- `server/routes/api.js` — использовать кеш где берём все темы
- `server/index.js` — прогреть кеш при старте

### Реализация

Создать `server/services/topicCache.js`:

```js
let cache = null

export async function getAllTopics(pool) {
  if (cache) return cache
  const { rows } = await pool.query(
    'SELECT id, slug, title_ru, prerequisite_topic_id, sort_order FROM topics ORDER BY sort_order'
  )
  cache = rows
  return cache
}

export function invalidateTopicCache() {
  cache = null
}

export function getTopicBySlug(slug) {
  if (!cache) return null
  return cache.find(t => t.slug === slug) ?? null
}
```

В `server/index.js` после успешной миграции:
```js
import { getAllTopics } from './services/topicCache.js'
// После migrate(pool):
await getAllTopics(pool)
console.log('[cache] topics warmed up')
```

В `server/routes/api.js` заменить прямые запросы `SELECT * FROM topics`
на вызовы `getAllTopics(pool)` и `getTopicBySlug(slug)`.

### Тест

В `server/tests/` добавить `topicCache.test.js`:
- Первый вызов идёт в БД (mock pool)
- Второй вызов не идёт в БД (pool.query не вызывается)
- `invalidateTopicCache()` сбрасывает кеш

---

## TASK-RESTORE — Восстановление прогресса по коду

**Зачем:** сейчас JWT в localStorage одного браузера. Сменил устройство — начинай
заново. Нужен способ восстановить аккаунт без email и пароля.

**UX:** при регистрации генерируется короткий код вида `МАРК-4829`.
На другом устройстве вводишь код — получаешь тот же JWT.

**Затрагиваемые файлы:**
- `server/db/migrate.js` — добавить колонку
- `server/routes/api.js` — новый роут + изменить POST /api/users
- `client/src/screens/WelcomeScreen.jsx` — показать код после регистрации
- `client/src/api.js` — новый хелпер

### Backend

**1. Миграция — добавить колонку shortcode в users**

В `server/db/migrate.js`:
```js
await pool.query(`
  ALTER TABLE users
  ADD COLUMN IF NOT EXISTS shortcode TEXT UNIQUE
`)
```

**2. Генерация кода при создании пользователя**

Создать `server/services/shortcode.js`:
```js
import { randomInt } from 'crypto'

// Генерирует код вида "МАРК-4829" (имя заглавными + 4 цифры)
export function generateShortcode(name) {
  const prefix = name
    .trim()
    .toUpperCase()
    .replace(/[^А-ЯЁA-Z]/g, '')
    .slice(0, 6)
  const suffix = String(randomInt(1000, 9999))
  return `${prefix}-${suffix}`
}
```

В `POST /api/users` после создания пользователя:
```js
let shortcode = null
let attempts = 0
while (!shortcode && attempts < 10) {
  const candidate = generateShortcode(name)
  try {
    await client.query(
      'UPDATE users SET shortcode = $1 WHERE id = $2',
      [candidate, userId]
    )
    shortcode = candidate
  } catch (e) {
    if (e.code === '23505') { attempts++; continue } // unique violation
    throw e
  }
}
```

Добавить `shortcode` в ответ:
```js
return res.status(201).json({ token, shortcode, user: u.rows[0] })
```

**3. Новый роут восстановления**

```
POST /api/users/restore  { code: "МАРК-4829" }
```

Логика:
```js
r.post('/users/restore', async (req, res) => {
  const code = String(req.body?.code ?? '').trim().toUpperCase()
  if (!code) return res.status(400).json({ error: 'bad_request' })

  const result = await pool.query(
    'SELECT id FROM users WHERE shortcode = $1',
    [code]
  )
  if (result.rows.length === 0) {
    return res.status(404).json({
      error: 'not_found',
      message: 'Код не найден. Проверь правильность ввода.'
    })
  }
  const token = signUserToken(result.rows[0].id)
  return res.json({ token })
})
```

### Frontend

**4. WelcomeScreen — показать код после регистрации**

После успешного `POST /api/users` показать модальный экран с кодом
перед редиректом на `/play`:

```jsx
// Добавить state:
const [showCode, setShowCode] = useState(false)
const [myCode, setMyCode] = useState('')

// После setToken(data.token):
setMyCode(data.shortcode)
setShowCode(true)
// НЕ делать navigate сразу

// Новый экран-модал:
if (showCode) {
  return (
    <main className="welcome">
      <div className="welcome__card">
        <h2 className="welcome__brand">Твой код</h2>
        <p className="welcome__hint">
          Сохрани его — он поможет войти с другого устройства
        </p>
        <div className="shortcode-display">{myCode}</div>
        <button
          className="btn btn--primary btn--xl"
          onClick={() => navigate('/play', { replace: true })}
        >
          Начать!
        </button>
      </div>
    </main>
  )
}
```

**5. WelcomeScreen — добавить вход по коду**

Под кнопкой "Играть!" добавить:

```jsx
<button
  type="button"
  className="btn btn--ghost"
  onClick={() => setMode('restore')}
>
  У меня уже есть код
</button>
```

При `mode === 'restore'` показывать форму с одним полем:

```jsx
<label className="welcome__label">Введи свой код</label>
<input
  className="welcome__input"
  value={code}
  onChange={e => setCode(e.target.value.toUpperCase())}
  placeholder="МАРК-4829"
  autoCapitalize="characters"
/>
<button
  className="btn btn--primary btn--xl"
  onClick={onRestore}
>
  Войти
</button>
```

**6. CSS для `.shortcode-display`**

```css
.shortcode-display {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: var(--accent);
  background: #e8e4ff;
  border-radius: var(--radius);
  padding: 1rem 1.5rem;
  text-align: center;
  margin: 1rem 0 1.5rem;
  user-select: all;  /* тап выделяет весь код */
}
```

**7. `client/src/api.js`**

```js
export async function restoreByCode(code) {
  return api('/api/users/restore', { method: 'POST', json: { code } })
}
```

### Тесты

В `server/tests/` добавить `restore.test.js`:
- `POST /api/users/restore` с несуществующим кодом → 404
- `POST /api/users/restore` с правильным кодом → JWT
- Повторный вызов с тем же кодом → тот же userId в токене

---

## TASK-I18N — Интернационализация (RU + EN)

**Зачем:** EN версия — x10 к аудитории. Все запросы типа
"math trainer for kids", "multiplication table practice" — английские.
Архитектуру i18n нужно заложить сейчас пока кодовая база небольшая.

**Подход:** минималистичный i18n без тяжёлых библиотек.
Простой словарь + хук `useT()`. Язык определяется из URL: `/en/...` vs `/...`

**Затрагиваемые файлы:**
- `client/src/i18n/` — создать папку
- `client/src/i18n/ru.js` — русские строки
- `client/src/i18n/en.js` — английские строки
- `client/src/i18n/useT.js` — хук
- Все экраны — заменить хардкод строки на `t('key')`
- `server/db/seed.sql` — добавить `title_en` в topics
- `server/db/schema.sql` / `migrate.js` — добавить колонку

### Backend

**1. Добавить `title_en` в topics**

В `migrate.js`:
```js
await pool.query(`
  ALTER TABLE topics
  ADD COLUMN IF NOT EXISTS title_en TEXT
`)
```

В `seed.sql` добавить `title_en` для каждой темы:

```sql
-- Пример:
INSERT INTO topics (slug, title_ru, title_en, ...)
VALUES ('addition_10', 'Сложение до 10', 'Addition up to 10', ...)
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  title_en = EXCLUDED.title_en,
  ...
```

Полный список переводов slug → title_en:

| slug | title_en |
|------|----------|
| addition_10 | Addition up to 10 |
| addition_20 | Addition up to 20 |
| subtraction_10 | Subtraction up to 10 |
| addition_100 | Addition up to 100 |
| subtraction_20 | Subtraction up to 20 |
| multiplication_2 | Multiply by 2 |
| multiplication_3 | Multiply by 3 |
| multiplication_5 | Multiply by 5 |
| multiplication_10 | Multiply by 10 |
| multiplication_full | Multiplication table |
| division_simple | Simple division |
| multiplication_big | Large number multiplication |
| division_remainder | Division with remainder |
| fractions_simple | Simple fractions |
| fractions_compare | Comparing fractions |
| fractions_add_sub | Adding fractions |
| fractions_add_sub_diff | Fractions with different denominators |
| fractions_multiply | Multiplying fractions |
| fractions_divide | Dividing fractions |
| decimals_basic | Decimal numbers |
| decimals_add_sub | Adding decimals |
| decimals_multiply | Multiplying decimals |
| percent_basic | Percentages |
| percent_reverse | Reverse percentage problems |
| negative_numbers | Negative numbers |
| integers_add_sub | Integer addition & subtraction |
| integers_multiply | Integer multiplication |
| powers_basic | Powers |
| square_root_basic | Square roots |
| linear_equation_1 | Linear equations: x + a = b |
| linear_equation_2 | Linear equations: ax + b = c |
| linear_equation_3 | Linear equations: ax + b = cx + d |
| ratio_proportion | Ratios & proportions |
| quadratic_simple | Quadratic equations |
| quadratic_vieta | Vieta's formulas |
| systems_linear_2 | Systems of equations |
| inequalities_linear | Linear inequalities |
| geometry_area_basic | Areas of shapes |
| progressions_arithmetic | Arithmetic progressions |
| progressions_geometric | Geometric progressions |
| trigonometry_basic | Trigonometry: basics |
| logarithms_basic | Logarithms: basics |
| logarithms_equations | Logarithmic equations |
| exponential_equations | Exponential equations |
| trigonometry_identities | Trigonometric identities |
| trigonometry_equations | Trigonometric equations |
| derivatives_basic | Derivatives: basics |
| combinatorics_basic | Combinatorics |
| probability_basic | Probability |

**2. API возвращает оба поля**

В роутах где возвращаем топики — добавить `title_en` в SELECT.
Клиент сам выбирает нужное поле по языку.

**3. `problemGenerator.js` — EN версия display**

Создать `server/services/problemGeneratorEn.js` — то же самое что
`problemGenerator.js` но строки на английском:

```js
// Примеры:
addition_10:       `${a} + ${b} = ?`        // одинаково
subtraction_10:    `${a} − ${b} = ?`        // одинаково
linear_equation_1: `x + ${a} = ${b}, x = ?` // одинаково
quadratic_simple:  `x² ${bStr}x ${cStr} = 0, smaller root?`  // EN
progressions_arithmetic: `a₁=${a1}, d=${d}. Find a${n}`       // EN
```

Для большинства тем display одинаков (числа+символы).
Только текстовые части типа "меньший корень", "Найди" — переводить.

В `GET /api/problem` принимать query param `?lang=en`:
```js
const lang = req.query.lang === 'en' ? 'en' : 'ru'
const prob = generateProblem(picked.topic, lang)
```

### Frontend

**4. Создать `client/src/i18n/ru.js`**

```js
export default {
  welcome_title: 'Math Adventure',
  welcome_subtitle: 'Математика без спешки и оценок',
  welcome_name_label: 'Как тебя зовут?',
  welcome_name_placeholder: 'Например, Марк',
  welcome_age_label: 'Сколько тебе лет?',
  welcome_grade_label: 'В каком классе?',
  welcome_grade_none: 'Не знаю / выберу сам',
  welcome_submit: 'Играть!',
  welcome_loading: 'Секунду…',
  welcome_restore: 'У меня уже есть код',
  welcome_code_title: 'Твой код',
  welcome_code_hint: 'Сохрани его — он поможет войти с другого устройства',
  welcome_start: 'Начать!',
  welcome_restore_label: 'Введи свой код',
  welcome_restore_submit: 'Войти',
  nav_play: 'Играть',
  nav_progress: 'Успехи',
  game_loading: 'Готовим задачу…',
  game_retry: 'Ещё раз',
  game_correct: ['Отлично!', 'Верно!', 'Молодец!', 'Так держать!', 'Супер!'],
  game_wrong: ['Почти!', 'Попробуй ещё', 'Не беда!'],
  game_milestone_5: 'Пять подряд — супер!',
  game_milestone_10: 'Десять подряд — круто!',
  game_milestone_20: 'Ух ты, какая серия!',
  game_correct_answer: 'Правильно:',
  game_intro_btn: 'Попробуем!',
  game_new_topic: 'Новая тема',
  progress_title: 'Твои темы',
  progress_total: 'Всего решено задач:',
  progress_streak: 'Серия сегодня:',
  progress_train_btn: 'Тренировать',
  progress_state_locked: 'Скоро',
  progress_state_introducing: 'Знакомимся',
  progress_state_practicing: 'Тренируемся',
  progress_state_mastered: 'Освоено',
  pin_banner_label: 'Тренируем:',
  pin_banner_reset: '× Случайная тема',
  parent_title: 'Сводка за 7 дней',
  parent_hint: 'Данные — у того же ребёнка, чей код в этом браузере.',
  parent_print: 'Распечатать',
  parent_back: 'К игре',
  parent_child: 'Ребёнок',
  parent_period: 'Учитываются ответы с',
  parent_total: 'Всего за период',
  parent_attempts: 'Попыток:',
  parent_correct: 'Верно:',
  parent_percent: 'Доля верных:',
  parent_by_topic: 'По темам',
  parent_no_data: 'За эти 7 дней ещё не было попыток.',
  parent_col_topic: 'Тема',
  parent_col_attempts: 'Попыток',
  parent_col_correct: 'Верно',
  parent_col_percent: '% верных',
}
```

**5. Создать `client/src/i18n/en.js`**

```js
export default {
  welcome_title: 'Train Math',
  welcome_subtitle: 'Math practice without pressure',
  welcome_name_label: 'What\'s your name?',
  welcome_name_placeholder: 'e.g. Alex',
  welcome_age_label: 'How old are you?',
  welcome_grade_label: 'What grade are you in?',
  welcome_grade_none: 'Not sure / I\'ll choose later',
  welcome_submit: 'Let\'s go!',
  welcome_loading: 'One moment…',
  welcome_restore: 'I already have a code',
  welcome_code_title: 'Your code',
  welcome_code_hint: 'Save it — you\'ll use it to log in on another device',
  welcome_start: 'Start!',
  welcome_restore_label: 'Enter your code',
  welcome_restore_submit: 'Log in',
  nav_play: 'Play',
  nav_progress: 'Progress',
  game_loading: 'Loading problem…',
  game_retry: 'Try again',
  game_correct: ['Great!', 'Correct!', 'Well done!', 'Keep it up!', 'Awesome!'],
  game_wrong: ['Almost!', 'Try again', 'No worries!'],
  game_milestone_5: 'Five in a row — great!',
  game_milestone_10: 'Ten in a row — amazing!',
  game_milestone_20: 'Incredible streak!',
  game_correct_answer: 'Answer:',
  game_intro_btn: 'Let\'s try!',
  game_new_topic: 'New topic',
  progress_title: 'Your topics',
  progress_total: 'Total problems solved:',
  progress_streak: 'Today\'s streak:',
  progress_train_btn: 'Practice',
  progress_state_locked: 'Coming soon',
  progress_state_introducing: 'Getting started',
  progress_state_practicing: 'Practicing',
  progress_state_mastered: 'Mastered',
  pin_banner_label: 'Practicing:',
  pin_banner_reset: '× Random topic',
  parent_title: '7-day summary',
  parent_hint: 'Data for the child logged in on this device.',
  parent_print: 'Print',
  parent_back: 'Back to game',
  parent_child: 'Child',
  parent_period: 'Answers since',
  parent_total: 'Total for period',
  parent_attempts: 'Attempts:',
  parent_correct: 'Correct:',
  parent_percent: 'Accuracy:',
  parent_by_topic: 'By topic',
  parent_no_data: 'No attempts in the last 7 days.',
  parent_col_topic: 'Topic',
  parent_col_attempts: 'Attempts',
  parent_col_correct: 'Correct',
  parent_col_percent: '% correct',
}
```

**6. Создать `client/src/i18n/useT.js`**

```js
import { createContext, useContext, useState, useEffect } from 'react'
import ru from './ru.js'
import en from './en.js'

const DICTIONARIES = { ru, en }
const LangContext = createContext('ru')

export function LangProvider({ children }) {
  // Определяем язык из localStorage или браузера
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem('math_lang')
    if (saved === 'en' || saved === 'ru') return saved
    const browser = navigator.language?.slice(0, 2)
    return browser === 'ru' ? 'ru' : 'en'
  })

  useEffect(() => {
    localStorage.setItem('math_lang', lang)
    document.documentElement.lang = lang
  }, [lang])

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}

export function useT() {
  const { lang } = useLang()
  const dict = DICTIONARIES[lang] ?? ru
  return (key) => dict[key] ?? key
}
```

**7. Обернуть приложение в `LangProvider`**

В `client/src/main.jsx`:
```jsx
import { LangProvider } from './i18n/useT.js'

ReactDOM.createRoot(...).render(
  <React.StrictMode>
    <BrowserRouter>
      <LangProvider>
        <App />
      </LangProvider>
    </BrowserRouter>
  </React.StrictMode>
)
```

**8. Переключатель языка**

В `BottomNav.jsx` добавить справа кнопку RU/EN:

```jsx
import { useLang } from '../i18n/useT.js'

const { lang, setLang } = useLang()

<button
  className="lang-toggle"
  onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}
  aria-label="Switch language"
>
  {lang === 'ru' ? 'EN' : 'RU'}
</button>
```

CSS:
```css
.lang-toggle {
  background: none;
  border: 2px solid var(--accent);
  border-radius: var(--radius);
  color: var(--accent);
  font-family: inherit;
  font-weight: 800;
  font-size: 0.85rem;
  padding: 0.4rem 0.65rem;
  cursor: pointer;
  min-height: 40px;
  touch-action: manipulation;
}
```

**9. Заменить хардкод строки во всех экранах**

В каждом экране добавить `const t = useT()` и заменить строки:
- `WelcomeScreen.jsx` — все лейблы и кнопки
- `GameScreen.jsx` — feedback фразы, кнопки, loading
- `ProgressScreen.jsx` — заголовки, бейджи состояний
- `ParentScreen.jsx` — все лейблы таблицы и заголовков
- `BottomNav.jsx` — навигация
- `IntroCard.jsx` — кнопка "Попробуем!"

**10. Передавать язык в API**

В `client/src/api.js` добавить lang в запрос задач:
```js
// В GameScreen при загрузке задачи:
const data = await api(`/api/problem?lang=${lang}`)
```

---

## TASK-SEO-001 — SEO страницы (RU + EN)

**Зачем:** 500+ статических страниц под поисковые запросы.
Каждая тема × 2 языка = ~100 страниц сразу, потом ×классы = ~500+.

**Затрагиваемые файлы:**
- `server/routes/practice.js` — создать
- `server/routes/sitemap.js` — создать
- `server/createApp.js` — подключить роутеры
- `server/services/seoMeta.js` — создать

**Важно:** TASK-I18N должен быть выполнен до этого таска.

### Структура URL

```
/practice/addition-10          (RU, slug с дефисами)
/en/practice/addition-10       (EN)
/sitemap.xml
/robots.txt
```

Конвертация slug: `addition_10` → `addition-10` (underscore → hyphen).

### Реализация

**1. Создать `server/services/seoMeta.js`**

```js
export const SEO_META = {
  ru: {
    site_name: 'Train Math',
    default_desc: 'Тренажёр математики для детей. Без рекламы, без давления.',
    topic_title: (title, grade) =>
      `${title} — онлайн тренажёр${grade ? ` (${grade} класс)` : ''}`,
    topic_desc: (title, grade) =>
      `Тренируй ${title.toLowerCase()} онлайн бесплатно.${grade ? ` Подходит для ${grade} класса.` : ''} Без рекламы.`,
    examples_heading: 'Примеры задач',
    cta: 'Начать тренировку →',
    grade_label: 'Класс:',
  },
  en: {
    site_name: 'Train Math',
    default_desc: 'Math trainer for kids. No ads, no pressure.',
    topic_title: (title, grade) =>
      `${title} — free online practice${grade ? ` (grade ${grade})` : ''}`,
    topic_desc: (title, grade) =>
      `Practice ${title.toLowerCase()} online for free.${grade ? ` Suitable for grade ${grade}.` : ''} No ads.`,
    examples_heading: 'Example problems',
    cta: 'Start practicing →',
    grade_label: 'Grade:',
  },
}

// Маппинг slug → класс (из gradeMapping.js, инвертированный)
export const SLUG_TO_GRADE = {
  addition_10: 1, addition_20: 2, subtraction_10: 1,
  addition_100: 3, subtraction_20: 2,
  multiplication_2: 3, multiplication_3: 3, multiplication_5: 3,
  multiplication_10: 3, multiplication_full: 4, division_simple: 4,
  multiplication_big: 4, division_remainder: 4,
  fractions_simple: 5, fractions_compare: 5,
  fractions_add_sub: 5, fractions_add_sub_diff: 6,
  fractions_multiply: 6, fractions_divide: 6,
  decimals_basic: 5, decimals_add_sub: 5, decimals_multiply: 6,
  percent_basic: 6, percent_reverse: 6,
  negative_numbers: 6, integers_add_sub: 6, integers_multiply: 7,
  powers_basic: 7, square_root_basic: 7,
  linear_equation_1: 7, linear_equation_2: 7, linear_equation_3: 7,
  ratio_proportion: 6, quadratic_simple: 8, quadratic_vieta: 8,
  systems_linear_2: 8, inequalities_linear: 8, geometry_area_basic: 8,
  progressions_arithmetic: 9, progressions_geometric: 9,
  trigonometry_basic: 9, logarithms_basic: 10,
  logarithms_equations: 10, exponential_equations: 10,
  trigonometry_identities: 10, trigonometry_equations: 11,
  derivatives_basic: 11, combinatorics_basic: 11, probability_basic: 11,
}
```

**2. Создать `server/routes/practice.js`**

```js
import express from 'express'
import { getAllTopics } from '../services/topicCache.js'
import { generateProblem } from '../services/problemGenerator.js'
import { generateProblemEn } from '../services/problemGeneratorEn.js'
import { SEO_META, SLUG_TO_GRADE } from '../services/seoMeta.js'

export function createPracticeRouter(pool) {
  const r = express.Router()

  function slugToUrlSlug(slug) {
    return slug.replace(/_/g, '-')
  }

  function urlSlugToSlug(urlSlug) {
    return urlSlug.replace(/-/g, '_')
  }

  function renderPage(topic, lang) {
    const meta = SEO_META[lang]
    const grade = SLUG_TO_GRADE[topic.slug] ?? null
    const title = lang === 'en' ? (topic.title_en ?? topic.title_ru) : topic.title_ru
    const pageTitle = meta.topic_title(title, grade)
    const pageDesc = meta.topic_desc(title, grade)
    const canonicalLang = lang === 'en' ? '/en' : ''
    const altLang = lang === 'en' ? '' : '/en'
    const urlSlug = slugToUrlSlug(topic.slug)

    // Генерируем 5 примеров
    const gen = lang === 'en' ? generateProblemEn : generateProblem
    const examples = []
    for (let i = 0; i < 5; i++) {
      try {
        examples.push(gen(topic).display)
      } catch { /* skip */ }
    }

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle} — ${meta.site_name}</title>
  <meta name="description" content="${pageDesc}">
  <link rel="canonical" href="https://trainmath.fyi${canonicalLang}/practice/${urlSlug}">
  <link rel="alternate" hreflang="${lang === 'ru' ? 'en' : 'ru'}"
        href="https://trainmath.fyi${altLang}/practice/${urlSlug}">
  <link rel="alternate" hreflang="${lang}" 
        href="https://trainmath.fyi${canonicalLang}/practice/${urlSlug}">
  <meta property="og:title" content="${pageTitle}">
  <meta property="og:description" content="${pageDesc}">
  <meta property="og:type" content="website">
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "EducationalApplication",
    "name": `${title} — ${meta.site_name}`,
    "description": pageDesc,
    "educationalLevel": grade ? `Grade ${grade}` : undefined,
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "Web",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  })}</script>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 0 auto;
           padding: 1.5rem; color: #1a1a2e; background: #f4f7fb; }
    h1 { font-size: 1.75rem; margin-bottom: 0.5rem; }
    .desc { color: #555; margin-bottom: 1.5rem; }
    .grade { display: inline-block; background: #e8e4ff; color: #6c5ce7;
             padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.85rem;
             font-weight: 700; margin-bottom: 1rem; }
    .examples { background: #fff; border-radius: 1rem; padding: 1.25rem;
                box-shadow: 0 4px 16px rgba(0,0,0,0.06); margin-bottom: 1.5rem; }
    .examples h2 { font-size: 1rem; margin: 0 0 0.75rem; color: #555; }
    .example { font-size: 1.35rem; font-weight: 700; padding: 0.5rem 0;
               border-bottom: 1px solid #f0f0f0; }
    .example:last-child { border-bottom: none; }
    .cta { display: block; background: #6c5ce7; color: #fff; text-decoration: none;
           padding: 1rem 1.5rem; border-radius: 1rem; text-align: center;
           font-size: 1.15rem; font-weight: 800; }
  </style>
</head>
<body>
  ${grade ? `<div class="grade">${meta.grade_label} ${grade}</div>` : ''}
  <h1>${pageTitle}</h1>
  <p class="desc">${pageDesc}</p>
  <div class="examples">
    <h2>${meta.examples_heading}</h2>
    ${examples.map(e => `<div class="example">${e}</div>`).join('')}
  </div>
  <a href="/?topic=${topic.slug}" class="cta">${meta.cta}</a>
</body>
</html>`
  }

  // RU страницы
  r.get('/practice/:urlSlug', async (req, res) => {
    const slug = urlSlugToSlug(req.params.urlSlug)
    const topics = await getAllTopics(pool)
    const topic = topics.find(t => t.slug === slug)
    if (!topic) return res.status(404).send('Not found')
    res.send(renderPage(topic, 'ru'))
  })

  // EN страницы
  r.get('/en/practice/:urlSlug', async (req, res) => {
    const slug = urlSlugToSlug(req.params.urlSlug)
    const topics = await getAllTopics(pool)
    const topic = topics.find(t => t.slug === slug)
    if (!topic) return res.status(404).send('Not found')
    res.send(renderPage(topic, 'en'))
  })

  return r
}
```

**3. Создать `server/routes/sitemap.js`**

```js
import express from 'express'
import { getAllTopics } from '../services/topicCache.js'

export function createSitemapRouter(pool) {
  const r = express.Router()

  r.get('/sitemap.xml', async (req, res) => {
    const topics = await getAllTopics(pool)
    const base = 'https://trainmath.fyi'

    const urls = [
      { loc: base, priority: '1.0' },
      ...topics.flatMap(t => {
        const urlSlug = t.slug.replace(/_/g, '-')
        return [
          { loc: `${base}/practice/${urlSlug}`, priority: '0.8' },
          { loc: `${base}/en/practice/${urlSlug}`, priority: '0.8' },
        ]
      }),
    ]

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <priority>${u.priority}</priority>
    <changefreq>monthly</changefreq>
  </url>`).join('\n')}
</urlset>`

    res.header('Content-Type', 'application/xml')
    res.send(xml)
  })

  r.get('/robots.txt', (req, res) => {
    res.type('text/plain').send(
`User-agent: *
Allow: /
Disallow: /api/
Sitemap: https://trainmath.fyi/sitemap.xml`
    )
  })

  return r
}
```

**4. Подключить в `createApp.js`**

```js
import { createPracticeRouter } from './routes/practice.js'
import { createSitemapRouter } from './routes/sitemap.js'

// До SPA middleware, после /api:
app.use(createSitemapRouter(pool))
if (pool) {
  app.use(createPracticeRouter(pool))
}
```

### Проверка

```bash
curl http://localhost:3000/practice/addition-10
curl http://localhost:3000/en/practice/addition-10
curl http://localhost:3000/sitemap.xml
curl http://localhost:3000/robots.txt
```

Каждая страница должна содержать:
- `<h1>` с названием темы
- 5 примеров задач
- `<script type="application/ld+json">` с EducationalApplication
- `<link rel="canonical">`
- `<link rel="alternate" hreflang="...">`

---

## TASK-PARENT-UI — Кнопка статистики в интерфейсе

**Зачем:** сейчас `/parent` — секретный URL который надо знать.
Нужна кнопка в интерфейсе но только для взрослых — не на детском экране.

**Решение:** кнопка в `ProgressScreen` внизу — там родители чаще всего
и смотрят прогресс ребёнка.

**Затрагиваемые файлы:**
- `client/src/screens/ProgressScreen.jsx`
- `client/src/index.css`

### Реализация

В конце `ProgressScreen.jsx` после списка тем добавить:

```jsx
<div className="parent-link-section">
  <p className="parent-link-hint">
    {lang === 'ru' ? 'Вы родитель?' : 'Are you a parent?'}
  </p>
  <Link to="/parent" className="btn btn--ghost parent-link-btn">
    {lang === 'ru' ? '📊 Подробная статистика' : '📊 Detailed statistics'}
  </Link>
</div>
```

CSS:
```css
.parent-link-section {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e8e8e8;
  text-align: center;
}

.parent-link-hint {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  color: #888;
}

.parent-link-btn {
  font-size: 0.95rem;
}
```

Также в `ParentScreen.jsx` — добавить кнопку "← Назад" вместо только
ссылки "К игре":

```jsx
<Link to="/progress" className="btn btn--ghost parent-page__link">
  {t('parent_back')}
</Link>
```

---

## Промпты для Cursor

Для каждого таска — отдельный сеанс:

### TASK-CACHE
```
Read TASKS-NEW.md, section TASK-CACHE.
Implement topic cache exactly as specified.
Run npm test --workspace=server after.
Do not touch routes, frontend, or DB schema.
```

### TASK-RESTORE
```
Read TASKS-NEW.md, section TASK-RESTORE.
Implement progress restore by shortcode exactly as specified.
Start with backend migration and routes, then frontend.
Run npm test --workspace=server after backend changes.
```

### TASK-I18N
```
Read TASKS-NEW.md, section TASK-I18N completely before writing any code.
Implement i18n exactly as specified.
Step 1: backend (migrate + seed title_en + problemGeneratorEn).
Step 2: frontend (i18n files + LangProvider + replace hardcoded strings).
Do not change any game logic or DB structure beyond what is specified.
```

### TASK-SEO-001
```
Read TASKS-NEW.md, section TASK-SEO-001.
TASK-I18N must already be done before this task.
Implement practice pages and sitemap exactly as specified.
After implementation verify with curl:
  curl http://localhost:3000/practice/addition-10
  curl http://localhost:3000/en/practice/multiplication-table
  curl http://localhost:3000/sitemap.xml
```

### TASK-PARENT-UI
```
Read TASKS-NEW.md, section TASK-PARENT-UI.
Small task — add parent link to ProgressScreen and back button to ParentScreen.
Use useT() hook for all strings (TASK-I18N must be done first).
```

---

## Статус

| Таск | Статус |
|------|--------|
| TASK-CACHE | ⬜ не начат |
| TASK-RESTORE | ⬜ не начат |
| TASK-I18N | ⬜ не начат |
| TASK-SEO-001 | ⬜ не начат |
| TASK-PARENT-UI | ⬜ не начат |
