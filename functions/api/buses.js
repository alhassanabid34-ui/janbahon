export async function onRequestGet({ request, env }) {
  try {
    if (!env.DB) return json({ error: "D1 database binding DB is missing" }, 503);

    const url = new URL(request.url);
    const from = url.searchParams.get("from")?.trim() || "";
    const to = url.searchParams.get("to")?.trim() || "";
    const date = url.searchParams.get("date")?.trim() || "";

    let sql = `
      SELECT
        b.bus_id,
        b.operator AS operator_name,
        b.name AS bus_name,
        b.bus_type,
        b.price,
        b.from_city,
        b.to_city,
        b.departure,
        b.arrival,
        b.duration,
        b.total_seats,
        b.owner_id,
        COALESCE(o.full_name, '') AS owner_name
      FROM buses b
      LEFT JOIN owners o ON b.owner_id = o.owner_id
      WHERE 1 = 1
    `;
    const params = [];

    if (from) {
      sql += " AND LOWER(b.from_city) = LOWER(?)";
      params.push(from);
    }
    if (to) {
      sql += " AND LOWER(b.to_city) = LOWER(?)";
      params.push(to);
    }

    sql += " ORDER BY b.departure ASC, b.operator ASC, b.name ASC";

    const result = await env.DB.prepare(sql).bind(...params).all();
    return json({
      success: true,
      date: date || null,
      from: from || null,
      to: to || null,
      count: result.results?.length || 0,
      buses: result.results || []
    });
  } catch (error) {
    console.error("GET /api/buses error:", error);
    return json({ success: false, error: error?.message || "Failed to load buses" }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "Cache-Control": "no-store"
    }
  });
}
