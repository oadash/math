/**
 * TASK-005: веса introducing 35%, practicing 60%, mastered 5%;
 * правила по последним ответам в answers.
 */

async function lastNAnswersChronological(pool, userId, topicId, n) {
  const r = await pool.query(
    `SELECT is_correct FROM answers
     WHERE user_id = $1 AND topic_id = $2
     ORDER BY created_at DESC
     LIMIT $3`,
    [userId, topicId, n],
  )
  return r.rows.map((row) => row.is_correct).reverse()
}

/** Экспорт для тестов: порядок — от старого ответа к новому. */
export function maxConsecutiveCorrect(oldestFirst) {
  let best = 0
  let cur = 0
  for (const ok of oldestFirst) {
    if (ok) {
      cur++
      best = Math.max(best, cur)
    } else {
      cur = 0
    }
  }
  return best
}

export async function runPromotionRules(pool, userId) {
  const practicing = await pool.query(
    `SELECT topic_id FROM user_topic_state
     WHERE user_id = $1 AND state = 'practicing'`,
    [userId],
  )

  for (const { topic_id } of practicing.rows) {
    const last12 = await lastNAnswersChronological(pool, userId, topic_id, 12)
    if (last12.length >= 10 && maxConsecutiveCorrect(last12) >= 10) {
      await pool.query(
        `UPDATE user_topic_state SET state = 'mastered'
         WHERE user_id = $1 AND topic_id = $2 AND state = 'practicing'`,
        [userId, topic_id],
      )
    }
  }

  const practicing2 = await pool.query(
    `SELECT topic_id FROM user_topic_state
     WHERE user_id = $1 AND state = 'practicing'`,
    [userId],
  )

  for (const { topic_id } of practicing2.rows) {
    const last5 = await lastNAnswersChronological(pool, userId, topic_id, 5)
    if (last5.length >= 3 && maxConsecutiveCorrect(last5) >= 3) {
      await pool.query(
        `UPDATE user_topic_state uts
         SET state = 'introducing'
         FROM topics t
         WHERE uts.topic_id = t.id
           AND uts.user_id = $1
           AND t.prerequisite_topic_id = $2
           AND uts.state = 'locked'`,
        [userId, topic_id],
      )
    }
  }
}

async function pickWeightedTopicRow(pool, userId) {
  const r = await pool.query(
    `SELECT uts.state, t.id, t.slug, t.title_ru, t.sort_order
     FROM user_topic_state uts
     JOIN topics t ON t.id = uts.topic_id
     WHERE uts.user_id = $1
       AND uts.state IN ('introducing', 'practicing', 'mastered')`,
    [userId],
  )
  const rows = r.rows

  const weighted = rows.map((row) => ({
    row,
    w: row.state === 'introducing' ? 35 : row.state === 'practicing' ? 60 : 5,
  }))

  const peekR = await pool.query(
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
    [userId],
  )
  const peekWeighted = peekR.rows.map((row) => ({
    row: { ...row, state: 'peeking' },
    w: 10,
  }))

  const allWeighted = [...weighted, ...peekWeighted]
  if (allWeighted.length === 0) return null

  const total = allWeighted.reduce((s, x) => s + x.w, 0)
  let pick = Math.random() * total
  for (const { row, w } of allWeighted) {
    if (pick < w) return row
    pick -= w
  }
  return allWeighted[allWeighted.length - 1].row
}

/**
 * @returns {Promise<{ topic: { id: string, slug: string, title_ru: string, state: string, sort_order: number }, isFirstIntroduction: boolean, isPeek?: boolean } | null>}
 */
export async function scheduleNextTopic(pool, userId) {
  await runPromotionRules(pool, userId)

  const pinnedRow = await pool.query(`SELECT pinned_topic_slug FROM users WHERE id = $1`, [userId])
  const pinnedSlug = pinnedRow.rows[0]?.pinned_topic_slug ?? null

  if (pinnedSlug) {
    const pinned = await pool.query(
      `SELECT uts.state, t.id, t.slug, t.title_ru, t.sort_order
       FROM user_topic_state uts
       JOIN topics t ON t.id = uts.topic_id
       WHERE uts.user_id = $1 AND t.slug = $2`,
      [userId, pinnedSlug],
    )
    if (pinned.rows.length > 0) {
      const row = pinned.rows[0]
      return {
        topic: {
          id: row.id,
          slug: row.slug,
          title_ru: row.title_ru,
          state: row.state,
          sort_order: row.sort_order,
        },
        isFirstIntroduction: row.state === 'introducing' || row.state === 'locked',
        isPeek: false,
      }
    }
    await pool.query(`UPDATE users SET pinned_topic_slug = NULL WHERE id = $1`, [userId])
  }

  const row = await pickWeightedTopicRow(pool, userId)
  if (!row) return null
  const isPeek = row.state === 'peeking'
  return {
    topic: {
      id: row.id,
      slug: row.slug,
      title_ru: row.title_ru,
      state: row.state,
      sort_order: row.sort_order,
    },
    isFirstIntroduction: row.state === 'introducing' || isPeek,
    isPeek,
  }
}
