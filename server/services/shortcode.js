import { randomInt } from 'crypto'

/** Генерирует код вида "МАРК-4829" (имя заглавными + 4 цифры). */
export function generateShortcode(name) {
  let prefix = name
    .trim()
    .toUpperCase()
    .replace(/[^А-ЯЁA-Z]/g, '')
    .slice(0, 6)
  if (!prefix) prefix = 'KID'
  const suffix = String(randomInt(1000, 9999))
  return `${prefix}-${suffix}`
}
