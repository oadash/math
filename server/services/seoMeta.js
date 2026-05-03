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
    topics_page_title: 'Все темы',
    topics_page_desc:
      'Каталог тем математического тренажёра по классам. Выбери тему или открой приложение. Бесплатно, без рекламы.',
    topics_page_cta: 'Открыть приложение →',
    topics_group_heading: (g) => `${g} класс`,
    landing_doc_title: 'Train Math — бесплатный тренажёр математики',
    landing_meta_description:
      'Train Math — бесплатный онлайн-тренажёр математики для школьников 1–11 класса. Без рекламы, без оценок и лишнего давления. Темы от сложения до производных, задачи с мгновенной проверкой. Начни с любого устройства.',
    landing_hero_subtitle:
      'Тренируйся в своём темпе: арифметика, дроби, уравнения, тригонометрия и многое другое — одна тема за раз.',
    landing_cta_start: 'Начать бесплатно',
    landing_cta_topics: 'Все темы',
    landing_feat_ads: 'Без рекламы',
    landing_feat_grades: 'Все классы: 1–11',
    landing_feat_pressure: 'Без оценок и давления',
    landing_lang_label: 'English',
    landing_footer_topics: 'Все темы',
    landing_footer_ru: 'Русская версия',
    landing_footer_sitemap: 'Карта сайта',
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
    topics_page_title: 'All topics',
    topics_page_desc:
      'Math trainer topics by grade. Pick a topic or open the app. Free, no ads.',
    topics_page_cta: 'Open the app →',
    topics_group_heading: (g) => `Grade ${g}`,
    landing_doc_title: 'Train Math — free math practice',
    landing_meta_description:
      'Train Math is a free online math trainer for grades 1–11. No ads, no grades, no pressure. Practice arithmetic, fractions, equations, trigonometry, and more — one topic at a time, with instant feedback. Works in the browser.',
    landing_hero_subtitle:
      'Build skills at your own pace, from basic operations to advanced topics — all in one calm, kid-friendly app.',
    landing_cta_start: 'Start for free',
    landing_cta_topics: 'All topics',
    landing_feat_ads: 'No ads',
    landing_feat_grades: 'Grades 1–11',
    landing_feat_pressure: 'No grades or pressure',
    landing_lang_label: 'Русский',
    landing_footer_topics: 'All topics',
    landing_footer_ru: 'Russian version',
    landing_footer_sitemap: 'Sitemap',
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

/** Общие стили с страницами practice (серверный HTML). */
const SEO_LAYOUT_STYLES = `body { font-family: system-ui, sans-serif; max-width: 640px; margin: 0 auto;
       padding: 1.5rem; color: #1a1a2e; background: #f4f7fb; }
    h1 { font-size: 1.75rem; margin-bottom: 0.5rem; }
    .desc { color: #555; margin-bottom: 1.5rem; }
    .examples { background: #fff; border-radius: 1rem; padding: 1.25rem;
                box-shadow: 0 4px 16px rgba(0,0,0,0.06); margin-bottom: 1.5rem; }
    .examples h2 { font-size: 1rem; margin: 1.25rem 0 0.75rem; color: #555; }
    .examples h2:first-child { margin-top: 0; }
    .topic-list { list-style: none; padding: 0; margin: 0; }
    .topic-list li { padding: 0.35rem 0; border-bottom: 1px solid #f0f0f0; }
    .topic-list li:last-child { border-bottom: none; }
    .topic-list a { color: #6c5ce7; font-weight: 700; text-decoration: none; font-size: 1.05rem; }
    .topic-list a:hover { text-decoration: underline; }
    .cta { display: block; background: #6c5ce7; color: #fff; text-decoration: none;
           padding: 1rem 1.5rem; border-radius: 1rem; text-align: center;
           font-size: 1.15rem; font-weight: 800; }`

