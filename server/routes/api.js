import express from 'express'
import { requireUser } from '../middleware/auth.js'
import { getJwtSecret, signUserToken, signProblemToken, verifyProblemToken } from '../auth/jwtUtil.js'
import { generateProblem } from '../services/problemGenerator.js'
import { scheduleNextTopic, runPromotionRules } from '../services/spiralScheduler.js'

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

      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const u = await client.query(
          `INSERT INTO users (name, age) VALUES ($1, $2) RETURNING id, name, age, created_at`,
          [name, age],
        )
        const userId = u.rows[0].id
        const topics = await client.query(`SELECT id, slug FROM topics ORDER BY sort_order`)
        for (const t of topics.rows) {
          const state = t.slug === 'addition_10' ? 'introducing' : 'locked'
          await client.query(
            `INSERT INTO user_topic_state (user_id, topic_id, state) VALUES ($1, $2, $3::topic_progress_state)`,
            [userId, t.id, state],
          )
        }
        await client.query('COMMIT')
        const token = signUserToken(userId)
        return res.status(201).json({ token, user: u.rows[0] })
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
      const u = await pool.query(`SELECT id, name, age, created_at FROM users WHERE id = $1`, [req.userId])
      if (u.rows.length === 0) return res.status(404).json({ error: 'not_found' })
      const states = await pool.query(
        `SELECT t.slug, t.title_ru, t.sort_order, uts.state, uts.correct_streak, uts.total_correct, uts.total_attempts
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

  r.get('/progress', requireUser, async (req, res) => {
    try {
      const states = await pool.query(
        `SELECT t.slug, t.title_ru, t.sort_order, uts.state, uts.correct_streak, uts.total_correct, uts.total_attempts
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
      const prob = generateProblem(picked.topic)
      const problemToken = signProblemToken({
        problemId: prob.id,
        topicSlug: prob.topic_slug,
        answer: prob.answer,
      })
      const { answer: _ans, ...problem } = prob
      res.json({
        problem,
        problemToken,
        isFirstIntroduction: picked.isFirstIntroduction,
        topic: {
          slug: picked.topic.slug,
          title_ru: picked.topic.title_ru,
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
      const { problemId, topicSlug, answer } = payload
      const topicRow = await pool.query(`SELECT id FROM topics WHERE slug = $1`, [topicSlug])
      if (topicRow.rows.length === 0) return res.status(400).json({ error: 'unknown_topic' })
      const topicId = topicRow.rows[0].id

      const given = Number(answerGiven)
      if (!Number.isFinite(given)) {
        return res.status(400).json({ error: 'bad_request', message: 'answerGiven должен быть числом' })
      }
      const correct = given === Number(answer)

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
        const newStreak = correct ? Number(was.correct_streak) + 1 : 0
        let newState = was.state
        if (was.state === 'introducing' && correct) newState = 'practicing'

        await client.query(
          `INSERT INTO answers (user_id, topic_id, problem_json, answer_given, is_correct)
           VALUES ($1, $2, $3::jsonb, $4, $5)`,
          [req.userId, topicId, JSON.stringify(problemJson), given, correct],
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
        `SELECT t.slug, t.title_ru, uts.state, uts.correct_streak, uts.total_correct, uts.total_attempts
         FROM user_topic_state uts
         JOIN topics t ON t.id = uts.topic_id
         WHERE uts.user_id = $1 AND t.slug = $2`,
        [req.userId, topicSlug],
      )

      res.json({
        correct,
        correctAnswer: answer,
        updatedTopicState: updated.rows[0] ?? null,
      })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'server_error' })
    }
  })

  return r
}
