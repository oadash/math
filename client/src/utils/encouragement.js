export const CORRECT_PHRASES = ['Отлично!', 'Верно!', 'Молодец!', 'Так держать!', 'Супер!']

export const WRONG_PHRASES = ['Почти!', 'Попробуй ещё', 'Не беда!']

export const STREAK_MILESTONES = [5, 10, 20]

/** @param {string[]} arr */
export function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function correctFeedbackPhrase() {
  return pickRandom(CORRECT_PHRASES)
}

export function wrongFeedbackPhrase() {
  return pickRandom(WRONG_PHRASES)
}

/** @param {number} streak */
export function streakMilestoneReached(streak) {
  return STREAK_MILESTONES.includes(streak)
}

/** Короткий текст для вехи серии (без негатива). */
export function streakMilestoneMessage(streak) {
  if (streak >= 20) return 'Ух ты, какая серия!'
  if (streak >= 10) return 'Десять подряд — круто!'
  if (streak >= 5) return 'Пять подряд — супер!'
  return ''
}
