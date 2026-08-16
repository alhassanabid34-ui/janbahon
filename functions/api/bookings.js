function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value || ""); }

async function getBus(env, busId) {
  return env.DB.prepare(
    `SELECT bus_id, price, total_seats FROM buses WHERE bus_id = ?`
  ).bind(busId).first();
}

// seat_blocks is optional. Older JANBAHON databases do not have this table yet,
// so a missing table must never break the customer seat map or booking flow.
async function getBlockedSeats(env, busId, date) {
  try {
    const table = await env.DB.prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'seat_blocks'`
    ).first();
    if (!table) return [];

    const result = await env.DB.prepare(
      `SELECT seat_number FROM seat_blocks
       WHERE bus_id = ? AND start_date <= ? AND (end_date IS NULL OR end_date >= ?)
       ORDER BY seat_number`
    ).bind(busId, date, date).all();

    return (result.results || []).map(row => Number(row.seat_number));
  } catch (error) {
    // Treat the optional blocking feature as unavailable rather than returning 500.
    console.warn("seat_blocks lookup skipped", error);
    return [];
  }
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: "D1 database is not bound yet." }, 503);

  const url = new URL(request.url);
  const busId = url.searchParams.get("busId");
  const date = url.searchParams.get("date");
  if (!busId || !validDate(date)) return json({ error: "busId and date are required." }, 400);

  try {
    const bus = await getBus(env, busId);
    if (!bus) return json({ error: "Bus not found." }, 404);

    const booked = await env.DB.prepare(
      `SELECT seat_number FROM passengers
       WHERE bus_id = ? AND journey_date = ? AND booking_status = 'confirmed'
       ORDER BY seat_number`
    ).bind(busId, date).all();

    const bookedSeats = (booked.results || []).map(row => Number(row.seat_number));
    const blockedSeats = await getBlockedSeats(env, busId, date);

    return json({
      success: true,
      busId,
      date,
      bookedSeats,
      blockedSeats,
      totalSeats: Number(bus.total_seats),
      availableSeats: Math.max(0, Number(bus.total_seats) - bookedSeats.length - blockedSeats.length)
    });
  } catch (error) {
    console.error("Seat map lookup failed", error);
    return json({ error: "Could not load seat availability." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: "D1 database is not bound yet." }, 503);

  let body;
  try { body = await request.json(); }
  catch { return json({ error: "Invalid JSON." }, 400); }

  const { busId, journeyDate, passengers, paymentStatus = "demo" } = body || {};
  if (!busId || !validDate(journeyDate) || !Array.isArray(passengers) || passengers.length < 1) {
    return json({ error: "Invalid booking details." }, 400);
  }

  try {
    const bus = await getBus(env, busId);
    if (!bus || !Number.isInteger(Number(bus.price)) || !Number.isInteger(Number(bus.total_seats))) {
      return json({ error: "Bus is not available." }, 404);
    }

    const price = Number(bus.price);
    const maxSeats = Number(bus.total_seats);
    if (passengers.length > maxSeats) return json({ error: "Too many seats selected." }, 400);

    const cleaned = passengers.map(p => ({
      seat: Number(p?.seat),
      name: String(p?.name || "").trim().slice(0, 100),
      whatsapp: String(p?.whatsapp || "").replace(/\D/g, "").slice(0, 10)
    }));

    const seats = cleaned.map(p => p.seat);
    const uniqueSeats = new Set(seats);
    if (uniqueSeats.size !== seats.length || seats.some(seat => !Number.isInteger(seat) || seat < 1 || seat > maxSeats)) {
      return json({ error: "Invalid or duplicate seat selection." }, 400);
    }

    if (cleaned.some(p => p.name.length < 2 || !/^\d{10}$/.test(p.whatsapp))) {
      return json({ error: "Each passenger needs a valid name and 10-digit WhatsApp number." }, 400);
    }

    const blockedSeats = await getBlockedSeats(env, busId, journeyDate);
    const blockedSet = new Set(blockedSeats);
    if (seats.some(seat => blockedSet.has(seat))) {
      return json({ error: "One or more selected seats are blocked by the bus owner.", code: "SEAT_BLOCKED" }, 409);
    }

    // Explicitly check confirmed passengers before inserting. This also gives a
    // clean error even when the database does not have a unique seat constraint.
    const existing = await env.DB.prepare(
      `SELECT seat_number FROM passengers
       WHERE bus_id = ? AND journey_date = ? AND booking_status = 'confirmed'
       AND seat_number IN (${seats.map(() => "?").join(",")})`
    ).bind(busId, journeyDate, ...seats).all();

    const occupiedSeats = new Set((existing.results || []).map(row => Number(row.seat_number)));
    if (seats.some(seat => occupiedSeats.has(seat))) {
      return json({ error: "One or more selected seats are already booked.", code: "SEAT_CONFLICT" }, 409);
    }

    const totalAmount = cleaned.length * price;
    const bookingId = `JB-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
    const createdAt = new Date().toISOString();
    const status = paymentStatus === "paid" ? "paid" : "confirmed";

    const statements = [
      env.DB.prepare(
        `INSERT INTO bookings (booking_id, bus_id, journey_date, total_amount, payment_status, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(bookingId, busId, journeyDate, totalAmount, status, createdAt),
      ...cleaned.map(p => env.DB.prepare(
        `INSERT INTO passengers (booking_id, bus_id, journey_date, seat_number, name, whatsapp, booking_status)
         VALUES (?, ?, ?, ?, ?, ?, 'confirmed')`
      ).bind(bookingId, busId, journeyDate, p.seat, p.name, p.whatsapp))
    ];

    try {
      await env.DB.batch(statements);
    } catch (error) {
      const message = String(error?.message || error);
      if (/UNIQUE|constraint|seat/i.test(message)) {
        return json({ error: "One or more selected seats were just booked by another customer.", code: "SEAT_CONFLICT" }, 409);
      }
      console.error("Booking insert failed", error);
      return json({ error: "Could not save the booking." }, 500);
    }

    return json({
      success: true,
      bookingId,
      busId,
      journeyDate,
      seats,
      totalAmount,
      paymentStatus: status,
      createdAt
    }, 201);
  } catch (error) {
    console.error("Booking request failed", error);
    return json({ error: "Could not process the booking." }, 500);
  }
}
