import { verifyUserToken } from '../auth/jwtUtil.js'

export function requireUser(req, res, next) {
  const header = req.headers.authorization
  let token = null
  if (header?.startsWith('Bearer ')) token = header.slice(7)
  else if (req.cookies?.token) token = req.cookies.token

  if (!token) {
    return res.status(401).json({ error: 'unauthorized', message: 'Нужен Bearer token' })
  }
  try {
    req.userId = verifyUserToken(token)
    next()
  } catch {
    return res.status(401).json({ error: 'unauthorized', message: 'Неверный или просроченный token' })
  }
}