const LANDING_EXTRA_STYLES = `
    .lang-switch { text-align: right; margin: -0.25rem 0 0.75rem; font-size: 0.9rem; }
    .lang-switch a { color: #6c5ce7; font-weight: 700; text-decoration: none; }
    .lang-switch a:hover { text-decoration: underline; }
    .hero-actions { display: flex; gap: 0.75rem; margin: 1rem 0 1.5rem; flex-wrap: wrap; }
    .hero-actions .cta { flex: 1; min-width: 9rem; margin: 0; box-sizing: border-box; }
    .cta--secondary { background: #fff !important; color: #6c5ce7 !important;
                      border: 2px solid #6c5ce7; }
    .features { list-style: none; padding: 0; margin: 0 0 1.5rem; }
    .features li { padding: 0.55rem 0 0.55rem 1.35rem; border-bottom: 1px solid #f0f0f0;
                   position: relative; color: #333; }
    .features li:last-child { border-bottom: none; }
    .features li::before { content: '✓'; position: absolute; left: 0; color: #6c5ce7; font-weight: 800; }
    .footer-nav { font-size: 0.9rem; color: #666; border-top: 1px solid #e8e8e8; padding-top: 1.25rem;
                  line-height: 1.8; }
    .footer-nav a { color: #6c5ce7; font-weight: 700; text-decoration: none; margin-right: 0.75rem; }
    .footer-nav a:hover { text-decoration: underline; }`

/**
 * @param {'ru'|'en'} lang
 */
export function renderLandingPage(lang) {
  const meta = SEO_META[lang]
  const base = 'https://trainmath.fyi'
  const isEn = lang === 'en'
  const canonical = isEn ? `${base}/en/` : `${base}/`
  const docTitle = meta.landing_doc_title
  const pageDesc = meta.landing_meta_description

  const langSwitchHtml = isEn
    ? `<p class="lang-switch"><a href="/">${escapeHtml(meta.landing_lang_label)}</a></p>`
    : `<p class="lang-switch"><a href="/en/">${escapeHtml(meta.landing_lang_label)}</a></p>`

  const topicsPath = isEn ? '/en/topics' : '/topics'
  const footerAltPath = isEn ? '/' : '/en/'

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: meta.site_name,
    description: pageDesc,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    browserRequirements: 'Requires JavaScript. Requires HTML5.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  }

  const jwtRedirectScript = `<script>
  if (localStorage.getItem('math_adventure_jwt')) {
    window.location.replace('/app/play');
  }
</script>`

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(docTitle)}</title>
  <meta name="description" content="${escapeHtml(pageDesc)}">
  <link rel="canonical" href="${canonical}">
  <link rel="alternate" hreflang="ru" href="${base}/">
  <link rel="alternate" hreflang="en" href="${base}/en/">
  <link rel="alternate" hreflang="x-default" href="${base}/">
  <meta property="og:title" content="${escapeHtml(docTitle)}">
  <meta property="og:description" content="${escapeHtml(pageDesc)}">
  <meta property="og:type" content="website">
  <script type="application/ld+json">${JSON.stringify(ld)}</script>
  <style>
    ${SEO_LAYOUT_STYLES}
    ${LANDING_EXTRA_STYLES}
  </style>
  ${jwtRedirectScript}
</head>
<body>
  ${langSwitchHtml}
  <h1>${escapeHtml(docTitle)}</h1>
  <p class="desc">${escapeHtml(meta.landing_hero_subtitle)}</p>
  <div class="hero-actions">
    <a href="/app" class="cta">${escapeHtml(meta.landing_cta_start)}</a>
    <a href="${topicsPath}" class="cta cta--secondary">${escapeHtml(meta.landing_cta_topics)}</a>
  </div>
  <div class="examples">
    <h2>${escapeHtml(isEn ? 'Why Train Math' : 'Почему Train Math')}</h2>
    <ul class="features">
      <li>${escapeHtml(meta.landing_feat_ads)}</li>
      <li>${escapeHtml(meta.landing_feat_pressure)}</li>
      <li>${escapeHtml(meta.landing_feat_grades)}</li>
    </ul>
  </div>
  <nav class="footer-nav" aria-label="${escapeHtml(isEn ? 'Site' : 'Сайт')}">
    <a href="${topicsPath}">${escapeHtml(meta.landing_footer_topics)}</a>
    <a href="${footerAltPath}">${escapeHtml(meta.landing_footer_ru)}</a>
    <a href="/sitemap.xml">${escapeHtml(meta.landing_footer_sitemap)}</a>
  </nav>
