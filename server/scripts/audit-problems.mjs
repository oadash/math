import { generateProblem, GENERATOR_SLUGS } from '../services/problemGenerator.js'

const RUNS = 500
const issues = []

/** Темы с stringChoices — без числового answer. */
const STRING_SLUGS = new Set([
  'fractions_compare',
  'trigonometry_basic',
  'trigonometry_identities',
  'trigonometry_equations',
])

/** Как в TASK-AUDIT: ответ может совпасть с числом в тексте по смыслу задачи. */
const TRIVIAL_AUDIT_WHITELIST = new Set([
  'decimals_basic',
  'fractions_simple',
  'geometry_area_basic',
])

for (const slug of GENERATOR_SLUGS) {
  if (STRING_SLUGS.has(slug)) {
    console.log(`✅ [${slug}] (string choices — numeric audit skipped)`)
    continue
  }

  const trivialCount = { count: 0, example: null }
  const zeroAnswerCount = { count: 0, example: null }
  const negativeChoiceCount = { count: 0, example: null }
  const duplicateChoiceCount = { count: 0, example: null }

  for (let i = 0; i < RUNS; i++) {
    const p = generateProblem({ slug })

    const numsInDisplay = (p.display.match(/-?\d+(\.\d+)?/g) ?? []).map(Number)

    if (
      !TRIVIAL_AUDIT_WHITELIST.has(slug) &&
      numsInDisplay.includes(p.answer) &&
      trivialCount.count === 0
    ) {
      trivialCount.count++
      trivialCount.example = { display: p.display, answer: p.answer }
    }

    if (p.answer === 0 && zeroAnswerCount.count === 0) {
      zeroAnswerCount.count++
      zeroAnswerCount.example = { display: p.display, answer: p.answer }
    }

    const allowNegative = new Set([
      'negative_numbers',
      'integers_add_sub',
      'integers_multiply',
      'linear_equation_3',
      'quadratic_vieta',
      'quadratic_simple',
    ])
    if (!allowNegative.has(slug)) {
      const hasNeg = p.choices.some((c) => typeof c === 'number' && c < 0)
      if (hasNeg && negativeChoiceCount.count === 0) {
        negativeChoiceCount.count++
        negativeChoiceCount.example = { display: p.display, choices: p.choices }
      }
    }

    if (new Set(p.choices).size !== p.choices.length && duplicateChoiceCount.count === 0) {
      duplicateChoiceCount.count++
      duplicateChoiceCount.example = { display: p.display, choices: p.choices }
    }
  }

  const topicIssues = []
  if (trivialCount.count > 0) {
    topicIssues.push(
      `  ❌ ТРИВИАЛЬНАЯ: "${trivialCount.example.display}" → ${trivialCount.example.answer}`,
    )
  }
  if (zeroAnswerCount.count > 0) {
    topicIssues.push(`  ❌ ОТВЕТ=0: "${zeroAnswerCount.example.display}"`)
  }
  if (negativeChoiceCount.count > 0) {
    topicIssues.push(
      `  ⚠️  НЕГАТИВНЫЙ CHOICE: choices=${JSON.stringify(negativeChoiceCount.example.choices)}`,
    )
  }
  if (duplicateChoiceCount.count > 0) {
    topicIssues.push(
      `  ❌ ДУБЛИРУЮЩИЙСЯ CHOICE: choices=${JSON.stringify(duplicateChoiceCount.example.choices)}`,
    )
  }

  if (topicIssues.length > 0) {
    issues.push(`[${slug}]:\n${topicIssues.join('\n')}`)
  } else {
    console.log(`✅ [${slug}]`)
  }
}

if (issues.length > 0) {
  console.log('\n=== НАЙДЕНЫ ПРОБЛЕМЫ ===')
  for (const i of issues) console.log('\n' + i)
  process.exit(1)
} else {
  console.log('\n✅ Все темы прошли аудит')
}
