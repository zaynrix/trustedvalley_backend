-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone_number TEXT,
  additional_phone TEXT,
  location TEXT,
  services JSONB,
  service_payment_methods JSONB,
  reference_number TEXT,
  money_transfer_services JSONB,
  profile JSONB,
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
