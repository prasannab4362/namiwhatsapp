-- ============================================================
-- 038_ai_configs_gemini_support.sql
--
-- Fixes "Failed to load AI configuration" and allows Google Gemini:
--   1. Ensures `ai_configs` table exists with all required columns
--      (`embeddings_api_key`, `handoff_agent_id`).
--   2. Updates `provider` CHECK constraint on `ai_configs` and `ai_usage_log`
--      to allow 'gemini' in addition to 'openai' and 'anthropic'.
--   3. Reloads PostgREST schema cache.
-- ============================================================

-- 1. Ensure ai_configs table exists
CREATE TABLE IF NOT EXISTS ai_configs (
  id                                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                        uuid NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
  created_by                        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  provider                          text NOT NULL DEFAULT 'openai',
  model                             text NOT NULL DEFAULT 'gpt-4o-mini',
  api_key                           text,
  system_prompt                     text,
  is_active                         boolean NOT NULL DEFAULT false,
  auto_reply_enabled                boolean NOT NULL DEFAULT false,
  auto_reply_max_per_conversation   integer NOT NULL DEFAULT 3,
  created_at                        timestamptz NOT NULL DEFAULT now(),
  updated_at                        timestamptz NOT NULL DEFAULT now()
);

-- Ensure columns added in migrations 030 and 033 exist
ALTER TABLE ai_configs
  ADD COLUMN IF NOT EXISTS embeddings_api_key text,
  ADD COLUMN IF NOT EXISTS handoff_agent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Update provider check constraint on ai_configs to include 'gemini'
ALTER TABLE ai_configs DROP CONSTRAINT IF EXISTS ai_configs_provider_check;
ALTER TABLE ai_configs ADD CONSTRAINT ai_configs_provider_check CHECK (provider IN ('openai', 'anthropic', 'gemini'));

-- 3. Ensure ai_usage_log table exists and update check constraint
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  conversation_id   uuid REFERENCES conversations(id) ON DELETE SET NULL,
  mode              text NOT NULL CHECK (mode IN ('auto_reply', 'draft')),
  provider          text NOT NULL DEFAULT 'openai',
  model             text NOT NULL,
  prompt_tokens     integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  total_tokens      integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_usage_log DROP CONSTRAINT IF EXISTS ai_usage_log_provider_check;
ALTER TABLE ai_usage_log ADD CONSTRAINT ai_usage_log_provider_check CHECK (provider IN ('openai', 'anthropic', 'gemini'));

-- Enable RLS on ai_configs if not already enabled
ALTER TABLE ai_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_configs_select ON ai_configs;
CREATE POLICY ai_configs_select ON ai_configs FOR SELECT USING (is_account_member(account_id));

DROP POLICY IF EXISTS ai_configs_insert ON ai_configs;
CREATE POLICY ai_configs_insert ON ai_configs FOR INSERT WITH CHECK (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS ai_configs_update ON ai_configs;
CREATE POLICY ai_configs_update ON ai_configs FOR UPDATE USING (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS ai_configs_delete ON ai_configs;
CREATE POLICY ai_configs_delete ON ai_configs FOR DELETE USING (is_account_member(account_id, 'admin'));

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
