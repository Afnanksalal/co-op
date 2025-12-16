-- Add title column to sessions for naming/organization
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS title VARCHAR(255);

-- Add index for searching sessions by title
CREATE INDEX IF NOT EXISTS sessions_title_idx ON sessions USING gin(to_tsvector('english', COALESCE(title, '')));
