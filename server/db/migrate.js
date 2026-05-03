import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import 'dotenv/config'
import pg from 'pg'
import { getDatabaseUrl } from './databaseUrl.js'
import { poolOptionsForUrl } from './poolConfig.js'
import { invalidateTopicCache } from '../services/topicCache.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Applies server/db/schema.sql once when the public.users table is missing.
 * Then applies server/db/seed.sql (idempotent) so topics exist on every deploy.
 */
export async function migrate(pool) {
  const { rows } = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users'
    ) AS exists
  `)
  if (!rows[0].exists) {
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
    await pool.query(sql)
    console.log('migrate: schema applied')
  } else {
    console.log('migrate: schema already present')
  }

  const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8')
  await pool.query(seed)
  console.log('migrate: seed applied')

  await pool.query(`
    ALTER TABLE topics
    ADD COLUMN IF NOT EXISTS title_en TEXT
  `)
  console.log('migrate: topics.title_en ensured')

  await pool.query(`
    UPDATE topics AS t SET title_en = v.en
    FROM (VALUES
      ('addition_10', 'Addition up to 10'),
      ('addition_20', 'Addition up to 20'),
      ('subtraction_10', 'Subtraction up to 10'),
      ('addition_100', 'Addition up to 100'),
      ('subtraction_20', 'Subtraction up to 20'),
      ('multiplication_2', 'Multiply by 2'),
      ('multiplication_3', 'Multiply by 3'),
      ('multiplication_5', 'Multiply by 5'),
      ('multiplication_10', 'Multiply by 10'),
      ('multiplication_full', 'Multiplication table'),
      ('division_simple', 'Simple division'),
      ('multiplication_big', 'Large number multiplication'),
      ('division_remainder', 'Division with remainder'),
      ('fractions_simple', 'Simple fractions'),
      ('fractions_compare', 'Comparing fractions'),
      ('fractions_add_sub', 'Adding fractions'),
      ('fractions_add_sub_diff', 'Fractions with different denominators'),
      ('fractions_multiply', 'Multiplying fractions'),
      ('fractions_divide', 'Dividing fractions'),
      ('decimals_basic', 'Decimal numbers'),
      ('decimals_add_sub', 'Adding decimals'),
      ('decimals_multiply', 'Multiplying decimals'),
      ('percent_basic', 'Percentages'),
      ('percent_reverse', 'Reverse percentage problems'),
      ('negative_numbers', 'Negative numbers'),
      ('integers_add_sub', 'Integer addition & subtraction'),
      ('integers_multiply', 'Integer multiplication'),
      ('powers_basic', 'Powers'),
      ('square_root_basic', 'Square roots'),
      ('linear_equation_1', 'Linear equations: x + a = b'),
      ('linear_equation_2', 'Linear equations: ax + b = c'),
      ('linear_equation_3', 'Linear equations: ax + b = cx + d'),
      ('ratio_proportion', 'Ratios & proportions'),
      ('quadratic_simple', 'Quadratic equations'),
      ('quadratic_vieta', 'Vieta''s formulas'),
      ('systems_linear_2', 'Systems of equations'),
      ('inequalities_linear', 'Linear inequalities'),
      ('geometry_area_basic', 'Areas of shapes'),
      ('progressions_arithmetic', 'Arithmetic progressions'),
      ('progressions_geometric', 'Geometric progressions'),
      ('trigonometry_basic', 'Trigonometry: basics'),
      ('logarithms_basic', 'Logarithms: basics'),
      ('logarithms_equations', 'Logarithmic equations'),
      ('exponential_equations', 'Exponential equations'),
      ('trigonometry_identities', 'Trigonometric identities'),
      ('trigonometry_equations', 'Trigonometric equations'),
      ('derivatives_basic', 'Derivatives: basics'),
      ('combinatorics_basic', 'Combinatorics'),
      ('probability_basic', 'Probability')
    ) AS v(slug, en)
    WHERE t.slug = v.slug
  `)
  console.log('migrate: topics.title_en values updated')

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS shortcode TEXT UNIQUE
  `)
  console.log('migrate: users.shortcode ensured')

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS pinned_topic_slug TEXT DEFAULT NULL
  `)
  console.log('migrate: users.pinned_topic_slug ensured')

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS grade INTEGER DEFAULT NULL
  `)
  console.log('migrate: users.grade ensured')

  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'answers'
          AND column_name = 'answer_given'
          AND udt_name = 'int4'
      ) THEN
        ALTER TABLE answers
        ALTER COLUMN answer_given TYPE TEXT USING answer_given::text;
      END IF;
    END $$
  `)
  console.log('migrate: answers.answer_given TEXT ensured')

  /** Старые пользователи созданы до появления новых тем в seed — у них нет строк uts. */
  const backfill = await pool.query(`
    INSERT INTO user_topic_state (user_id, topic_id, state)
    SELECT u.id, t.id, 'locked'::topic_progress_state
    FROM users u
    CROSS JOIN topics t
    WHERE NOT EXISTS (
      SELECT 1 FROM user_topic_state uts
      WHERE uts.user_id = u.id AND uts.topic_id = t.id
    )
    RETURNING user_id
  `)
  console.log(`migrate: user_topic_state backfill inserted ${backfill.rowCount} row(s)`)

  invalidateTopicCache()
  console.log('migrate: topic cache invalidated')
}

async function runCli() {
  const url = getDatabaseUrl()
  if (!url) {
    console.error('migrate: DATABASE_URL (or POSTGRES_URL) is not set')
    process.exit(1)
  }
  const pool = new pg.Pool(poolOptionsForUrl(url))
  try {
    await migrate(pool)
  } finally {
    await pool.end()
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
  runCli().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
