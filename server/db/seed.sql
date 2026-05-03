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
