function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value || ""); }

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

function b64url(bytes) {
  let binary = "";
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromB64url(value) {
  const padded = String(value || "").replaceAll("-", "+").replaceAll("_", "/") + "===";
  const binary = atob(padded.slice(0, padded.length - (padded.length % 4)));
  return new Uint8Array([...binary].map(ch => ch.charCodeAt(0)));
}

async function sessionMobile(request, secret) {
  if (!secret) return null;
  const cookie = request.headers.get("Cookie") || "";
  const prefix = "jb_owner_session=";
  const raw = cookie.split(";").map(v => v.trim()).find(v => v.startsWith(prefix))?.slice(prefix.length);
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig || b64url(await hmac(body, secret)) !== sig) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    return payload.exp > Date.now() ? payload.mobile : null;
  } catch { return null; }
}

function datePlusDays(date, days) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function getOwner(env, request) {
  if (!env.DB) throw new Error("D1 database is not bound yet.");
  const mobile = await sessionMobile(request, env.OWNER_AUTH_SECRET);
  if (!mobile) return null;
  return env.DB.prepare("SELECT owner_id, status FROM owners WHERE mobile = ?").bind(mobile).first();
}

async function putBusMedia(env, file, key, allowedTypes, maxBytes) {
  if (!env.MEDIA) throw new Error("R2 MEDIA binding is not configured.");
  if (!(file instanceof File) || file.size < 1) return null;
  if (file.size > maxBytes) throw new Error(`File ${file.name} is too large.`);
  if (!allowedTypes.has(file.type)) throw new Error(`Unsupported file type: ${file.type || "unknown"}.`);
  await env.MEDIA.put(key, file, { httpMetadata: { contentType: file.type, cacheControl: "public, max-age=86400" } });
  return key;
}

