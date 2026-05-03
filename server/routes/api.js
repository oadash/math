import express from 'express'
import { requireUser } from '../middleware/auth.js'
import { getJwtSecret, signUserToken, signProblemToken, verifyProblemToken } from '../auth/jwtUtil.js'
import { generateProblem } from '../services/problemGenerator.js'
import { generateProblemEn } from '../services/problemGeneratorEn.js'
import { getStartSlug } from '../services/gradeMapping.js'
import { scheduleNextTopic, runPromotionRules } from '../services/spiralScheduler.js'
import { getAllTopics } from '../services/topicCache.js'
import { generateShortcode } from '../services/shortcode.js'

export function createApiRouter(pool) {
  const r = express.Router()

  if (!pool) {
    r.use((_req, res) =>
      res.status(503).json({
        error: 'database_unavailable',
        message:
          'База недоступна: для ЭТОГО сервиса в Railway не задан DATABASE_URL (или он пустой). Открой Variables у сервиса с тем же доменом, что в браузере, добавь ссылку на Postgres → Redeploy.',
      }),
    )
    return r
  }

  const restoreAttemptsByIp = new Map()
  const restoreLimit = { windowMs: 60 * 60 * 1000, maxFailures: 10 }

  function restoreFailureCount(ip, now = Date.now()) {
    const entry = restoreAttemptsByIp.get(ip)
    if (!entry || entry.resetAt <= now) return 0
    return entry.count
  }

  function recordRestoreFailure(ip, now = Date.now()) {
    const entry = restoreAttemptsByIp.get(ip)
    if (!entry || entry.resetAt <= now) {
      restoreAttemptsByIp.set(ip, { count: 1, resetAt: now + restoreLimit.windowMs })
      return
    }
    entry.count += 1
  }

  r.post('/users/restore', async (req, res) => {
    try {
      if (!getJwtSecret()) {
        return res.status(500).json({
          error: 'config',
          message: 'Задайте переменную окружения JWT_SECRET',
        })
      }
      const code = String(req.body?.code ?? '').trim().toUpperCase()
      if (!code) return res.status(400).json({ error: 'bad_request' })

      const ip = req.ip ?? 'unknown'
      if (restoreFailureCount(ip) >= restoreLimit.maxFailures) {
        return res.status(429).json({ error: 'rate_limited' })
      }

      const result = await pool.query('SELECT id FROM users WHERE shortcode = $1', [code])
      if (result.rows.length === 0) {
        recordRestoreFailure(ip)
        console.warn('[restore] failed shortcode restore attempt', { ip })
        return res.status(404).json({
          error: 'not_found',
          message: 'Код не найден. Проверь правильность ввода.',
        })
      }
      restoreAttemptsByIp.delete(ip)
      const token = signUserToken(result.rows[0].id)
      return res.json({ token })
    } catch (e) {
      console.error(e)
      return res.status(500).json({ error: 'server_error' })
    }
  })

  r.post('/users', async (req, res) => {
    try {
      if (!getJwtSecret()) {
        return res.status(500).json({
          error: 'config',
          message: 'Задайте переменную окружения JWT_SECRET',
        })
      }
      const name = String(req.body?.name ?? '').trim()
      const age = Number(req.body?.age)
      if (!name || !Number.isFinite(age) || age < 1 || age > 120) {
        return res.status(400).json({ error: 'bad_request', message: 'Нужны name и age' })
      }

      const gradeRaw = req.body?.grade
      const grade =
        gradeRaw === null || gradeRaw === undefined || gradeRaw === ''
          ? null
          : Number(gradeRaw)
      if (grade !== null && (!Number.isInteger(grade) || grade < 1 || grade > 11)) {
        return res.status(400).json({ error: 'bad_request', message: 'grade: 1–11 или не указывать' })
      }

      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const u = await client.query(
          `INSERT INTO users (name, age, grade) VALUES ($1, $2, $3) RETURNING id, name, age, grade, created_at`,
          [name, age, grade],
        )
        const userId = u.rows[0].id
        const topics = await getAllTopics(pool)
        const startSlug = getStartSlug(grade)
        let startTopic = topics.find((t) => t.slug === startSlug)
        if (!startTopic) {
          startTopic = topics.find((t) => t.slug === 'addition_10') ?? topics[0]
        }
        const startOrder = startTopic.sort_order
        for (const t of topics) {
          let state
          if (t.sort_order < startOrder) state = 'mastered'
          else if (t.slug === startTopic.slug) state = 'introducing'
          else state = 'locked'
          await client.query(
            `INSERT INTO user_topic_state (user_id, topic_id, state) VALUES ($1, $2, $3::topic_progress_state)`,
            [userId, t.id, state],
          )
        }

        let shortcode = null
        let attempts = 0
        while (!shortcode && attempts < 10) {
          const candidate = generateShortcode(name)
          try {
            await client.query('UPDATE users SET shortcode = $1 WHERE id = $2', [candidate, userId])
            shortcode = candidate
          } catch (e) {
            if (e.code === '23505') {
              attempts++
              continue
            }
            throw e
          }
        }

        await client.query('COMMIT')
        const token = signUserToken(userId)
        return res.status(201).json({ token, shortcode, user: u.rows[0] })
      } catch (e) {
        await client.query('ROLLBACK')
        throw e
      } finally {
        client.release()
      }
    } catch (e) {
      console.error(e)
      return res.status(500).json({ error: 'server_error' })
    }
  })

  r.get('/me', requireUser, async (req, res) => {
    try {
      const u = await pool.query(
        `SELECT id, name, age, grade, shortcode, created_at FROM users WHERE id = $1`,
        [req.userId],
      )
      if (u.rows.length === 0) return res.status(404).json({ error: 'not_found' })
      const states = await pool.query(
        `SELECT t.slug, t.title_ru, t.title_en, t.sort_order, uts.state, uts.correct_streak, uts.total_correct, uts.total_attempts
         FROM user_topic_state uts
         JOIN topics t ON t.id = uts.topic_id
         WHERE uts.user_id = $1
         ORDER BY t.sort_order`,
        [req.userId],
      )
      res.json({ user: u.rows[0], topicStates: states.rows })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'server_error' })
    }
  })

  /** Сводка для взрослых: попытки и % верных за последние 7 дней по темам (тот же JWT, что у ребёнка). */
  r.get('/parent/summary', requireUser, async (req, res) => {
    try {
      const u = await pool.query(`SELECT name, age FROM users WHERE id = $1`, [req.userId])
      if (u.rows.length === 0) return res.status(404).json({ error: 'not_found' })

      const topics = await pool.query(
        `SELECT t.slug, t.title_ru, t.title_en, t.sort_order,
            COALESCE(COUNT(a.id), 0)::int AS attempts,
            COALESCE(SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END), 0)::int AS correct
         FROM topics t
         LEFT JOIN answers a
           ON a.topic_id = t.id
          AND a.user_id = $1
          AND a.created_at >= now() - interval '7 days'
         GROUP BY t.id, t.slug, t.title_ru, t.title_en, t.sort_order
         ORDER BY t.sort_order`,
        [req.userId],
      )

      let totalAttempts = 0
      let totalCorrect = 0
      const byTopic = topics.rows.map((row) => {
        totalAttempts += row.attempts
        totalCorrect += row.correct
        const percentCorrect =
          row.attempts > 0 ? Math.round((100 * row.correct) / row.attempts) : null
        return {
          slug: row.slug,
          titleRu: row.title_ru,
          titleEn: row.title_en,
          attempts: row.attempts,
          correct: row.correct,
          percentCorrect,
        }
      })

      const since = await pool.query(`SELECT (now() - interval '7 days') AS t`)
      const sinceIso = since.rows[0]?.t?.toISOString?.() ?? null

      res.json({
        user: u.rows[0],
        periodDays: 7,
        since: sinceIso,
        totals: {
          attempts: totalAttempts,
          correct: totalCorrect,
          percentCorrect:
            totalAttempts > 0 ? Math.round((100 * totalCorrect) / totalAttempts) : null,
        },
        byTopic,
      })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'server_error' })
    }
  })

  r.post('/topic/pin', requireUser, async (req, res) => {
    try {
      const topicSlug = String(req.body?.topicSlug ?? '').trim()
      if (!topicSlug) {
        return res.status(400).json({ error: 'bad_request', message: 'Нужен topicSlug' })
      }
      const topics = await getAllTopics(pool)
      const topicRow = topics.find((t) => t.slug === topicSlug)
      if (!topicRow) {
        return res.status(400).json({ error: 'unknown_topic', message: 'Тема не найдена' })
      }
      const topicId = topicRow.id
      const st = await pool.query(
        `SELECT state FROM user_topic_state WHERE user_id = $1 AND topic_id = $2`,
        [req.userId, topicId],
      )
      if (st.rows.length === 0) {
        return res.status(403).json({ error: 'forbidden', message: 'Нет прогресса по этой теме' })
      }
      await pool.query(`UPDATE users SET pinned_topic_slug = $2 WHERE id = $1`, [req.userId, topicSlug])
      res.json({ ok: true, pinnedSlug: topicSlug })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'server_error' })
    }
  })

  r.post('/topic/unpin', requireUser, async (req, res) => {
    try {
      await pool.query(`UPDATE users SET pinned_topic_slug = NULL WHERE id = $1`, [req.userId])
      res.json({ ok: true })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'server_error' })
    }
  })

  r.get('/progress', requireUser, async (req, res) => {
    try {
      const states = await pool.query(
        `SELECT t.slug, t.title_ru, t.title_en, t.sort_order, uts.state, uts.correct_streak, uts.total_correct, uts.total_attempts
         FROM user_topic_state uts
         JOIN topics t ON t.id = uts.topic_id
         WHERE uts.user_id = $1
         ORDER BY t.sort_order`,
        [req.userId],
      )
      res.json({ topicStates: states.rows })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'server_error' })
    }
  })

  r.get('/problem', requireUser, async (req, res) => {
    try {
      const picked = await scheduleNextTopic(pool, req.userId)
      if (!picked) return res.status(404).json({ error: 'no_topic' })
      const pinMeta = await pool.query(`SELECT pinned_topic_slug FROM users WHERE id = $1`, [req.userId])
      const pinnedTopicSlug = pinMeta.rows[0]?.pinned_topic_slug ?? null
      const lang = req.query.lang === 'en' ? 'en' : 'ru'
      const prob =
        lang === 'en' ? generateProblemEn(picked.topic) : generateProblem(picked.topic)
      const problemToken = signProblemToken({
        problemId: prob.id,
        topicSlug: prob.topic_slug,
        answer: prob.stringAnswer == null ? prob.answer : null,
        stringAnswer: prob.stringAnswer ?? null,
      })
      const { answer: _ans, stringAnswer: _strAns, ...problem } = prob
      res.json({
        problem,
        problemToken,
        isFirstIntroduction: picked.isFirstIntroduction,
        isPeek: picked.isPeek ?? false,
        pinnedTopicSlug,
        topic: {
          slug: picked.topic.slug,
          title_ru: picked.topic.title_ru,
          title_en: picked.topic.title_en ?? null,
          state: picked.topic.state,
        },
      })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'server_error' })
    }
  })

  /** Тело: { problemToken, answerGiven } — problemToken из GET /api/problem (внутри уже есть topicSlug и верный ответ). */
  r.post('/answer', requireUser, async (req, res) => {
    try {
      const { problemToken, answerGiven } = req.body ?? {}
      if (!problemToken) {
        return res.status(400).json({ error: 'bad_request', message: 'Нужен problemToken с GET /api/problem' })
      }
      let payload
      try {
        payload = verifyProblemToken(problemToken)
      } catch {
        return res.status(400).json({ error: 'bad_token', message: 'Просрочен или битый problemToken' })
      }
      const { problemId, topicSlug, answer, stringAnswer } = payload
      const topics = await getAllTopics(pool)
      const topicRow = topics.find((t) => t.slug === topicSlug)
      if (!topicRow) return res.status(400).json({ error: 'unknown_topic' })
      const topicId = topicRow.id

      const hasString = stringAnswer != null && stringAnswer !== ''
      let correct
      /** @type {string|number} */
      let correctAnswerOut
      let answerStored

      if (hasString) {
        const givenStr =
          typeof answerGiven === 'string' ? answerGiven.trim() : String(answerGiven ?? '').trim()
        if (!givenStr) {
          return res.status(400).json({ error: 'bad_request', message: 'Нужен ответ (строка)' })
        }
        correct = givenStr === String(stringAnswer).trim()
        correctAnswerOut = stringAnswer
        answerStored = givenStr
      } else {
        const given = Number(answerGiven)
        if (!Number.isFinite(given)) {
          return res.status(400).json({ error: 'bad_request', message: 'answerGiven должен быть числом' })
        }
        correct = given === Number(answer)
        correctAnswerOut = answer
        answerStored = String(given)
      }

      const problemJson = { id: problemId, topic_slug: topicSlug }

      const client = await pool.connect()
      try {
        await client.query('BEGIN')

        const st = await client.query(
          `SELECT state, correct_streak, total_correct, total_attempts FROM user_topic_state WHERE user_id = $1 AND topic_id = $2 FOR UPDATE`,
          [req.userId, topicId],
        )
        if (st.rows.length === 0) {
          await client.query('ROLLBACK')
          return res.status(400).json({ error: 'no_state' })
        }
        const was = st.rows[0]
        let newStreak = correct ? Number(was.correct_streak) + 1 : 0
        let newState = was.state
        if (was.state === 'locked') {
          newState = 'locked'
          newStreak = 0
        } else if (was.state === 'introducing' && correct) {
          newState = 'practicing'
        }

        await client.query(
          `INSERT INTO answers (user_id, topic_id, problem_json, answer_given, is_correct)
           VALUES ($1, $2, $3::jsonb, $4, $5)`,
          [req.userId, topicId, JSON.stringify(problemJson), answerStored, correct],
        )

        await client.query(
          `UPDATE user_topic_state SET
             total_attempts = total_attempts + 1,
             total_correct = total_correct + $3,
             correct_streak = $4,
             state = $5::topic_progress_state
           WHERE user_id = $1 AND topic_id = $2`,
          [req.userId, topicId, correct ? 1 : 0, newStreak, newState],
        )

        await client.query('COMMIT')
      } catch (e) {
        await client.query('ROLLBACK')
        throw e
      } finally {
        client.release()
      }

      await runPromotionRules(pool, req.userId)

      const updated = await pool.query(
        `SELECT t.slug, t.title_ru, t.title_en, uts.state, uts.correct_streak, uts.total_correct, uts.total_attempts
         FROM user_topic_state uts
         JOIN topics t ON t.id = uts.topic_id
         WHERE uts.user_id = $1 AND t.slug = $2`,
        [req.userId, topicSlug],
      )

      res.json({
        correct,
        correctAnswer: correctAnswerOut,
        updatedTopicState: updated.rows[0] ?? null,
      })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'server_error' })
    }
  })

  return r
}
