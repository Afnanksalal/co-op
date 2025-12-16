-- Migration: Secure User Documents
-- Created: 2025-12-16
-- Purpose: Store user documents securely with encrypted chunks and auto-expiry

-- User Documents table - stores metadata only, NOT original files
CREATE TABLE IF NOT EXISTS user_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  
  -- Document metadata (safe to store)
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  
  -- Processing status
  status TEXT NOT NULL DEFAULT 'processing', -- processing | ready | failed | expired
  chunk_count INTEGER NOT NULL DEFAULT 0,
  
  -- Auto-expiry settings
  expires_at TIMESTAMPTZ,
  is_expired BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ
);

-- Encrypted Document Chunks table
CREATE TABLE IF NOT EXISTS user_document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES user_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Chunk metadata
  chunk_index INTEGER NOT NULL,
  
  -- ENCRYPTED content - AES-256-GCM encrypted text
  -- Format: iv:authTag:ciphertext (hex encoded)
  encrypted_content TEXT NOT NULL,
  
  -- Embedding vector (NOT encrypted - embeddings don't reveal original content)
  -- Stored as JSON array of floats
  embedding TEXT,
  
  -- Metadata for search (non-sensitive)
  token_count INTEGER,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for user_documents
CREATE INDEX IF NOT EXISTS user_documents_user_id_idx ON user_documents(user_id);
CREATE INDEX IF NOT EXISTS user_documents_session_id_idx ON user_documents(session_id);
CREATE INDEX IF NOT EXISTS user_documents_status_idx ON user_documents(status);
CREATE INDEX IF NOT EXISTS user_documents_expires_at_idx ON user_documents(expires_at);

-- Indexes for user_document_chunks
CREATE INDEX IF NOT EXISTS user_document_chunks_document_id_idx ON user_document_chunks(document_id);
CREATE INDEX IF NOT EXISTS user_document_chunks_user_id_idx ON user_document_chunks(user_id);
CREATE INDEX IF NOT EXISTS user_document_chunks_chunk_index_idx ON user_document_chunks(chunk_index);

-- Function to auto-cleanup expired documents (can be called via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_documents()
RETURNS TABLE(documents_expired INTEGER, chunks_deleted INTEGER) AS $$
DECLARE
  expired_count INTEGER;
  chunk_count INTEGER;
BEGIN
  -- Delete chunks from expired documents
  WITH expired_docs AS (
    SELECT id FROM user_documents 
    WHERE expires_at < NOW() AND is_expired = FALSE
  ),
  deleted_chunks AS (
    DELETE FROM user_document_chunks 
    WHERE document_id IN (SELECT id FROM expired_docs)
    RETURNING id
  )
  SELECT COUNT(*) INTO chunk_count FROM deleted_chunks;
  
  -- Mark documents as expired
  UPDATE user_documents 
  SET is_expired = TRUE, status = 'expired', updated_at = NOW()
  WHERE expires_at < NOW() AND is_expired = FALSE;
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RETURN QUERY SELECT expired_count, chunk_count;
END;
$$ LANGUAGE plpgsql;

-- Comment explaining the security model
COMMENT ON TABLE user_documents IS 'User uploaded documents - stores metadata only. Original files are processed, chunked, encrypted, then deleted.';
COMMENT ON TABLE user_document_chunks IS 'Encrypted document chunks. Content is AES-256-GCM encrypted. Embeddings are NOT encrypted (they dont reveal original content).';
COMMENT ON COLUMN user_document_chunks.encrypted_content IS 'AES-256-GCM encrypted text. Format: iv:authTag:ciphertext (hex encoded)';
COMMENT ON COLUMN user_document_chunks.embedding IS 'Vector embedding for semantic search. Safe to store unencrypted as embeddings are one-way transformations.';
