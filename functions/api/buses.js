function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value || ""); }

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: "D1 database is not bound yet." }, 503);
  const url = new URL(request.url);
  const from = String(url.searchParams.get("from") || "").trim();
  const to = String(url.searchParams.get("to") || "").trim();
  const date = String(url.searchParams.get("date") || "");
  if (!from || !to || !validDate(date)) return json({ error: "from, to and date are required." }, 400);

  const rows = await env.DB.prepare(
    `SELECT b.bus_id, b.operator, b.name, b.bus_type, b.price, b.from_city, b.to_city, b.departure, b.arrival, b.duration,
            b.total_seats, b.photo_keys, b.video_key, b.owner_id,
            (SELECT COUNT(*) FROM passengers p WHERE p.bus_id = b.bus_id AND p.journey_date = ? AND p.booking_status = 'confirmed') AS booked_count
     FROM buses b WHERE b.from_city = ? AND b.to_city = ? ORDER BY b.departure`
  ).bind(date, from, to).all();

  const buses = [];
  for (const row of rows.results || []) {
    const blocks = await env.DB.prepare(
      `SELECT COUNT(DISTINCT seat_number) AS c FROM seat_blocks
       WHERE bus_id = ? AND start_date <= ? AND (end_date IS NULL OR end_date >= ?)`
    ).bind(row.bus_id, date, date).first();
    const blockedCount = Number(blocks?.c || 0);
    const totalSeats = Number(row.total_seats || 0);
    const bookedCount = Number(row.booked_count || 0);
    const availableSeats = Math.max(0, totalSeats - bookedCount - blockedCount);
    buses.push({
      id: row.bus_id,
      operator: row.operator,
      name: row.name,
      type: row.bus_type,
      price: Number(row.price),
      from: row.from_city,
      to: row.to_city,
      departure: row.departure,
      arrival: row.arrival,
      duration: row.duration,
      seats: availableSeats,
      totalSeats,
      ownerBus: !!row.owner_id,
      photos: JSON.parse(row.photo_keys || "[]").map(key => `/api/media?key=${encodeURIComponent(key)}`),
      video: row.video_key ? `/api/media?key=${encodeURIComponent(row.video_key)}` : null
    });
  }
  return json({ buses, date });
}
