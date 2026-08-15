PRAGMA foreign_keys = ON;

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
  total_seats INTEGER NOT NULL
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_bus_date_seat
  ON passengers(bus_id, journey_date, seat_number)
  WHERE booking_status = 'confirmed';

CREATE INDEX IF NOT EXISTS idx_passengers_bus_date
  ON passengers(bus_id, journey_date);

CREATE INDEX IF NOT EXISTS idx_bookings_date
  ON bookings(journey_date);

INSERT OR IGNORE INTO buses
(bus_id, operator, name, bus_type, price, from_city, to_city, departure, arrival, duration, total_seats)
VALUES
('astc-mankachar-express', 'ASTC', 'Mankachar Express', 'AC Seater', 480, 'Mankachar', 'Guwahati', '05:30 AM', '01:00 PM', '7h 30m', 32),
('janbahon-south-assam', 'JANBAHON', 'South Assam Travels', 'Non-AC Seater', 390, 'Mankachar', 'Guwahati', '07:30 AM', '03:30 PM', '8h', 40),
('assam-roadways-brahmaputra', 'Assam Roadways', 'Brahmaputra Superfast', 'AC Seater', 520, 'Mankachar', 'Guwahati', '06:15 AM', '01:45 PM', '7h 30m', 44),
('janbahon-barak-valley', 'JANBAHON', 'Barak Valley Express', 'Non-AC Seater', 360, 'Mankachar', 'Guwahati', '08:00 AM', '04:30 PM', '8h 30m', 36),
('northeast-night-rider', 'Northeast Travels', 'Assam Night Rider', 'AC Seater', 550, 'Mankachar', 'Guwahati', '09:00 PM', '05:30 AM', '8h 30m', 48);
