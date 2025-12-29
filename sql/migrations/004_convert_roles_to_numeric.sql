-- Convert role column from TEXT to INTEGER
-- Role mapping:
-- admin: 0
-- trusted user: 1
-- common user: 2
-- betrug user: 3

-- Check if role is already INTEGER (migration already run)
DO $$
DECLARE
  role_type TEXT;
BEGIN
  SELECT data_type INTO role_type
  FROM information_schema.columns
  WHERE table_name = 'users' AND column_name = 'role';
  
  -- If role is already INTEGER, skip conversion
  IF role_type = 'integer' THEN
    RAISE NOTICE 'Role column is already INTEGER, skipping conversion';
    RETURN;
  END IF;
END $$;

-- First, add a temporary column for the numeric role
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_numeric INTEGER;

-- Map existing text roles to numeric values
-- Cast role to text first to handle any type
UPDATE users SET role_numeric = 
  CASE 
    WHEN LOWER(role::text) IN ('admin', 'superadmin', '0') THEN 0
    WHEN LOWER(role::text) IN ('trusted', 'trusted_user', 'trusteduser', '1') THEN 1
    WHEN LOWER(role::text) IN ('user', 'common', 'common_user', 'commonuser', 'guest', '2') THEN 2
    WHEN LOWER(role::text) IN ('betrug', 'betrug_user', 'betruguser', 'fraud', 'fraud_user', '3') THEN 3
    -- Try to cast as integer if it's already a number
    WHEN role::text ~ '^[0-9]+$' THEN role::text::integer
    ELSE 2  -- Default to common user (2) for unknown roles
  END
WHERE role_numeric IS NULL;

-- Set default for any NULL values
UPDATE users SET role_numeric = 2 WHERE role_numeric IS NULL;

-- Drop the old role column
ALTER TABLE users DROP COLUMN IF EXISTS role;

-- Rename the new column to role
ALTER TABLE users RENAME COLUMN role_numeric TO role;

-- Set default value for new users
ALTER TABLE users ALTER COLUMN role SET DEFAULT 2;

-- Add constraint to ensure role is between 0 and 3 (drop first if exists)
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_role_range;
ALTER TABLE users ADD CONSTRAINT check_role_range CHECK (role >= 0 AND role <= 3);

-- Create index for role queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

