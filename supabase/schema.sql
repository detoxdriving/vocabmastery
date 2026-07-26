-- VocabMastery v3 · Supabase schema
-- 单用户模式:所有 row 的 user_id 默认 'primary'
-- 在 Supabase SQL Editor 里执行一次即可

CREATE TABLE IF NOT EXISTS study_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL DEFAULT 'primary',
  name text NOT NULL,
  stage text NOT NULL,
  word_ids integer[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  archived boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL DEFAULT 'primary',
  list_id uuid REFERENCES study_lists(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL DEFAULT 'primary',
  list_id uuid REFERENCES study_lists(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  passed_at timestamptz,
  rounds jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL DEFAULT 'primary',
  stage_range jsonb NOT NULL,
  mode text NOT NULL,
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  score integer,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sentence_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL DEFAULT 'primary',
  word_id integer NOT NULL,
  user_sentence text NOT NULL,
  ai_response jsonb,
  evaluator text NOT NULL DEFAULT 'self',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS word_resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL DEFAULT 'primary',
  word_id integer NOT NULL,
  source text,
  source_id uuid,
  resolved_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_lists_user_created
  ON study_lists (user_id, archived, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_created
  ON sessions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_list
  ON sessions (list_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_user_created
  ON quizzes (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quizzes_list
  ON quizzes (list_id);
CREATE INDEX IF NOT EXISTS idx_tests_user_created
  ON tests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sentence_grades_user_created
  ON sentence_grades (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_word_resolutions_user_word
  ON word_resolutions (user_id, word_id, resolved_at DESC);

CREATE OR REPLACE VIEW view_wrong_book AS
WITH quiz_wrong AS (
  SELECT
    q.user_id,
    (r->>'wordId')::int AS word_id,
    'quiz' AS source,
    q.id AS source_id,
    q.created_at
  FROM quizzes q,
       jsonb_array_elements(q.rounds) AS round,
       jsonb_array_elements(round->'results') AS r
  WHERE q.passed_at IS NULL
    AND (r->>'correct')::boolean = false
),
test_wrong AS (
  SELECT
    t.user_id,
    (r->>'wordId')::int AS word_id,
    'test' AS source,
    t.id AS source_id,
    t.created_at
  FROM tests t,
       jsonb_array_elements(t.results) AS r
  WHERE (r->>'correct')::boolean = false
),
combined AS (
  SELECT * FROM quiz_wrong
  UNION ALL
  SELECT * FROM test_wrong
)
SELECT
  c.user_id,
  c.word_id,
  c.source,
  c.source_id,
  max(c.created_at) AS latest_at,
  count(*) AS wrong_count
FROM combined c
LEFT JOIN word_resolutions r
  ON r.user_id = c.user_id
  AND r.word_id = c.word_id
  AND r.resolved_at > c.created_at
WHERE r.id IS NULL
GROUP BY c.user_id, c.word_id, c.source, c.source_id;