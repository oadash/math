import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api, friendlyApiMessage, getToken, unpinTopic } from '../api.js'
import IntroCard from '../components/IntroCard.jsx'
import { useLang, useT } from '../i18n/useT.js'
import { pickRandom, streakMilestoneReached } from '../utils/encouragement.js'

function introSessionKey(slug) {
  return `intro_once:${slug}`
}

function bumpTodayStreak(correct) {
  const today = new Date().toDateString()
  let count = 0
  try {
    const raw = localStorage.getItem('math_streak_today')
    if (raw) {
      const j = JSON.parse(raw)
      if (j.date === today) count = j.count
    }
  } catch {
    /* ignore */
  }
  if (correct) count += 1
  else count = 0
  localStorage.setItem('math_streak_today', JSON.stringify({ date: today, count }))
}

function streakMilestoneMessage(streak, t) {
  if (streak >= 20) return t('game_milestone_20')
  if (streak >= 10) return t('game_milestone_10')
  if (streak >= 5) return t('game_milestone_5')
  return ''
}

export default function GameScreen() {
  const { lang } = useLang()
  const t = useT()
  const [phase, setPhase] = useState('loading')
  const [payload, setPayload] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [boardClass, setBoardClass] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [pinnedSlug, setPinnedSlug] = useState(null)

  const topicTitle = (topic) => {
    if (!topic) return ''
    return lang === 'en' ? (topic.title_en || topic.title_ru) : topic.title_ru
  }

  const loadProblem = useCallback(async () => {
    setError('')
    setFeedback(null)
    setBoardClass('')
    setPhase('loading')
    try {
      const data = await api(`/api/problem?lang=${lang}`)
      setPayload(data)
      setPinnedSlug(data.pinnedTopicSlug ?? null)
      const slug = data.topic?.slug
      const seen = slug && sessionStorage.getItem(introSessionKey(slug))
      if (data.isFirstIntroduction && !seen) setPhase('intro')
      else setPhase('problem')
    } catch (e) {
      setError(friendlyApiMessage(e, t('game_error_load'), t))
      setPhase('problem')
    }
  }, [lang, t])

  useEffect(() => {
    if (!getToken()) return
    loadProblem()
  }, [loadProblem])

  function onIntroContinue() {
    if (!payload?.topic?.slug) return
    sessionStorage.setItem(introSessionKey(payload.topic.slug), '1')
    setPhase('problem')
  }

  async function onChoose(choice) {
    if (!payload?.problemToken || busy || phase !== 'problem') return
    setBusy(true)
    try {
      const res = await api('/api/answer', {
        method: 'POST',
        json: { problemToken: payload.problemToken, answerGiven: choice },
      })
      bumpTodayStreak(res.correct)

      if (res.correct) {
        setBoardClass('board--correct')
        const phrase = pickRandom(t('game_correct'))
        const streak = res.updatedTopicState?.correct_streak ?? 0
        const milestone = streakMilestoneReached(streak) ? streakMilestoneMessage(streak, t) : ''
        setFeedback({ correct: true, phrase, milestone })
        setTimeout(() => {
          setBusy(false)
          loadProblem()
        }, 900)
      } else {
        setBoardClass('board--wrong')
        setFeedback({
          correct: false,
          phrase: pickRandom(t('game_wrong')),
          correctAnswer: res.correctAnswer,
        })
        setTimeout(() => {
          setBusy(false)
          loadProblem()
        }, 1500)
      }
    } catch (e) {
      setError(friendlyApiMessage(e, t('game_error_answer'), t))
      setBusy(false)
    }
  }

  if (!getToken()) return <Navigate to="/" replace />

  if (phase === 'intro' && payload) {
    return (
      <IntroCard
        slug={payload.topic.slug}
        titleRu={payload.topic.title_ru}
        titleEn={payload.topic.title_en}
        onContinue={onIntroContinue}
      />
    )
  }

  const showTopicPill = payload?.topic?.state === 'introducing'
  const p = payload?.problem

  return (
    <main className={`game ${boardClass}`}>
      {showTopicPill && payload?.topic ? (
        <div className="topic-pill">{topicTitle(payload.topic)}</div>
      ) : null}

      {pinnedSlug ? (
        <div className="pin-banner">
          <span>
            {t('game_pin_training')} {topicTitle(payload?.topic)}
          </span>
          <button
            type="button"
            className="btn btn--ghost pin-banner__unpin"
            onClick={async () => {
              try {
                await unpinTopic()
                setPinnedSlug(null)
                loadProblem()
              } catch (e) {
                setError(friendlyApiMessage(e, t('game_error_unpin'), t))
              }
            }}
          >
            {t('game_pin_random')}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="game__error">
          {error}{' '}
          <button type="button" className="btn btn--ghost" onClick={loadProblem}>
            {t('game_retry')}
          </button>
        </p>
      ) : null}

      {phase === 'loading' && !error ? <p className="game__loading">{t('game_loading')}</p> : null}

      {feedback ? (
        <div className={`game__feedback ${feedback.correct ? 'is-correct' : 'is-wrong'}`} role="status">
          <span className="game__feedback-phrase">{feedback.phrase}</span>
          {!feedback.correct && feedback.correctAnswer !== undefined && feedback.correctAnswer !== null ? (
            <span className="game__feedback-answer">
              {t('game_correct_answer')} {String(feedback.correctAnswer)}
            </span>
          ) : null}
          {feedback.milestone ? <span className="game__feedback-milestone">{feedback.milestone}</span> : null}
        </div>
      ) : null}

      {p && phase === 'problem' && !feedback ? (
        <>
          <div className="game__problem">{p.display}</div>
          <div className="choices-grid">
            {(p.stringChoices ?? p.choices).map((opt) => (
              <button
                key={String(opt)}
                type="button"
                className="choice-btn"
                disabled={busy}
                onClick={() => onChoose(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </main>
  )
}
