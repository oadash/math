-- Math Adventure — core schema (PostgreSQL)

CREATE TYPE topic_progress_state AS ENUM (
  'locked',
  'introducing',
  'practicing',
  'mastered'
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title_ru TEXT NOT NULL,
  prerequisite_topic_id UUID REFERENCES topics (id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE user_topic_state (
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics (id) ON DELETE CASCADE,
  state topic_progress_state NOT NULL DEFAULT 'locked',
  correct_streak INTEGER NOT NULL DEFAULT 0,
  total_correct INTEGER NOT NULL DEFAULT 0,
  total_attempts INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, topic_id)
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics (id) ON DELETE CASCADE,
  problem_json JSONB NOT NULL,
  answer_given INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_topic_state_user ON user_topic_state (user_id);
CREATE INDEX idx_answers_user_created ON answers (user_id, created_at DESC);
CREATE INDEX idx_sessions_user ON sessions (user_id);
