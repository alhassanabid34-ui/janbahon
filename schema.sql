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

CREATE TABLE IF NOT EXISTS buses (
  bus_id TEXT PRIMARY KEY,
  operator TEXT NOT NULL,
  name TEXT NOT NULL,
  bus_type TEXT NOT NULL,
  price INTEGER NOT NULL,
  from_city TEXT NOT NULL,
  to_city TEXT NOT NULL,
  departure TEXT NOT NULL,
  arrival TEXT NOT NULL,
  duration TEXT NOT NULL,
  total_seats INTEGER NOT NULL,
  owner_id TEXT,
  photo_keys TEXT NOT NULL DEFAULT '[]',
  video_key TEXT,
  created_at TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (owner_id) REFERENCES owners(owner_id)
);

CREATE TABLE IF NOT EXISTS bookings (
  booking_id TEXT PRIMARY KEY,
  bus_id TEXT NOT NULL,
  journey_date TEXT NOT NULL,
  total_amount INTEGER NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TEXT NOT NULL,
  FOREIGN KEY (bus_id) REFERENCES buses(bus_id)
);

CREATE TABLE IF NOT EXISTS passengers (
  passenger_id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id TEXT NOT NULL,
  bus_id TEXT NOT NULL,
  journey_date TEXT NOT NULL,
  seat_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  booking_status TEXT NOT NULL DEFAULT 'confirmed',
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
  FOREIGN KEY (bus_id) REFERENCES buses(bus_id)
);

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

CREATE TABLE IF NOT EXISTS otp_codes (
  mobile TEXT NOT NULL,
  purpose TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_sent_at INTEGER NOT NULL,
  PRIMARY KEY (mobile, purpose)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_bus_date_seat
  ON passengers(bus_id, journey_date, seat_number)
  WHERE booking_status = 'confirmed';
CREATE INDEX IF NOT EXISTS idx_passengers_bus_date ON passengers(bus_id, journey_date);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(journey_date);
CREATE INDEX IF NOT EXISTS idx_buses_owner ON buses(owner_id);
CREATE INDEX IF NOT EXISTS idx_seat_blocks_bus_date ON seat_blocks(bus_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_owners_mobile ON owners(mobile);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at);

INSERT OR IGNORE INTO buses
(bus_id, operator, name, bus_type, price, from_city, to_city, departure, arrival, duration, total_seats)
VALUES
('astc-mankachar-express', 'ASTC', 'Mankachar Express', 'AC Seater', 480, 'Mankachar', 'Guwahati', '05:30 AM', '01:00 PM', '7h 30m', 32),
('janbahon-south-assam', 'JANBAHON', 'South Assam Travels', 'Non-AC Seater', 390, 'Mankachar', 'Guwahati', '07:30 AM', '03:30 PM', '8h', 40),
('assam-roadways-brahmaputra', 'Assam Roadways', 'Brahmaputra Superfast', 'AC Seater', 520, 'Mankachar', 'Guwahati', '06:15 AM', '01:45 PM', '7h 30m', 44),
('janbahon-barak-valley', 'JANBAHON', 'Barak Valley Express', 'Non-AC Seater', 360, 'Mankachar', 'Guwahati', '08:00 AM', '04:30 PM', '8h 30m', 36),
('northeast-night-rider', 'Northeast Travels', 'Assam Night Rider', 'AC Seater', 550, 'Mankachar', 'Guwahati', '09:00 PM', '05:30 AM', '8h 30m', 48);
