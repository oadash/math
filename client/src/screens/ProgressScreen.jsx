import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api, getToken } from '../api.js'

const STATE_COLOR = {
  locked: { bg: '#e8e8e8', fg: '#555', label: 'Скоро' },
  introducing: { bg: '#ffe08a', fg: '#5c4a00', label: 'Знакомимся' },
  practicing: { bg: '#7eb8ff', fg: '#0a2a5c', label: 'Тренируемся' },
  mastered: { bg: '#7dcea0', fg: '#14532d', label: 'Освоено' },
}

function todayStreakFromStorage() {
  try {
    const raw = localStorage.getItem('math_streak_today')
    if (!raw) return 0
    const { date, count } = JSON.parse(raw)
    const today = new Date().toDateString()
    if (date !== today) return 0
    return count
  } catch {
    return 0
  }
}

export default function ProgressScreen() {
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await api('/api/progress')
        if (!cancelled) setData(res)
      } catch (e) {
        if (!cancelled) setErr(e.message || 'Ошибка')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!getToken()) return <Navigate to="/" replace />

  const totalAttempts = data?.topicStates?.reduce((s, t) => s + (t.total_attempts || 0), 0) ?? 0
  const streakToday = todayStreakFromStorage()

  return (
    <main className="progress-page">
      <h1 className="progress-page__title">Твои темы</h1>
      <div className="progress-page__stats">
        <div className="stat-pill">
          Всего решено задач: <strong>{totalAttempts}</strong>
        </div>
        <div className="stat-pill">
          Серия сегодня: <strong>{streakToday}</strong>
        </div>
      </div>
      {err ? <p className="progress-page__error">{err}</p> : null}
      {!data && !err ? <p className="progress-page__loading">Загрузка…</p> : null}
      <ul className="topic-tree">
        {data?.topicStates?.map((t) => {
          const pal = STATE_COLOR[t.state] || STATE_COLOR.locked
          return (
            <li
              key={t.slug}
              className="topic-tree__node"
              style={{ borderLeftColor: pal.bg, background: `${pal.bg}33` }}
            >
              <span className="topic-tree__dot" style={{ background: pal.bg }} aria-hidden />
              <div className="topic-tree__body">
                <span className="topic-tree__title">{t.title_ru}</span>
                <span className="topic-tree__badge" style={{ color: pal.fg }}>
                  {pal.label}
                </span>
                {t.state !== 'locked' ? (
                  <span className="topic-tree__meta">
                    Верно {t.total_correct ?? 0} из {t.total_attempts ?? 0}
                    {t.correct_streak > 0 ? ` · серия ${t.correct_streak}` : ''}
                  </span>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
