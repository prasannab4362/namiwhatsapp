-- ============================================================
-- 021_ai_knowledge_base.sql — AI Bot & RAG Architecture
-- ============================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add 'ai_paused' column to conversations (default false, meaning AI is active)
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS ai_paused BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. AI Settings Table (Per Account/User)
CREATE TABLE IF NOT EXISTS ai_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_bot_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  system_prompt TEXT NOT NULL DEFAULT 'You are a helpful AI assistant for a business on WhatsApp.',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own ai settings" ON ai_settings;
CREATE POLICY "Users can manage own ai settings" ON ai_settings FOR ALL USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_updated_at ON ai_settings;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ai_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create ai_settings for existing profiles
INSERT INTO ai_settings (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 4. Knowledge Documents Table
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own knowledge documents" ON knowledge_documents;
CREATE POLICY "Users can manage own knowledge documents" ON knowledge_documents FOR ALL USING (auth.uid() = user_id);

-- 5. Knowledge Chunks Table (stores the text chunks and vector embeddings)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(768) NOT NULL, -- Gemini text-embedding-004 uses 768 dimensions
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster cosine similarity searches
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding
  ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_user
  ON knowledge_chunks (user_id);

ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own knowledge chunks" ON knowledge_chunks;
CREATE POLICY "Users can manage own knowledge chunks" ON knowledge_chunks FOR ALL USING (auth.uid() = user_id);

-- 6. RPC Function for similarity search
-- Finds the most relevant chunks based on vector cosine distance
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding vector(768),
  filter_user_id UUID,
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
  WHERE kc.user_id = filter_user_id
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
