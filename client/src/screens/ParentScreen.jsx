import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api, friendlyApiMessage, getToken } from '../api.js'

export default function ParentScreen() {
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await api('/api/parent/summary')
        if (!cancelled) setData(res)
      } catch (e) {
        if (!cancelled) setErr(friendlyApiMessage(e, 'Не удалось загрузить сводку'))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!getToken()) return <Navigate to="/" replace />

  function onPrint() {
    window.print()
  }

  const activeTopics =
    data?.byTopic?.filter((t) => t.attempts > 0) ?? []

  return (
    <main className="parent-page">
      <header className="parent-page__header parent-page__no-print">
        <h1 className="parent-page__title">Сводка за 7 дней</h1>
        <p className="parent-page__hint">
          Открой этот адрес вручную: в меню для детей ссылки нет. Данные — у того же ребёнка, чей JWT в
          этом браузере.
        </p>
        <div className="parent-page__actions">
          <button type="button" className="btn btn--primary" onClick={onPrint}>
            Распечатать
          </button>
          <Link to="/play" className="btn btn--ghost parent-page__link">
            К игре
          </Link>
        </div>
      </header>

      {err ? <p className="parent-page__error">{err}</p> : null}
      {!data && !err ? <p className="parent-page__loading">Загрузка…</p> : null}

      {data ? (
        <div className="parent-page__body">
          <section className="parent-card">
            <h2 className="parent-card__title">Ребёнок</h2>
            <p className="parent-card__meta">
              <strong>{data.user.name}</strong>, {data.user.age} лет
            </p>
            <p className="parent-card__period">
              Учитываются ответы с{' '}
              {data.since
                ? new Date(data.since).toLocaleString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '…'}
            </p>
          </section>

          <section className="parent-card">
            <h2 className="parent-card__title">Всего за период</h2>
            <ul className="parent-stats">
              <li>
                Попыток: <strong>{data.totals.attempts}</strong>
              </li>
              <li>
                Верно: <strong>{data.totals.correct}</strong>
              </li>
              <li>
                Доля верных:{' '}
                <strong>
                  {data.totals.percentCorrect != null ? `${data.totals.percentCorrect}%` : '—'}
                </strong>
              </li>
            </ul>
          </section>

          <section className="parent-card">
            <h2 className="parent-card__title">По темам</h2>
            {activeTopics.length === 0 ? (
              <p className="parent-card__empty">За эти 7 дней ещё не было попыток по темам.</p>
            ) : (
              <div className="parent-table-wrap">
                <table className="parent-table">
                  <thead>
                    <tr>
                      <th>Тема</th>
                      <th>Попыток</th>
                      <th>Верно</th>
                      <th>% верных</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTopics.map((t) => (
                      <tr key={t.slug}>
                        <td>{t.titleRu}</td>
                        <td>{t.attempts}</td>
                        <td>{t.correct}</td>
                        <td>{t.percentCorrect != null ? `${t.percentCorrect}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </main>
  )
}
