import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { api, friendlyApiMessage, getToken, pinTopic } from '../api.js'
import { useLang, useT } from '../i18n/useT.js'

const STATE_COLOR = {
  locked: { bg: '#e8e8e8', fg: '#555' },
  introducing: { bg: '#ffe08a', fg: '#5c4a00' },
  practicing: { bg: '#7eb8ff', fg: '#0a2a5c' },
  mastered: { bg: '#7dcea0', fg: '#14532d' },
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
  const navigate = useNavigate()
  const { lang } = useLang()
  const t = useT()
  const [data, setData] = useState(null)
  const [shortcode, setShortcode] = useState(undefined)
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [progressRes, meRes] = await Promise.all([api('/api/progress'), api('/api/me')])
        if (!cancelled) {
          setData(progressRes)
          setShortcode(meRes.user?.shortcode ?? null)
        }
      } catch (e) {
        if (!cancelled) setErr(friendlyApiMessage(e, t('progress_err'), t))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [t])

  if (!getToken()) return <Navigate to="/" replace />

  const totalAttempts = data?.topicStates?.reduce((s, x) => s + (x.total_attempts || 0), 0) ?? 0
  const streakToday = todayStreakFromStorage()

  return (
    <main className="progress-page">
      <h1 className="progress-page__title">{t('progress_title')}</h1>
      <div className="progress-page__stats">
        <div className="stat-pill">
          {t('progress_total')} <strong>{totalAttempts}</strong>
        </div>
        <div className="stat-pill">
          {t('progress_streak')} <strong>{streakToday}</strong>
        </div>
      </div>
      {err ? <p className="progress-page__error">{err}</p> : null}
      {!data && !err ? <p className="progress-page__loading">{t('progress_loading')}</p> : null}
      <ul className="topic-tree">
        {data?.topicStates?.map((x) => {
          const pal = STATE_COLOR[x.state] || STATE_COLOR.locked
          const stateLabel = t(`progress_state_${x.state}`)
          return (
            <li
              key={x.slug}
              className="topic-tree__node"
              style={{ borderLeftColor: pal.bg, background: `${pal.bg}33` }}
            >
              <span className="topic-tree__dot" style={{ background: pal.bg }} aria-hidden />
              <div className="topic-tree__body">
                <span className="topic-tree__title">
                  {lang === 'en' ? (x.title_en || x.title_ru) : x.title_ru}
                </span>
                <span className="topic-tree__badge" style={{ color: pal.fg }}>
                  {stateLabel}
                </span>
                {x.state !== 'locked' ? (
                  <span className="topic-tree__meta">
                    {t('progress_meta_correct')} {x.total_correct ?? 0} {t('progress_meta_of')}{' '}
                    {x.total_attempts ?? 0}
                    {x.correct_streak > 0
                      ? ` · ${t('progress_meta_streak')} ${x.correct_streak}`
                      : ''}
                  </span>
                ) : null}
                <button
                  type="button"
                  className="btn btn--ghost topic-tree__train-btn"
                  onClick={async () => {
                    try {
                      await pinTopic(x.slug)
                      navigate('/play')
                    } catch (e) {
                      setErr(friendlyApiMessage(e, t('progress_pin_err'), t))
                    }
                  }}
                >
                  {t('progress_train_btn')}
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="parent-link-section">
        <p className="parent-link-hint">{t('parent_link_hint')}</p>
        <Link to="/parent" className="btn btn--ghost parent-link-btn">
          {t('parent_link_btn')}
        </Link>
      </div>
      {shortcode ? (
        <div className="shortcode-section">
          <p className="shortcode-label">{t('shortcode_label')}</p>
          <div className="shortcode-display">{shortcode}</div>
        </div>
      ) : null}
    </main>
  )
}
