import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api, friendlyApiMessage, getToken } from '../api.js'
import { useLang, useT } from '../i18n/useT.js'

export default function ParentScreen() {
  const { lang } = useLang()
  const t = useT()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await api('/api/parent/summary')
        if (!cancelled) setData(res)
      } catch (e) {
        if (!cancelled) setErr(friendlyApiMessage(e, t('parent_err'), t))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [t])

  if (!getToken()) return <Navigate to="/" replace />

  function onPrint() {
    window.print()
  }

  const activeTopics = data?.byTopic?.filter((x) => x.attempts > 0) ?? []
  const locale = lang === 'en' ? 'en-US' : 'ru-RU'

  const topicLabel = (row) => (lang === 'en' ? (row.titleEn || row.titleRu) : row.titleRu)

  return (
    <main className="parent-page">
      <header className="parent-page__header parent-page__no-print">
        <h1 className="parent-page__title">{t('parent_title')}</h1>
        <p className="parent-page__hint">{t('parent_hint')}</p>
        <div className="parent-page__actions">
          <button type="button" className="btn btn--primary" onClick={onPrint}>
            {t('parent_print')}
          </button>
          <Link to="/progress" className="btn btn--ghost parent-page__link">
            {t('parent_back_progress')}
          </Link>
          <Link to="/play" className="btn btn--ghost parent-page__link">
            {t('parent_back')}
          </Link>
        </div>
      </header>

      {err ? <p className="parent-page__error">{err}</p> : null}
      {!data && !err ? <p className="parent-page__loading">{t('parent_loading')}</p> : null}

      {data ? (
        <div className="parent-page__body">
          <section className="parent-card">
            <h2 className="parent-card__title">{t('parent_child')}</h2>
            <p className="parent-card__meta">
              <strong>{data.user.name}</strong>, {data.user.age} {t('parent_age_suffix')}
            </p>
            <p className="parent-card__period">
              {t('parent_period')}{' '}
              {data.since
                ? new Date(data.since).toLocaleString(locale, {
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '…'}
            </p>
          </section>

          <section className="parent-card">
            <h2 className="parent-card__title">{t('parent_total')}</h2>
            <ul className="parent-stats">
              <li>
                {t('parent_attempts')} <strong>{data.totals.attempts}</strong>
              </li>
              <li>
                {t('parent_correct')} <strong>{data.totals.correct}</strong>
              </li>
              <li>
                {t('parent_percent')}{' '}
                <strong>
                  {data.totals.percentCorrect != null ? `${data.totals.percentCorrect}%` : '—'}
                </strong>
              </li>
            </ul>
          </section>

          <section className="parent-card">
            <h2 className="parent-card__title">{t('parent_by_topic')}</h2>
            {activeTopics.length === 0 ? (
              <p className="parent-card__empty">{t('parent_no_topics')}</p>
            ) : (
              <div className="parent-table-wrap">
                <table className="parent-table">
                  <thead>
                    <tr>
                      <th>{t('parent_col_topic')}</th>
                      <th>{t('parent_col_attempts')}</th>
                      <th>{t('parent_col_correct')}</th>
                      <th>{t('parent_col_percent')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTopics.map((row) => (
                      <tr key={row.slug}>
                        <td>{topicLabel(row)}</td>
                        <td>{row.attempts}</td>
                        <td>{row.correct}</td>
                        <td>{row.percentCorrect != null ? `${row.percentCorrect}%` : '—'}</td>
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
