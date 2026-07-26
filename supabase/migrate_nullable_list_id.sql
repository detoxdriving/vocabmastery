-- Migration: allow sessions/quizzes to have no list_id
-- Run this in Supabase SQL Editor if you already ran the original schema

ALTER TABLE sessions ALTER COLUMN list_id DROP NOT NULL;
ALTER TABLE quizzes ALTER COLUMN list_id DROP NOT NULL;
