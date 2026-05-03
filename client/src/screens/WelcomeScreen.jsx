import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, getToken, setToken } from '../api.js'

export default function WelcomeScreen() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [age, setAge] = useState('8')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (getToken()) navigate('/play', { replace: true })
  }, [navigate])

  async function onSubmit(e) {
    e.preventDefault()
    setErr('')
    const n = name.trim()
    const a = Number(age)
    if (!n) {
      setErr('Напиши, как тебя зовут')
      return
    }
    if (!Number.isFinite(a) || a < 1) {
      setErr('Укажи возраст числом')
      return
    }
    setLoading(true)
    try {
      const data = await api('/api/users', { method: 'POST', json: { name: n, age: a } })
      setToken(data.token)
      navigate('/play', { replace: true })
    } catch (e) {
      setErr(e.message || 'Не получилось зайти')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="welcome">
      <div className="welcome__card">
        <h1 className="welcome__brand">Math Adventure</h1>
        <p className="welcome__hint">Математика без спешки и оценок</p>
        <form onSubmit={onSubmit} className="welcome__form">
          <label className="welcome__label" htmlFor="kid-name">
            Как тебя зовут?
          </label>
          <input
            id="kid-name"
            className="welcome__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="nickname"
            maxLength={64}
            placeholder="Например, Миша"
          />
          <label className="welcome__label welcome__label--small" htmlFor="kid-age">
            Сколько тебе лет?
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
          {err ? <p className="welcome__error">{err}</p> : null}
          <button type="submit" className="btn btn--primary btn--xl welcome__submit" disabled={loading}>
            {loading ? 'Секунду…' : 'Играть!'}
          </button>
        </form>
      </div>
    </main>
  )
}
