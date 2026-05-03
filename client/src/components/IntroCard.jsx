const TOPIC_INTRO = {
  addition_10: { emoji: '➕', text: 'Сейчас будем складывать небольшие числа — до 10. Это основа всего!' },
  addition_20: { emoji: '🔢', text: 'Числа побольше — складываем до 20. Ты уже умеешь до 10, справишься!' },
  subtraction_10: { emoji: '➖', text: 'Вычитание: узнаём, сколько осталось. Всё в пределах 10.' },
  addition_100: { emoji: '🎯', text: 'Сложение побольше — до 100. Считаем внимательно!' },
  subtraction_20: { emoji: '✨', text: 'Вычитание до 20 — шаг чуть смелее!' },
  multiplication_2: { emoji: '✌️', text: 'Умножение на 2 — как удвоить число. Быстро и весело!' },
  multiplication_3: { emoji: '🔺', text: 'Умножаем на 3 — новый ритм!' },
  multiplication_5: { emoji: '🖐️', text: 'Умножение на 5 — удобные пятёрки!' },
  multiplication_10: { emoji: '🔟', text: 'На 10 — просто добавь нолик в голове!' },
  multiplication_full: { emoji: '🌈', text: 'Целая таблица умножения — ты почти математический герой!' },
  division_simple: { emoji: '📦', text: 'Деление: сколько раз число «помещается». Ты уже знаешь таблицу!' },
}

export default function IntroCard({ slug, titleRu, onContinue }) {
  const meta = TOPIC_INTRO[slug] || { emoji: '📚', text: `Новая тема: ${titleRu}` }

  return (
    <div className="intro-card">
      <div className="intro-card__inner">
        <div className="intro-card__emoji" aria-hidden>
          {meta.emoji}
        </div>
        <h2 className="intro-card__title">Новая тема</h2>
        <p className="intro-card__topic">{titleRu}</p>
        <p className="intro-card__text">{meta.text}</p>
        <button type="button" className="btn btn--primary btn--xl" onClick={onContinue}>
          Попробуем!
        </button>
      </div>
    </div>
  )
}
