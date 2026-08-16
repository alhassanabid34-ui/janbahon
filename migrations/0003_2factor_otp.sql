CREATE TABLE IF NOT EXISTS otp_codes (
  mobile TEXT NOT NULL,
  purpose TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_sent_at INTEGER NOT NULL,
  PRIMARY KEY (mobile, purpose)
);

CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at);
