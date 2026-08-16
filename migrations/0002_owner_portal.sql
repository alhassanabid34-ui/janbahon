PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS owners (
  owner_id TEXT PRIMARY KEY,
  mobile TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  address TEXT NOT NULL,
  aadhaar_doc_key TEXT NOT NULL,
  pan_doc_key TEXT NOT NULL,
  bank_account_enc TEXT NOT NULL,
  bank_ifsc TEXT NOT NULL,
  bank_holder TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);

ALTER TABLE buses ADD COLUMN owner_id TEXT;
ALTER TABLE buses ADD COLUMN photo_keys TEXT NOT NULL DEFAULT '[]';
ALTER TABLE buses ADD COLUMN video_key TEXT;
ALTER TABLE buses ADD COLUMN created_at TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS seat_blocks (
  block_id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  bus_id TEXT NOT NULL,
  seat_number INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  reason TEXT NOT NULL DEFAULT 'Blocked by bus owner',
  created_at TEXT NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES owners(owner_id) ON DELETE CASCADE,
  FOREIGN KEY (bus_id) REFERENCES buses(bus_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_buses_owner ON buses(owner_id);
CREATE INDEX IF NOT EXISTS idx_seat_blocks_bus_date ON seat_blocks(bus_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_owners_mobile ON owners(mobile);
