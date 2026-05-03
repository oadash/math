import jwt from 'jsonwebtoken'

export function getJwtSecret() {
  const s = process.env.JWT_SECRET
  if (s && s.length > 0) return s
  return null
}

export function signUserToken(userId) {
  const secret = getJwtSecret()
  if (!secret) throw new Error('JWT_SECRET is required in production')
  return jwt.sign({ sub: userId }, secret, { expiresIn: '60d' })
}

export function verifyUserToken(token) {
  const secret = getJwtSecret()
  if (!secret) throw new Error('JWT_SECRET is required in production')
  const p = jwt.verify(token, secret)
  return p.sub
}

/** Короткоживущий токен задачи (правильный ответ только на сервере). */
export function signProblemToken(payload) {
  const secret = getJwtSecret()
  if (!secret) throw new Error('JWT_SECRET is required in production')
  return jwt.sign(payload, secret, { expiresIn: '25m' })
}

export function verifyProblemToken(token) {
  const secret = getJwtSecret()
  if (!secret) throw new Error('JWT_SECRET is required in production')
  return jwt.verify(token, secret)
}
