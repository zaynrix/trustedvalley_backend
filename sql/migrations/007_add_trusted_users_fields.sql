-- Add fields from trusted_users collection to users table
-- These fields are specific to trusted users and action tracking

-- Application and action tracking fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS application_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS action_by TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS action_type TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS action_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_action_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_modified_by TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS moved_to_trusted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_document_submission_date TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_pending_document_requests BOOLEAN DEFAULT false;

-- Create indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_users_application_id ON users(application_id);
CREATE INDEX IF NOT EXISTS idx_users_action_type ON users(action_type);
CREATE INDEX IF NOT EXISTS idx_users_action_by ON users(action_by);
CREATE INDEX IF NOT EXISTS idx_users_reviewed_by ON users(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_users_last_action_at ON users(last_action_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_moved_to_trusted_at ON users(moved_to_trusted_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_has_pending_document_requests ON users(has_pending_document_requests);

-- Note: Complex nested objects (documentConfirmations, permissions, privacySettings, 
-- publicProfile, statistics, verification) remain in the profile JSONB column
-- for flexibility and to avoid schema bloat

