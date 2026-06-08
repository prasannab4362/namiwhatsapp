-- ============================================================
-- 022_ai_bot_tenancy.sql — Re-align AI schema with Account Tenancy
-- ============================================================

-- 1. Modify `ai_settings` to use `account_id` instead of `user_id`
-- Since AI settings should be global per account.
DROP TABLE IF EXISTS ai_settings CASCADE;
CREATE TABLE ai_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  is_bot_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  system_prompt TEXT NOT NULL DEFAULT 'You are a helpful AI assistant for a business on WhatsApp.',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id)
);

ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Account members can manage ai settings" ON ai_settings
  FOR ALL USING (is_account_member(account_id));

CREATE TRIGGER set_updated_at BEFORE UPDATE ON ai_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Modify `knowledge_documents` to use `account_id`
DROP TABLE IF EXISTS knowledge_documents CASCADE;
CREATE TABLE knowledge_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Account members can manage knowledge documents" ON knowledge_documents
  FOR ALL USING (is_account_member(account_id));

-- 3. Modify `knowledge_chunks` to use `account_id`
DROP TABLE IF EXISTS knowledge_chunks CASCADE;
CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(768) NOT NULL, -- Gemini text-embedding-004 uses 768 dimensions
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding
  ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_account
  ON knowledge_chunks (account_id);

ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Account members can manage knowledge chunks" ON knowledge_chunks
  FOR ALL USING (is_account_member(account_id));

-- 4. Update RPC Function for similarity search
DROP FUNCTION IF EXISTS match_knowledge_chunks;
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding vector(768),
  filter_account_id UUID,
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.document_id,
    kc.content,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks kc
  WHERE kc.account_id = filter_account_id
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
