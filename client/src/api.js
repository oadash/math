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
    try {
      const err = await res.json()
      if (err.message) msg = err.message
      else if (err.error) msg = err.error
    } catch {
      /* ignore */
    }
    const e = new Error(msg)
    e.status = res.status
    throw e
  }

  if (res.status === 204) return null
  return res.json()
}
