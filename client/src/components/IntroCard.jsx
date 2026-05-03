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
  multiplication_big: { emoji: '🔢', text: 'Умножаем двузначные на однозначные — чуть больше числа!' },
  division_remainder: { emoji: '📦', text: 'Иногда при делении остаётся кусочек. Найдём остаток!' },
  fractions_simple: { emoji: '🍕', text: 'Дроби — это части целого. Половина пиццы — это 1/2!' },
  fractions_compare: { emoji: '⚖️', text: 'Какая дробь больше? Учимся сравнивать!' },
  fractions_add_sub: { emoji: '➕', text: 'Складываем дроби с одинаковым знаменателем.' },
  fractions_add_sub_diff: { emoji: '🔀', text: 'Разные знаменатели — приводим к общему виду.' },
  fractions_multiply: { emoji: '✖️', text: 'Умножаем дроби: числитель к числителю, знаменатель к знаменателю.' },
  fractions_divide: { emoji: '➗', text: 'Деление дробей — перевернём вторую и умножим.' },
  decimals_basic: { emoji: '🔢', text: 'Запятая в числе — это десятые и сотые.' },
  decimals_add_sub: { emoji: '➕', text: 'Складываем и вычитаем десятичные дроби.' },
  decimals_multiply: { emoji: '✖️', text: 'Умножаем числа с запятой.' },
  percent_basic: { emoji: '💯', text: 'Процент — это сотая доля. Удобно для скидок и оценок!' },
  percent_reverse: { emoji: '🔁', text: 'Иногда ищем целое, если знаем процент.' },
  negative_numbers: { emoji: '❄️', text: 'Числа бывают меньше нуля — как температура зимой.' },
  integers_add_sub: { emoji: '➕', text: 'Складываем и вычитаем положительные и отрицательные.' },
  integers_multiply: { emoji: '✖️', text: 'Правила знаков при умножении.' },
  powers_basic: { emoji: '📈', text: 'Степень — это повторное умножение.' },
  square_root_basic: { emoji: '√', text: 'Корень — обратная операция к квадрату.' },
  linear_equation_1: { emoji: '⚖️', text: 'Найдём x в простом уравнении.' },
  linear_equation_2: { emoji: '⚖️', text: 'Уравнение с множителем у x.' },
  linear_equation_3: { emoji: '⚖️', text: 'x с обеих сторон — соберём в кучу.' },
  ratio_proportion: { emoji: '📐', text: 'Пропорции связывают четыре числа.' },
  quadratic_simple: { emoji: '📉', text: 'Квадратное уравнение — ищем корни.' },
  quadratic_vieta: { emoji: '🔗', text: 'Связь между корнями и коэффициентами.' },
  systems_linear_2: { emoji: '🔀', text: 'Два уравнения — два неизвестных.' },
  inequalities_linear: { emoji: '📊', text: 'Неравенства: «меньше» и «больше».' },
  geometry_area_basic: { emoji: '📐', text: 'Считаем площади фигур.' },
  progressions_arithmetic: { emoji: '📏', text: 'Каждый следующий шаг на одно и то же число.' },
  progressions_geometric: { emoji: '📐', text: 'Каждый раз умножаем на одно и то же число.' },
  trigonometry_basic: { emoji: '📐', text: 'Синусы и косинусы углов.' },
  logarithms_basic: { emoji: '🪵', text: 'Логарифм отвечает: в какую степень возвести основание.' },
  logarithms_equations: { emoji: '🪵', text: 'Уравнения с логарифмами.' },
  exponential_equations: { emoji: '📈', text: 'Неизвестная в показателе степени.' },
  trigonometry_identities: { emoji: '✨', text: 'Полезные тождества для синуса и косинуса.' },
  trigonometry_equations: { emoji: '📐', text: 'Решаем простые тригонометрические уравнения.' },
  derivatives_basic: { emoji: '📉', text: 'Производная показывает, как быстро меняется функция.' },
  combinatorics_basic: { emoji: '🎲', text: 'Считаем варианты выбора и расстановки.' },
  probability_basic: { emoji: '🎯', text: 'Вероятность — доля удачных исходов.' },
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
