-- TASK-003: initial topics (idempotent). Prerequisite graph uses a single parent per topic.

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
VALUES ('addition_10', 'Сложение до 10', NULL, 1)
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'addition_20', 'Сложение до 20', id, 2
FROM topics WHERE slug = 'addition_10'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'subtraction_10', 'Вычитание до 10', id, 3
FROM topics WHERE slug = 'addition_10'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'addition_100', 'Сложение до 100', id, 4
FROM topics WHERE slug = 'addition_20'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

-- В задании: subtraction_10 + addition_20; в схеме один предок — держим addition_20 как числовой порог «до 20».
INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'subtraction_20', 'Вычитание до 20', id, 5
FROM topics WHERE slug = 'addition_20'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'multiplication_2', 'Умножение на 2', id, 6
FROM topics WHERE slug = 'addition_20'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'multiplication_5', 'Умножение на 5', id, 7
FROM topics WHERE slug = 'multiplication_2'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'multiplication_3', 'Умножение на 3', id, 8
FROM topics WHERE slug = 'multiplication_2'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'multiplication_10', 'Умножение на 10', id, 9
FROM topics WHERE slug = 'multiplication_5'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

-- «Всё выше» по ветке умножения: последний шаг перед полной таблицей — multiplication_10.
INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'multiplication_full', 'Таблица умножения', id, 10
FROM topics WHERE slug = 'multiplication_10'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'division_simple', 'Простое деление', id, 11
FROM topics WHERE slug = 'multiplication_full'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

-- TASK-021 (3–4 кл.)
INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'multiplication_big', 'Умножение двузначных', id, 12
FROM topics WHERE slug = 'multiplication_full'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'division_remainder', 'Деление с остатком', id, 13
FROM topics WHERE slug = 'division_simple'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'fractions_simple', 'Простые дроби', id, 14
FROM topics WHERE slug = 'division_simple'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'fractions_compare', 'Сравнение дробей', id, 15
FROM topics WHERE slug = 'fractions_simple'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

-- TASK-022 (5–6 кл.)
INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'fractions_add_sub', 'Сложение дробей', id, 16
FROM topics WHERE slug = 'fractions_compare'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'fractions_add_sub_diff', 'Дроби с разными знаменателями', id, 17
FROM topics WHERE slug = 'fractions_add_sub'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'fractions_multiply', 'Умножение дробей', id, 18
FROM topics WHERE slug = 'fractions_add_sub_diff'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'fractions_divide', 'Деление дробей', id, 19
FROM topics WHERE slug = 'fractions_multiply'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'decimals_basic', 'Десятичные дроби', id, 20
FROM topics WHERE slug = 'fractions_simple'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'decimals_add_sub', 'Сложение десятичных', id, 21
FROM topics WHERE slug = 'decimals_basic'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'decimals_multiply', 'Умножение десятичных', id, 22
FROM topics WHERE slug = 'decimals_add_sub'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'percent_basic', 'Проценты', id, 23
FROM topics WHERE slug = 'decimals_multiply'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'percent_reverse', 'Обратные задачи с %', id, 24
FROM topics WHERE slug = 'percent_basic'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'negative_numbers', 'Отрицательные числа', id, 25
FROM topics WHERE slug = 'division_remainder'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'integers_add_sub', 'Сложение и вычитание целых', id, 26
FROM topics WHERE slug = 'negative_numbers'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

-- TASK-023 (7 кл.)
INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'integers_multiply', 'Умножение целых чисел', id, 27
FROM topics WHERE slug = 'integers_add_sub'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'powers_basic', 'Степени чисел', id, 28
FROM topics WHERE slug = 'integers_multiply'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'square_root_basic', 'Квадратные корни', id, 29
FROM topics WHERE slug = 'powers_basic'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'linear_equation_1', 'Уравнения: x + a = b', id, 30
FROM topics WHERE slug = 'integers_add_sub'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'linear_equation_2', 'Уравнения: ax + b = c', id, 31
FROM topics WHERE slug = 'linear_equation_1'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'linear_equation_3', 'Уравнения: ax + b = cx + d', id, 32
FROM topics WHERE slug = 'linear_equation_2'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'ratio_proportion', 'Пропорции', id, 33
FROM topics WHERE slug = 'fractions_divide'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

-- TASK-024 (8–9 кл.)
INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'quadratic_simple', 'Квадратные уравнения', id, 34
FROM topics WHERE slug = 'linear_equation_3'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'quadratic_vieta', 'Теорема Виета', id, 35
FROM topics WHERE slug = 'quadratic_simple'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'systems_linear_2', 'Системы уравнений', id, 36
FROM topics WHERE slug = 'linear_equation_3'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'inequalities_linear', 'Линейные неравенства', id, 37
FROM topics WHERE slug = 'linear_equation_2'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'geometry_area_basic', 'Площади фигур', id, 38
FROM topics WHERE slug = 'ratio_proportion'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'progressions_arithmetic', 'Арифметическая прогрессия', id, 39
FROM topics WHERE slug = 'linear_equation_2'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'progressions_geometric', 'Геометрическая прогрессия', id, 40
FROM topics WHERE slug = 'progressions_arithmetic'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'trigonometry_basic', 'Тригонометрия: основы', id, 41
FROM topics WHERE slug = 'square_root_basic'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

-- TASK-025 (10–11 кл.)
INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'logarithms_basic', 'Логарифмы: основы', id, 42
FROM topics WHERE slug = 'powers_basic'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'logarithms_equations', 'Логарифмические уравнения', id, 43
FROM topics WHERE slug = 'logarithms_basic'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'exponential_equations', 'Показательные уравнения', id, 44
FROM topics WHERE slug = 'logarithms_basic'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'trigonometry_identities', 'Тригонометрические тождества', id, 45
FROM topics WHERE slug = 'trigonometry_basic'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'trigonometry_equations', 'Тригонометрические уравнения', id, 46
FROM topics WHERE slug = 'trigonometry_identities'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'derivatives_basic', 'Производные: основы', id, 47
FROM topics WHERE slug = 'logarithms_equations'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'combinatorics_basic', 'Комбинаторика', id, 48
FROM topics WHERE slug = 'progressions_geometric'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO topics (slug, title_ru, prerequisite_topic_id, sort_order)
SELECT 'probability_basic', 'Вероятность', id, 49
FROM topics WHERE slug = 'combinatorics_basic'
ON CONFLICT (slug) DO UPDATE SET
  title_ru = EXCLUDED.title_ru,
  prerequisite_topic_id = EXCLUDED.prerequisite_topic_id,
  sort_order = EXCLUDED.sort_order;
