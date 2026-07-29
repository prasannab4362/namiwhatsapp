-- ============================================================
-- 037_api_keys_add_created_by.sql
--
-- The original 026_api_keys.sql defined `created_by` inside
-- CREATE TABLE IF NOT EXISTS — so instances where the table
-- already existed (e.g. a development or staging DB that ran an
-- earlier draft of migration 026 without that column) never got
-- the column added.
--
-- This migration patches those instances idempotently with
-- ADD COLUMN IF NOT EXISTS.  Running it on a fresh database
-- (where 026 created the column) is a no-op.
-- ============================================================

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS created_by uuid
    REFERENCES auth.users(id) ON DELETE SET NULL;

-- Refresh the PostgREST schema cache so the new column is
-- immediately visible to the API without a server restart.
NOTIFY pgrst, 'reload schema';
