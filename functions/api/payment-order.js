function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}
function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value || ""); }
function basicAuth(id, secret) { return `Basic ${btoa(`${id}:${secret}`)}`; }

async function ensurePaymentTables(db) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS seat_reservations (
      bus_id TEXT NOT NULL,
      journey_date TEXT NOT NULL,
      seat_number INTEGER NOT NULL,
      booking_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (bus_id, journey_date, seat_number)
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_seat_reservations_expiry ON seat_reservations(expires_at)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS payment_attempts (
      attempt_id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL UNIQUE,
      razorpay_order_id TEXT UNIQUE,
      razorpay_payment_id TEXT,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'created',
      created_at TEXT NOT NULL
    )`)
  ]);
}

async function blockedSeats(db, busId, date) {
  const table = await db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='seat_blocks'`).first();
  if (!table) return [];
  const rows = await db.prepare(`SELECT seat_number FROM seat_blocks WHERE bus_id=? AND start_date<=? AND (end_date IS NULL OR end_date>=?)`).bind(busId, date, date).all();
  return (rows.results || []).map(r => Number(r.seat_number));
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: "D1 database is not bound." }, 503);
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) return json({ error: "Razorpay is not configured yet." }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON." }, 400); }
  const { busId, journeyDate, passengers } = body || {};
  if (!busId || !validDate(journeyDate) || !Array.isArray(passengers) || !passengers.length) return json({ error: "Invalid booking details." }, 400);

  try {
    await ensurePaymentTables(env.DB);
    const bus = await env.DB.prepare(`SELECT bus_id, operator, name, bus_type, price, from_city, to_city, departure, arrival, duration, total_seats FROM buses WHERE bus_id=?`).bind(busId).first();
    if (!bus) return json({ error: "Bus not found." }, 404);

    const maxSeats = Number(bus.total_seats);
    const price = Number(bus.price);
    const cleaned = passengers.map(p => ({
      seat: Number(p?.seat),
      name: String(p?.name || "").trim().slice(0, 100),
      whatsapp: String(p?.whatsapp || "").replace(/\D/g, "").slice(0, 10)
    }));
    const seats = cleaned.map(p => p.seat);
    if (new Set(seats).size !== seats.length || seats.some(s => !Number.isInteger(s) || s < 1 || s > maxSeats)) return json({ error: "Invalid or duplicate seat selection." }, 400);
    if (cleaned.some(p => p.name.length < 2 || !/^\d{10}$/.test(p.whatsapp))) return json({ error: "Each passenger needs a valid name and 10-digit WhatsApp number." }, 400);

    const now = Date.now();
    await env.DB.prepare(`DELETE FROM seat_reservations WHERE expires_at <= ?`).bind(now).run();
    const booked = await env.DB.prepare(`SELECT seat_number FROM passengers WHERE bus_id=? AND journey_date=? AND booking_status='confirmed'`).bind(busId, journeyDate).all();
    const reserved = await env.DB.prepare(`SELECT seat_number FROM seat_reservations WHERE bus_id=? AND journey_date=? AND expires_at>?`).bind(busId, journeyDate, now).all();
    const unavailable = new Set([
      ...(booked.results || []).map(r => Number(r.seat_number)),
      ...(reserved.results || []).map(r => Number(r.seat_number)),
      ...(await blockedSeats(env.DB, busId, journeyDate))
    ]);
    if (seats.some(s => unavailable.has(s))) return json({ error: "One or more selected seats are no longer available.", code: "SEAT_CONFLICT" }, 409);

    const totalAmount = seats.length * price;
    if (!Number.isInteger(totalAmount) || totalAmount < 1 || totalAmount > 500000) return json({ error: "Invalid payment amount." }, 400);
    const bookingId = `JB-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
    const attemptId = `PA-${crypto.randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`;
    const createdAt = new Date().toISOString();
    const expiresAt = now + 15 * 60 * 1000;

    const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { authorization: basicAuth(env.RAZORPAY_KEY_ID, env.RAZORPAY_KEY_SECRET), "content-type": "application/json" },
      body: JSON.stringify({ amount: totalAmount * 100, currency: "INR", receipt: bookingId, capture: "automatic", notes: { source: "janbahon", booking_id: bookingId } })
    });
    const orderText = await orderResponse.text();
    let order;
    try { order = JSON.parse(orderText); } catch { order = {}; }
    if (!orderResponse.ok || !order.id) return json({ error: order?.error?.description || "Could not create payment order." }, 502);

    const statements = [
      env.DB.prepare(`INSERT INTO bookings (booking_id,bus_id,journey_date,total_amount,payment_status,created_at) VALUES (?,?,?,?,?,?)`).bind(bookingId, busId, journeyDate, totalAmount, "pending", createdAt),
      ...cleaned.map(p => env.DB.prepare(`INSERT INTO passengers (booking_id,bus_id,journey_date,seat_number,name,whatsapp,booking_status) VALUES (?,?,?,?,?,?,?)`).bind(bookingId, busId, journeyDate, p.seat, p.name, p.whatsapp, "pending")),
      ...seats.map(seat => env.DB.prepare(`INSERT INTO seat_reservations (bus_id,journey_date,seat_number,booking_id,expires_at,created_at) VALUES (?,?,?,?,?,?)`).bind(busId, journeyDate, seat, bookingId, expiresAt, createdAt)),
      env.DB.prepare(`INSERT INTO payment_attempts (attempt_id,booking_id,razorpay_order_id,amount,status,created_at) VALUES (?,?,?,?,?,?)`).bind(attemptId, bookingId, order.id, totalAmount, "created", createdAt)
    ];

    try {
      await env.DB.batch(statements);
    } catch (error) {
      console.error("Payment reservation failed", error);
      return json({ error: "Those seats were just reserved by another customer. Please choose again.", code: "SEAT_CONFLICT" }, 409);
    }

    return json({ success: true, keyId: env.RAZORPAY_KEY_ID, orderId: order.id, amount: totalAmount * 100, currency: "INR", bookingId, expiresAt }, 201);
  } catch (error) {
    console.error("Payment order error", error);
    return json({ error: "Could not start payment." }, 500);
  }
}
