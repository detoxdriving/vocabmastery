-- VocabMastery v3 · 数据统一迁移
-- 目标:把 word_progress / wrong_book / attempts 从 localStorage 上云
-- 在 Supabase SQL Editor 里执行一次即可(已存在表会自动跳过)

CREATE TABLE IF NOT EXISTS word_progress (
  user_id      text        NOT NULL DEFAULT 'primary',
  stage        text        NOT NULL,
  word_id      integer     NOT NULL,
  ef           real        NOT NULL DEFAULT 2.5,
  interval_days integer    NOT NULL DEFAULT 0,
  repetitions  integer     NOT NULL DEFAULT 0,
  due_date     date,
  last_reviewed timestamptz,
  lapses       integer     NOT NULL DEFAULT 0,
  stats        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, stage, word_id)
);

CREATE INDEX IF NOT EXISTS idx_word_progress_due
  ON word_progress (user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_word_progress_stage
  ON word_progress (user_id, stage, updated_at DESC);

CREATE TABLE IF NOT EXISTS wrong_book (
  user_id     text        NOT NULL DEFAULT 'primary',
  stage       text        NOT NULL,
  word_id     integer     NOT NULL,
  wrong_count integer     NOT NULL DEFAULT 1,
  latest_at   timestamptz NOT NULL DEFAULT now(),
  resolved    boolean     NOT NULL DEFAULT false,
  source      text        NOT NULL DEFAULT 'manual',
  PRIMARY KEY (user_id, stage, word_id)
);

CREATE INDEX IF NOT EXISTS idx_wrong_book_unresolved
  ON wrong_book (user_id, resolved, latest_at DESC);
CREATE INDEX IF NOT EXISTS idx_wrong_book_stage
  ON wrong_book (user_id, stage, latest_at DESC);

CREATE TABLE IF NOT EXISTS attempts (
  id         bigserial   PRIMARY KEY,
  user_id    text        NOT NULL DEFAULT 'primary',
  stage      text        NOT NULL,
  word_id    integer     NOT NULL,
  mode       text        NOT NULL,
  correct    boolean     NOT NULL,
  time_ms    integer     NOT NULL DEFAULT 0,
  list_id    uuid        REFERENCES study_lists(id) ON DELETE SET NULL,
  session_id uuid        REFERENCES sessions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attempts_user_created
  ON attempts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_word
  ON attempts (user_id, word_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_stage
  ON attempts (user_id, stage, created_at DESC);

-- 触发器:更新 word_progress.updated_at
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_word_progress_touch ON word_progress;
CREATE TRIGGER trg_word_progress_touch
  BEFORE UPDATE ON word_progress
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
