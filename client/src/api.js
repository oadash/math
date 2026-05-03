const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${BASE}${p}`
}

const TOKEN_KEY = 'math_adventure_jwt'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * @param {string} path
 * @param {RequestInit & { json?: unknown }} [opts]
 */
export async function api(path, opts = {}) {
  const { json, ...rest } = opts
  const headers = { ...(rest.headers || {}) }
  if (json !== undefined) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(apiUrl(path), {
    ...rest,
    headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  })

  if (!res.ok) {
    let msg = res.statusText
    /** @type {string|undefined} */
    let apiCode
    try {
      const errBody = await res.json()
      if (typeof errBody.error === 'string') apiCode = errBody.error
      if (errBody.message) msg = errBody.message
      else if (errBody.error) msg = errBody.error
    } catch {
      /* ignore */
    }
    const e = new Error(msg)
    e.status = res.status
    e.apiCode = apiCode
    throw e
  }

  if (res.status === 204) return null
  return res.json()
}

/**
 * @param {Error & { apiCode?: string }} [err]
 * @param {string} [fallback] when the server sent no message
 */
export async function pinTopic(slug) {
  return api('/api/topic/pin', { method: 'POST', json: { topicSlug: slug } })
}

export async function unpinTopic() {
  return api('/api/topic/unpin', { method: 'POST' })
}

export function friendlyApiMessage(err, fallback = 'Что-то пошло не так') {
  if (!err) return fallback
  if (
    err.apiCode === 'database_unavailable' ||
    /database_unavailable/i.test(String(err.message))
  ) {
    return (
      'Сайт не может связаться с базой данных, поэтому зайти или поиграть пока нельзя. ' +
      'Попроси взрослого проверить хостинг: у сервиса с этим адресом должна быть переменная DATABASE_URL.'
    )
  }
  return err.message || fallback
}
