-- Migration to merge existing data from trusted_users and user_applications tables into users table
-- This migration should be run AFTER running the Firestore migration script
-- which now directly inserts into users table

-- Merge trusted_users into users table
-- Update existing users with role=1 (trusted) and merge profile data
UPDATE users u
SET 
  role = 1,
  trusted_added_at = COALESCE(u.trusted_added_at, tu.added_at, now()),
  profile = COALESCE(
    u.profile::jsonb || tu.data::jsonb || '{}'::jsonb,
    tu.data::jsonb || '{}'::jsonb
  ),
  updated_at = now()
FROM trusted_users tu
WHERE (u.email = tu.user_email OR u.id = tu.user_id)
  AND tu.user_email IS NOT NULL;

-- Create new users from trusted_users that don't exist yet
-- Note: This requires a default password, so we'll skip users without email
-- Use DISTINCT ON to handle duplicate emails
INSERT INTO users (id, full_name, email, password_hash, profile, role, status, trusted_added_at, created_at, updated_at)
SELECT DISTINCT ON (tu.user_email)
  COALESCE(tu.user_id, 'user_' || tu.id) as id,
  COALESCE(tu.data->>'fullName', tu.data->>'displayName', tu.data->>'name', 'Trusted User') as full_name,
  tu.user_email as email,
  -- Generate a placeholder hash (users will need to reset password)
  '$2b$10$placeholder.hash.that.needs.to.be.reset' as password_hash,
  tu.data::jsonb || jsonb_build_object(
    'isTrusted', true,
    'trustedUserData', tu.data,
    'email', tu.user_email
  ) as profile,
  1 as role,
  'active' as status,
  COALESCE(tu.added_at, tu.created_at, now()) as trusted_added_at,
  COALESCE(tu.created_at, now()) as created_at,
  COALESCE(tu.updated_at, now()) as updated_at
FROM trusted_users tu
WHERE tu.user_email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM users WHERE email = tu.user_email OR id = COALESCE(tu.user_id, 'user_' || tu.id)
  )
ORDER BY tu.user_email, tu.created_at DESC
ON CONFLICT (email) DO UPDATE SET
  role = 1,
  trusted_added_at = COALESCE(users.trusted_added_at, EXCLUDED.trusted_added_at),
  profile = users.profile::jsonb || EXCLUDED.profile::jsonb,
  updated_at = now();

-- Merge user_applications into users table
-- Update existing users with application data
UPDATE users u
SET 
  application_type = COALESCE(u.application_type, ua.application_type),
  application_submitted_at = COALESCE(u.application_submitted_at, ua.submitted_at),
  application_reviewed_at = COALESCE(u.application_reviewed_at, ua.reviewed_at),
  status = COALESCE(ua.status, u.status),
  profile = COALESCE(
    u.profile::jsonb || ua.data::jsonb || '{}'::jsonb,
    ua.data::jsonb || '{}'::jsonb
  ),
  updated_at = now()
FROM user_applications ua
WHERE (u.email = ua.user_email OR u.id = ua.user_id)
  AND ua.user_email IS NOT NULL;

-- Create new users from user_applications that don't exist yet
-- Use DISTINCT ON to handle duplicate emails
INSERT INTO users (id, full_name, email, password_hash, profile, role, status, application_type, application_submitted_at, application_reviewed_at, created_at, updated_at)
SELECT DISTINCT ON (ua.user_email)
  COALESCE(ua.user_id, 'user_' || ua.id) as id,
  COALESCE(ua.data->>'fullName', ua.data->>'displayName', ua.data->>'name', 'User') as full_name,
  ua.user_email as email,
  -- Generate a placeholder hash (users will need to reset password)
  '$2b$10$placeholder.hash.that.needs.to.be.reset' as password_hash,
  ua.data::jsonb || jsonb_build_object(
    'applicationType', ua.application_type,
    'applicationStatus', ua.status,
    'applicationData', ua.data,
    'email', ua.user_email
  ) as profile,
  2 as role, -- Default to common user
  COALESCE(ua.status, 'pending') as status,
  ua.application_type,
  ua.submitted_at,
  ua.reviewed_at,
  COALESCE(ua.created_at, now()) as created_at,
  COALESCE(ua.updated_at, now()) as updated_at
FROM user_applications ua
WHERE ua.user_email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM users WHERE email = ua.user_email OR id = COALESCE(ua.user_id, 'user_' || ua.id)
  )
ORDER BY ua.user_email, ua.submitted_at DESC NULLS LAST, ua.created_at DESC
ON CONFLICT (email) DO UPDATE SET
  application_type = COALESCE(users.application_type, EXCLUDED.application_type),
  application_submitted_at = COALESCE(users.application_submitted_at, EXCLUDED.application_submitted_at),
  application_reviewed_at = COALESCE(users.application_reviewed_at, EXCLUDED.application_reviewed_at),
  status = COALESCE(EXCLUDED.status, users.status),
  profile = users.profile::jsonb || EXCLUDED.profile::jsonb,
  updated_at = now();

-- Note: The trusted_users and user_applications tables are kept for reference
-- but all new data should be stored in the users table

