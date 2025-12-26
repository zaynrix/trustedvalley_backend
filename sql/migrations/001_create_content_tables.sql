-- Create table for top-level admin content documents
CREATE TABLE IF NOT EXISTS admin_content (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create table for statistics items (under admin_content -> statistics -> items)
CREATE TABLE IF NOT EXISTS statistics_items (
  id TEXT PRIMARY KEY,
  label TEXT,
  description TEXT,
  value TEXT,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Optional: index for ordering
CREATE INDEX IF NOT EXISTS idx_statistics_items_order ON statistics_items(order_index);
