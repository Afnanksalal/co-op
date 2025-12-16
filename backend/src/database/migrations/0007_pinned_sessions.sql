-- Add pinned column to sessions for favorite/pin functionality
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE NOT NULL;

-- Index for efficient pinned session queries
CREATE INDEX IF NOT EXISTS sessions_is_pinned_idx ON sessions(is_pinned) WHERE is_pinned = TRUE;
