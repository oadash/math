import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api, getToken } from '../api.js'
import IntroCard from '../components/IntroCard.jsx'
import {
  correctFeedbackPhrase,
  wrongFeedbackPhrase,
  streakMilestoneMessage,
  streakMilestoneReached,
} from '../utils/encouragement.js'

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

export default function GameScreen() {
  const [phase, setPhase] = useState('loading')
  const [payload, setPayload] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [boardClass, setBoardClass] = useState('')
  const [feedback, setFeedback] = useState(null)

  const loadProblem = useCallback(async () => {
    setError('')
    setFeedback(null)
    setBoardClass('')
    setPhase('loading')
    try {
      const data = await api('/api/problem')
      setPayload(data)
      const slug = data.topic?.slug
      const seen = slug && sessionStorage.getItem(introSessionKey(slug))
      if (data.isFirstIntroduction && !seen) setPhase('intro')
      else setPhase('problem')
    } catch (e) {
      setError(e.message || 'Не удалось загрузить задачу')
      setPhase('problem')
    }
  }, [])

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
        const phrase = correctFeedbackPhrase()
        const streak = res.updatedTopicState?.correct_streak ?? 0
        const milestone = streakMilestoneReached(streak) ? streakMilestoneMessage(streak) : ''
        setFeedback({ correct: true, phrase, milestone })
        setTimeout(() => {
          setBusy(false)
          loadProblem()
        }, 900)
      } else {
        setBoardClass('board--wrong')
        setFeedback({
          correct: false,
          phrase: wrongFeedbackPhrase(),
          correctAnswer: res.correctAnswer,
        })
        setTimeout(() => {
          setBusy(false)
          loadProblem()
        }, 1500)
      }
    } catch (e) {
      setError(e.message || 'Ошибка ответа')
      setBusy(false)
    }
  }

  if (!getToken()) return <Navigate to="/" replace />

  if (phase === 'intro' && payload) {
    return <IntroCard slug={payload.topic.slug} titleRu={payload.topic.title_ru} onContinue={onIntroContinue} />
  }

  const showTopicPill = payload?.topic?.state === 'introducing'
  const p = payload?.problem

  return (
    <main className={`game ${boardClass}`}>
      {showTopicPill && payload?.topic ? <div className="topic-pill">{payload.topic.title_ru}</div> : null}

      {error ? (
        <p className="game__error">
          {error}{' '}
          <button type="button" className="btn btn--ghost" onClick={loadProblem}>
            Ещё раз
          </button>
        </p>
      ) : null}

      {phase === 'loading' && !error ? <p className="game__loading">Готовим задачу…</p> : null}

      {feedback ? (
        <div className={`game__feedback ${feedback.correct ? 'is-correct' : 'is-wrong'}`} role="status">
          <span className="game__feedback-phrase">{feedback.phrase}</span>
          {!feedback.correct && feedback.correctAnswer !== undefined ? (
            <span className="game__feedback-answer">Правильно: {feedback.correctAnswer}</span>
          ) : null}
          {feedback.milestone ? <span className="game__feedback-milestone">{feedback.milestone}</span> : null}
        </div>
      ) : null}

      {p && phase === 'problem' && !feedback ? (
        <>
          <div className="game__problem">{p.display}</div>
          <div className="choices-grid">
            {p.choices.map((n) => (
              <button
                key={n}
                type="button"
                className="choice-btn"
                disabled={busy}
                onClick={() => onChoose(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </main>
  )
}
