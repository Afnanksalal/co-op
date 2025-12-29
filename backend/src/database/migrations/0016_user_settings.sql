-- User settings table for status management and admin notes
-- Usage tracking is handled via Redis (pilot limits)
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  suspended_at TIMESTAMP,
  suspended_reason VARCHAR(500),
  
  -- Admin notes
  admin_notes VARCHAR(1000),
  
  -- Activity tracking
  last_active_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS user_settings_user_id_idx ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS user_settings_status_idx ON user_settings(status);

-- Create settings for existing users
INSERT INTO user_settings (user_id, status)
SELECT id, 'active'
FROM users
WHERE deleted_at IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Add constraint for valid status values
ALTER TABLE user_settings ADD CONSTRAINT user_settings_status_check 
  CHECK (status IN ('active', 'suspended'));
