export const SEO_META = {
  ru: {
    site_name: 'Train Math',
    default_desc: 'Тренажёр математики для детей. Без рекламы, без давления.',
    topic_title: (title, grade) =>
      `${title} — онлайн тренажёр${grade ? ` (${grade} класс)` : ''}`,
    topic_desc: (title, grade) =>
      `Тренируй ${title.toLowerCase()} онлайн бесплатно.${grade ? ` Подходит для ${grade} класса.` : ''} Без рекламы.`,
    examples_heading: 'Примеры задач',
    cta: 'Начать тренировку →',
    grade_label: 'Класс:',
  },
  en: {
    site_name: 'Train Math',
    default_desc: 'Math trainer for kids. No ads, no pressure.',
    topic_title: (title, grade) =>
      `${title} — free online practice${grade ? ` (grade ${grade})` : ''}`,
    topic_desc: (title, grade) =>
      `Practice ${title.toLowerCase()} online for free.${grade ? ` Suitable for grade ${grade}.` : ''} No ads.`,
    examples_heading: 'Example problems',
    cta: 'Start practicing →',
    grade_label: 'Grade:',
  },
}

export const SLUG_TO_GRADE = {
  addition_10: 1,
  addition_20: 2,
  subtraction_10: 1,
  addition_100: 3,
  subtraction_20: 2,
  multiplication_2: 3,
  multiplication_3: 3,
  multiplication_5: 3,
  multiplication_10: 3,
  multiplication_full: 4,
  division_simple: 4,
  multiplication_big: 4,
  division_remainder: 4,
  fractions_simple: 5,
  fractions_compare: 5,
  fractions_add_sub: 5,
  fractions_add_sub_diff: 6,
  fractions_multiply: 6,
  fractions_divide: 6,
  decimals_basic: 5,
  decimals_add_sub: 5,
  decimals_multiply: 6,
  percent_basic: 6,
  percent_reverse: 6,
  negative_numbers: 6,
  integers_add_sub: 6,
  integers_multiply: 7,
  powers_basic: 7,
  square_root_basic: 7,
  linear_equation_1: 7,
  linear_equation_2: 7,
  linear_equation_3: 7,
  ratio_proportion: 6,
  quadratic_simple: 8,
  quadratic_vieta: 8,
  systems_linear_2: 8,
  inequalities_linear: 8,
  geometry_area_basic: 8,
  progressions_arithmetic: 9,
  progressions_geometric: 9,
  trigonometry_basic: 9,
  logarithms_basic: 10,
  logarithms_equations: 10,
  exponential_equations: 10,
  trigonometry_identities: 10,
  trigonometry_equations: 11,
  derivatives_basic: 11,
  combinatorics_basic: 11,
  probability_basic: 11,
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function renderPracticePage(topic, lang, generateRu, generateEn) {
  const meta = SEO_META[lang]
  const grade = SLUG_TO_GRADE[topic.slug] ?? null
  const title = lang === 'en' ? (topic.title_en ?? topic.title_ru) : topic.title_ru
  const pageTitle = meta.topic_title(title, grade)
  const pageDesc = meta.topic_desc(title, grade)
  const canonicalLang = lang === 'en' ? '/en' : ''
  const altHrefLang = lang === 'en' ? 'ru' : 'en'
  const altLangPath = lang === 'en' ? '' : '/en'
  const urlSlug = topic.slug.replace(/_/g, '-')

  const gen = lang === 'en' ? generateEn : generateRu
  const examples = []
  for (let i = 0; i < 5; i++) {
    try {
      examples.push(gen({ slug: topic.slug }).display)
    } catch {
      /* skip */
    }
  }

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'EducationalApplication',
    name: `${title} — ${meta.site_name}`,
    description: pageDesc,
    educationalLevel: grade ? `Grade ${grade}` : undefined,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  }

  const base = 'https://trainmath.fyi'

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(pageTitle)} — ${escapeHtml(meta.site_name)}</title>
  <meta name="description" content="${escapeHtml(pageDesc)}">
  <link rel="canonical" href="${base}${canonicalLang}/practice/${urlSlug}">
  <link rel="alternate" hreflang="${altHrefLang}"
        href="${base}${altLangPath}/practice/${urlSlug}">
  <link rel="alternate" hreflang="${lang}"
        href="${base}${canonicalLang}/practice/${urlSlug}">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(pageDesc)}">
  <meta property="og:type" content="website">
  <script type="application/ld+json">${JSON.stringify(ld)}</script>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 0 auto;
           padding: 1.5rem; color: #1a1a2e; background: #f4f7fb; }
    h1 { font-size: 1.75rem; margin-bottom: 0.5rem; }
    .desc { color: #555; margin-bottom: 1.5rem; }
    .grade { display: inline-block; background: #e8e4ff; color: #6c5ce7;
             padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.85rem;
             font-weight: 700; margin-bottom: 1rem; }
    .examples { background: #fff; border-radius: 1rem; padding: 1.25rem;
                box-shadow: 0 4px 16px rgba(0,0,0,0.06); margin-bottom: 1.5rem; }
    .examples h2 { font-size: 1rem; margin: 0 0 0.75rem; color: #555; }
    .example { font-size: 1.35rem; font-weight: 700; padding: 0.5rem 0;
               border-bottom: 1px solid #f0f0f0; }
    .example:last-child { border-bottom: none; }
    .cta { display: block; background: #6c5ce7; color: #fff; text-decoration: none;
           padding: 1rem 1.5rem; border-radius: 1rem; text-align: center;
           font-size: 1.15rem; font-weight: 800; }
  </style>
</head>
<body>
  ${grade ? `<div class="grade">${escapeHtml(meta.grade_label)} ${grade}</div>` : ''}
  <h1>${escapeHtml(pageTitle)}</h1>
  <p class="desc">${escapeHtml(pageDesc)}</p>
  <div class="examples">
    <h2>${escapeHtml(meta.examples_heading)}</h2>
    ${examples.map((e) => `<div class="example">${escapeHtml(e)}</div>`).join('')}
  </div>
  <a href="/?topic=${escapeHtml(topic.slug)}" class="cta">${escapeHtml(meta.cta)}</a>
</body>
</html>`
}