</body>
</html>`
}

/**
 * @param {Array<{ slug: string, title_ru: string, title_en?: string | null, sort_order: number }>} topics
 * @param {'ru'|'en'} lang
 */
export function renderTopicsPage(topics, lang) {
  const meta = SEO_META[lang]
  const base = 'https://trainmath.fyi'
  const canonicalLang = lang === 'en' ? '/en' : ''
  const altHrefLang = lang === 'en' ? 'ru' : 'en'
  const altLangPath = lang === 'en' ? '' : '/en'

  const pageTitle = meta.topics_page_title
  const pageDesc = meta.topics_page_desc

  const byGrade = new Map()
  for (const t of topics) {
    const g = SLUG_TO_GRADE[t.slug] ?? 0
    if (!byGrade.has(g)) byGrade.set(g, [])
    byGrade.get(g).push(t)
  }
  for (const [, list] of byGrade) {
    list.sort((a, b) => a.sort_order - b.sort_order)
  }
  const grades = [...byGrade.keys()].filter((g) => g > 0).sort((a, b) => a - b)
  if (byGrade.has(0) && byGrade.get(0).length) {
    grades.push(0)
  }

  const practicePrefix = lang === 'en' ? '/en/practice/' : '/practice/'

  const sectionsHtml = grades
    .map((g) => {
      const list = byGrade.get(g) ?? []
      const heading =
        g === 0 ? (lang === 'en' ? 'Other' : 'Другое') : meta.topics_group_heading(g)
      const links = list
        .map((t) => {
          const label = lang === 'en' ? (t.title_en ?? t.title_ru) : t.title_ru
          const urlSlug = t.slug.replace(/_/g, '-')
          return `<li><a href="${base}${practicePrefix}${urlSlug}">${escapeHtml(label)}</a></li>`
        })
        .join('')
      return `<h2>${escapeHtml(heading)}</h2><ul class="topic-list">${links}</ul>`
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(pageTitle)} — ${escapeHtml(meta.site_name)}</title>
  <meta name="description" content="${escapeHtml(pageDesc)}">
  <link rel="canonical" href="${base}${canonicalLang}/topics">
  <link rel="alternate" hreflang="${altHrefLang}"
        href="${base}${altLangPath}/topics">
  <link rel="alternate" hreflang="${lang}"
        href="${base}${canonicalLang}/topics">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(pageDesc)}">
  <meta property="og:type" content="website">
  <style>
    ${SEO_LAYOUT_STYLES}
  </style>
</head>
<body>
  <h1>${escapeHtml(pageTitle)}</h1>
  <p class="desc">${escapeHtml(pageDesc)}</p>
  <div class="examples">
    ${sectionsHtml}
  </div>
  <a href="/app" class="cta">${escapeHtml(meta.topics_page_cta)}</a>
</body>
</html>`
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
    ${SEO_LAYOUT_STYLES}
    .grade { display: inline-block; background: #e8e4ff; color: #6c5ce7;
             padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.85rem;
             font-weight: 700; margin-bottom: 1rem; }
    .example { font-size: 1.35rem; font-weight: 700; padding: 0.5rem 0;
               border-bottom: 1px solid #f0f0f0; }
    .example:last-child { border-bottom: none; }
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
  <a href="/app/?topic=${escapeHtml(topic.slug)}" class="cta">${escapeHtml(meta.cta)}</a>
</body>
</html>`
}
