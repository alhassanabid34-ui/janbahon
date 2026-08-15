const BUS_PRICES = {
  "astc-mankachar-express": 480,
  "janbahon-south-assam": 390,
  "assam-roadways-brahmaputra": 520,
  "janbahon-barak-valley": 360,
  "northeast-night-rider": 550
};

const BUS_SEATS = {
  "astc-mankachar-express": 32,
  "janbahon-south-assam": 40,
  "assam-roadways-brahmaputra": 44,
  "janbahon-barak-valley": 36,
  "northeast-night-rider": 48
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "");
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: "D1 database is not bound yet." }, 503);

  const url = new URL(request.url);
  const busId = url.searchParams.get("busId");
  const date = url.searchParams.get("date");

  if (!BUS_SEATS[busId] || !validDate(date)) {
    return json({ error: "busId and date are required." }, 400);
  }

  const result = await env.DB.prepare(
    `SELECT seat_number FROM passengers
     WHERE bus_id = ? AND journey_date = ? AND booking_status = 'confirmed'
     ORDER BY seat_number`
  ).bind(busId, date).all();

  return json({
    busId,
    date,
    bookedSeats: (result.results || []).map(row => Number(row.seat_number))
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: "D1 database is not bound yet." }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }

  const { busId, journeyDate, passengers, paymentStatus = "demo" } = body || {};
  const price = BUS_PRICES[busId];
  const maxSeats = BUS_SEATS[busId];

  if (!price || !maxSeats || !validDate(journeyDate) || !Array.isArray(passengers) || passengers.length < 1 || passengers.length > maxSeats) {
    return json({ error: "Invalid booking details." }, 400);
  }

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

  const totalAmount = cleaned.length * price;
  const bookingId = `JB-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  const createdAt = new Date().toISOString();
  const status = paymentStatus === "paid" ? "paid" : "confirmed";

  const statements = [
    env.DB.prepare(
      `INSERT INTO bookings
       (booking_id, bus_id, journey_date, total_amount, payment_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(bookingId, busId, journeyDate, totalAmount, status, createdAt),
    ...cleaned.map(p => env.DB.prepare(
      `INSERT INTO passengers
       (booking_id, bus_id, journey_date, seat_number, name, whatsapp, booking_status)
       VALUES (?, ?, ?, ?, ?, ?, 'confirmed')`
    ).bind(bookingId, busId, journeyDate, p.seat, p.name, p.whatsapp))
  ];

  try {
    await env.DB.batch(statements);
  } catch (error) {
    const message = String(error?.message || error);
    if (/UNIQUE|constraint|seat/i.test(message)) {
      return json({
        error: "One or more selected seats were just booked by another customer.",
        code: "SEAT_CONFLICT"
      }, 409);
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
}
