import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, friendlyApiMessage, getToken, setToken, restoreByCode } from '../api.js'
import { useT } from '../i18n/useT.js'

export default function WelcomeScreen() {
  const navigate = useNavigate()
  const t = useT()
  const [name, setName] = useState('')
  const [age, setAge] = useState('8')
  const [grade, setGrade] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('register')
  const [restoreCode, setRestoreCode] = useState('')
  const [showCode, setShowCode] = useState(false)
  const [myCode, setMyCode] = useState('')

  useEffect(() => {
    if (getToken()) navigate('/play', { replace: true })
  }, [navigate])

  async function onSubmit(e) {
    e.preventDefault()
    setErr('')
    const n = name.trim()
    const a = Number(age)
    if (!n) {
      setErr(t('welcome_err_name'))
      return
    }
    if (!Number.isFinite(a) || a < 1) {
      setErr(t('welcome_err_age'))
      return
    }
    setLoading(true)
    try {
      const data = await api('/api/users', {
        method: 'POST',
        json: { name: n, age: a, grade: grade === '' ? null : Number(grade) },
      })
      setToken(data.token)
      if (data.shortcode) {
        setMyCode(data.shortcode)
        setShowCode(true)
      } else {
        navigate('/play', { replace: true })
      }
    } catch (e) {
      setErr(friendlyApiMessage(e, t('welcome_err_generic'), t))
    } finally {
      setLoading(false)
    }
  }

  async function onRestore() {
    setErr('')
    setLoading(true)
    try {
      const data = await restoreByCode(restoreCode)
      setToken(data.token)
      navigate('/play', { replace: true })
    } catch (e) {
      setErr(friendlyApiMessage(e, t('welcome_err_restore'), t))
    } finally {
      setLoading(false)
    }
  }

  if (showCode) {
    return (
      <main className="welcome">
        <div className="welcome__card">
          <h2 className="welcome__brand">{t('welcome_code_title')}</h2>
          <p className="welcome__hint">{t('welcome_code_hint')}</p>
          <div className="shortcode-display">{myCode}</div>
          <button
            type="button"
            className="btn btn--primary btn--xl"
            onClick={() => navigate('/play', { replace: true })}
          >
            {t('welcome_start')}
          </button>
        </div>
      </main>
    )
  }

  if (mode === 'restore') {
    return (
      <main className="welcome">
        <div className="welcome__card">
          <h1 className="welcome__brand">{t('welcome_title')}</h1>
          <label className="welcome__label" htmlFor="restore-code">
            {t('welcome_restore_label')}
          </label>
          <input
            id="restore-code"
            className="welcome__input"
            value={restoreCode}
            onChange={(e) => setRestoreCode(e.target.value.toUpperCase())}
            placeholder={t('welcome_restore_placeholder')}
            autoCapitalize="characters"
          />
          {err ? <p className="welcome__error">{err}</p> : null}
          <button
            type="button"
            className="btn btn--primary btn--xl welcome__submit"
            disabled={loading}
            onClick={onRestore}
          >
            {loading ? t('welcome_loading') : t('welcome_restore_submit')}
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setMode('register')}>
            ← {t('welcome_submit')}
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="welcome">
      <div className="welcome__card">
        <h1 className="welcome__brand">{t('welcome_title')}</h1>
        <p className="welcome__hint">{t('welcome_subtitle')}</p>
        <form onSubmit={onSubmit} className="welcome__form">
          <label className="welcome__label" htmlFor="kid-name">
            {t('welcome_name_label')}
          </label>
          <input
            id="kid-name"
            className="welcome__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="nickname"
            maxLength={64}
            placeholder={t('welcome_name_placeholder')}
          />
          <label className="welcome__label welcome__label--small" htmlFor="kid-age">
            {t('welcome_age_label')}
          </label>
          <input
            id="kid-age"
            className="welcome__input welcome__input--narrow"
            inputMode="numeric"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            min={1}
            max={18}
          />
          <label className="welcome__label welcome__label--small" htmlFor="kid-grade">
            {t('welcome_grade_label')}
          </label>
          <select
            id="kid-grade"
            className="welcome__input"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
          >
            <option value="">{t('welcome_grade_none')}</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((g) => (
              <option key={g} value={String(g)}>
                {g} {t('grade_suffix')}
              </option>
            ))}
          </select>
          {err ? <p className="welcome__error">{err}</p> : null}
          <button type="submit" className="btn btn--primary btn--xl welcome__submit" disabled={loading}>
            {loading ? t('welcome_loading') : t('welcome_submit')}
          </button>
        </form>
        <button type="button" className="btn btn--ghost" onClick={() => setMode('restore')}>
          {t('welcome_restore')}
        </button>
      </div>
    </main>
  )
}
