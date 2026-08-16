CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  mobile TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  password_hash TEXT,
  password_salt TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);