export async function onRequestGet({ request, env }) {
  try {
    const owner = await getOwner(env, request);
    if (!owner) return json({ error: "Owner login required." }, 401);
    const rows = await env.DB.prepare(
      `SELECT bus_id, operator, name, bus_type, price, from_city, to_city, departure, arrival, duration, total_seats, photo_keys, video_key
       FROM buses WHERE owner_id = ? ORDER BY created_at DESC`
    ).bind(owner.owner_id).all();
    const buses = [];
    for (const row of rows.results || []) {
      const blocks = await env.DB.prepare(
        `SELECT block_id, seat_number, start_date, end_date, reason FROM seat_blocks
         WHERE bus_id = ? ORDER BY start_date, seat_number`
      ).bind(row.bus_id).all();
      buses.push({ ...row, photo_keys: JSON.parse(row.photo_keys || "[]"), blocks: blocks.results || [] });
    }
    return json({ owner, buses });
  } catch (error) {
    return json({ error: String(error?.message || error) }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const owner = await getOwner(env, request);
    if (!owner) return json({ error: "Owner login required." }, 401);
    const action = new URL(request.url).searchParams.get("action");

    if (action === "create-bus") {
      const form = await request.formData();
      const operator = String(form.get("operator") || "").trim().slice(0, 100);
      const name = String(form.get("name") || "").trim().slice(0, 100);
      const type = String(form.get("busType") || "").trim().slice(0, 60);
      const price = Number(form.get("price"));
      const from = String(form.get("fromCity") || "").trim().slice(0, 80);
      const to = String(form.get("toCity") || "").trim().slice(0, 80);
      const departure = String(form.get("departure") || "").trim().slice(0, 30);
      const arrival = String(form.get("arrival") || "").trim().slice(0, 30);
      const duration = String(form.get("duration") || "").trim().slice(0, 30);
      const totalSeats = Number(form.get("totalSeats"));
      if (!operator || !name || !type || !from || !to || from === to || !departure || !arrival || !duration || !Number.isInteger(price) || price < 1 || !Number.isInteger(totalSeats) || totalSeats < 4 || totalSeats > 100) {
        return json({ error: "Complete the bus details correctly. Seats must be 4–100." }, 400);
      }

      const photos = form.getAll("photos").filter(file => file instanceof File && file.size > 0);
      const video = form.get("video");
      if (photos.length > 5) return json({ error: "Maximum 5 bus photos allowed." }, 400);
      if (video instanceof File && video.size > 25 * 1024 * 1024) return json({ error: "Video must be 25 MB or smaller." }, 400);

      const busId = `owner-${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
      const photoKeys = [];
      for (const photo of photos) {
        const key = await putBusMedia(env, photo, `bus-media/${busId}/${crypto.randomUUID()}`, new Set(["image/jpeg", "image/png", "image/webp"]), 8 * 1024 * 1024);
        if (key) photoKeys.push(key);
      }
      const videoKey = await putBusMedia(env, video, `bus-media/${busId}/${crypto.randomUUID()}`, new Set(["video/mp4", "video/webm", "video/quicktime"]), 25 * 1024 * 1024);

      await env.DB.prepare(
        `INSERT INTO buses (bus_id, operator, name, bus_type, price, from_city, to_city, departure, arrival, duration, total_seats, owner_id, photo_keys, video_key, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(busId, operator, name, type, price, from, to, departure, arrival, duration, totalSeats, owner.owner_id, JSON.stringify(photoKeys), videoKey, new Date().toISOString()).run();
      return json({ success: true, busId });
    }

    if (action === "block-seat") {
      const body = await request.json();
      const busId = String(body?.busId || "");
      const seat = Number(body?.seatNumber);
      const startDate = String(body?.startDate || "");
      const duration = String(body?.duration || "");
      const reason = String(body?.reason || "Blocked by bus owner").trim().slice(0, 100);
      const bus = await env.DB.prepare("SELECT total_seats FROM buses WHERE bus_id = ? AND owner_id = ?").bind(busId, owner.owner_id).first();
      if (!bus || !Number.isInteger(seat) || seat < 1 || seat > bus.total_seats || !validDate(startDate) || !["1_day", "1_week", "until_unblock"].includes(duration)) {
        return json({ error: "Invalid seat block details." }, 400);
      }
      const endDate = duration === "1_day" ? startDate : duration === "1_week" ? datePlusDays(startDate, 6) : null;
      const blockId = `BLK-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
      await env.DB.prepare(
        `INSERT INTO seat_blocks (block_id, owner_id, bus_id, seat_number, start_date, end_date, reason, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(blockId, owner.owner_id, busId, seat, startDate, endDate, reason, new Date().toISOString()).run();
      return json({ success: true, blockId, endDate });
    }

    if (action === "unblock-seat") {
      const body = await request.json();
      const result = await env.DB.prepare("DELETE FROM seat_blocks WHERE block_id = ? AND owner_id = ?").bind(String(body?.blockId || ""), owner.owner_id).run();
      return json({ success: true, deleted: result.meta?.changes || 0 });
    }

    if (action === "update-seats") {
      const body = await request.json();
      const busId = String(body?.busId || "");
      const totalSeats = Number(body?.totalSeats);
      if (!Number.isInteger(totalSeats) || totalSeats < 4 || totalSeats > 100) return json({ error: "Seats must be 4–100." }, 400);
      const bus = await env.DB.prepare("SELECT total_seats FROM buses WHERE bus_id = ? AND owner_id = ?").bind(busId, owner.owner_id).first();
      if (!bus) return json({ error: "Bus not found." }, 404);
      const booked = await env.DB.prepare("SELECT COUNT(*) AS c FROM passengers WHERE bus_id = ? AND booking_status = 'confirmed' AND journey_date >= date('now')").bind(busId).first();
      if (totalSeats < Number(booked?.c || 0)) return json({ error: "Total seats cannot be below currently booked seats." }, 400);
      await env.DB.prepare("UPDATE buses SET total_seats = ? WHERE bus_id = ? AND owner_id = ?").bind(totalSeats, busId, owner.owner_id).run();
      return json({ success: true });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (error) {
    console.error("Owner bus error", error);
    return json({ error: String(error?.message || error) }, 500);
  }
}
