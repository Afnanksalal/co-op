-- Migration: Drop user_document_chunks table
-- Created: 2025-12-28
-- Purpose: Content is now stored encrypted in Upstash Vector, no need for PostgreSQL chunks

-- Drop the chunks table (content now in Upstash Vector)
DROP TABLE IF EXISTS user_document_chunks;

-- Drop the cleanup function that referenced chunks
DROP FUNCTION IF EXISTS cleanup_expired_documents();

-- Update comments
COMMENT ON TABLE user_documents IS 'User uploaded documents - stores metadata only. Content is stored encrypted in Upstash Vector.';
