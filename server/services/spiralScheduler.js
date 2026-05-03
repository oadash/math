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

function maxConsecutiveCorrect(oldestFirst) {
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
    const last7 = await lastNAnswersChronological(pool, userId, topic_id, 7)
    if (last7.length >= 5 && maxConsecutiveCorrect(last7) >= 5) {
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
  if (rows.length === 0) return null

  const weighted = rows.map((row) => ({
    row,
    w: row.state === 'introducing' ? 35 : row.state === 'practicing' ? 60 : 5,
  }))
  const total = weighted.reduce((s, x) => s + x.w, 0)
  let pick = Math.random() * total
  for (const { row, w } of weighted) {
    if (pick < w) return row
    pick -= w
  }
  return weighted[weighted.length - 1].row
}

/**
 * @returns {Promise<{ topic: { id: string, slug: string, title_ru: string, state: string, sort_order: number }, isFirstIntroduction: boolean } | null>}
 */
export async function scheduleNextTopic(pool, userId) {
  await runPromotionRules(pool, userId)
  const row = await pickWeightedTopicRow(pool, userId)
  if (!row) return null
  return {
    topic: {
      id: row.id,
      slug: row.slug,
      title_ru: row.title_ru,
      state: row.state,
      sort_order: row.sort_order,
    },
    isFirstIntroduction: row.state === 'introducing',
  }
}
