-- Create table for activities collection
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for activities queries
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);

-- Create table for trusted_users collection
CREATE TABLE IF NOT EXISTS trusted_users (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  user_id TEXT,
  user_email TEXT,
  added_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for trusted_users
CREATE INDEX IF NOT EXISTS idx_trusted_users_user_id ON trusted_users(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_users_user_email ON trusted_users(user_email);
CREATE INDEX IF NOT EXISTS idx_trusted_users_added_at ON trusted_users(added_at DESC);

-- Create table for untrusted_users collection
CREATE TABLE IF NOT EXISTS untrusted_users (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  user_id TEXT,
  user_email TEXT,
  added_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for untrusted_users
CREATE INDEX IF NOT EXISTS idx_untrusted_users_user_id ON untrusted_users(user_id);
CREATE INDEX IF NOT EXISTS idx_untrusted_users_user_email ON untrusted_users(user_email);
CREATE INDEX IF NOT EXISTS idx_untrusted_users_added_at ON untrusted_users(added_at DESC);

-- Create table for payment_place_submissions collection
CREATE TABLE IF NOT EXISTS payment_place_submissions (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  user_id TEXT,
  place_name TEXT,
  status TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for payment_place_submissions
CREATE INDEX IF NOT EXISTS idx_payment_place_submissions_user_id ON payment_place_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_place_submissions_status ON payment_place_submissions(status);
CREATE INDEX IF NOT EXISTS idx_payment_place_submissions_submitted_at ON payment_place_submissions(submitted_at DESC);

-- Create table for user_applications collection
CREATE TABLE IF NOT EXISTS user_applications (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  user_id TEXT,
  user_email TEXT,
  application_type TEXT,
  status TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for user_applications
CREATE INDEX IF NOT EXISTS idx_user_applications_user_id ON user_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_applications_user_email ON user_applications(user_email);
CREATE INDEX IF NOT EXISTS idx_user_applications_status ON user_applications(status);
CREATE INDEX IF NOT EXISTS idx_user_applications_application_type ON user_applications(application_type);
CREATE INDEX IF NOT EXISTS idx_user_applications_submitted_at ON user_applications(submitted_at DESC);

-- Create table for admin collection
CREATE TABLE IF NOT EXISTS admin (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  email TEXT,
  role TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for admin
CREATE INDEX IF NOT EXISTS idx_admin_email ON admin(email);
CREATE INDEX IF NOT EXISTS idx_admin_role ON admin(role);
CREATE INDEX IF NOT EXISTS idx_admin_created_at ON admin(created_at DESC);

