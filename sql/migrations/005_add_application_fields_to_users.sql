-- Add fields to users table for application and trusted user data
-- These fields will store data merged from trusted_users and user_applications collections

-- Add application-related fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS application_type TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS application_submitted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS application_reviewed_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trusted_added_at TIMESTAMPTZ;

-- Create indexes for application queries
CREATE INDEX IF NOT EXISTS idx_users_application_type ON users(application_type);
CREATE INDEX IF NOT EXISTS idx_users_application_submitted_at ON users(application_submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_application_reviewed_at ON users(application_reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_trusted_added_at ON users(trusted_added_at DESC);

