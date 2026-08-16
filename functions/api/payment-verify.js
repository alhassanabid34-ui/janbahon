import { buildTicketPdf } from "../_lib/ticket.js";
import { sendBookingWhatsApp } from "../_lib/whatsapp.js";

function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } }); }
function basicAuth(id, secret) { return `Basic ${btoa(`${id}:${secret}`)}`; }
async function verifySignature(orderId, paymentId, signature, secret) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const bytes = Uint8Array.from((signature || "").match(/.{1,2}/g)?.map(h => parseInt(h, 16)) || []);
  return bytes.length === 32 && await crypto.subtle.verify("HMAC", key, bytes, new TextEncoder().encode(`${orderId}|${paymentId}`));
}
async function razorpay(env, path, options = {}) {
  const response = await fetch(`https://api.razorpay.com/v1${path}`, { ...options, headers: { authorization: basicAuth(env.RAZORPAY_KEY_ID, env.RAZORPAY_KEY_SECRET), ...(options.headers || {}) } });
  const text = await response.text(); let data; try { data = JSON.parse(text); } catch { data = {}; }
  if (!response.ok) throw new Error(data?.error?.description || `Razorpay request failed (${response.status})`);
  return data;
}
async function refundPayment(env, paymentId, amount) {
  try { return await razorpay(env, `/payments/${encodeURIComponent(paymentId)}/refund`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amount: Number(amount) * 100, notes: { reason: "JANBAHON booking fulfilment failed", payment_id: paymentId } }) }); }
  catch (error) { console.error("Refund attempt failed", error); return null; }
}
async function ensurePaymentTables(db) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS seat_reservations (bus_id TEXT NOT NULL, journey_date TEXT NOT NULL, seat_number INTEGER NOT NULL, booking_id TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY (bus_id, journey_date, seat_number))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS payment_attempts (attempt_id TEXT PRIMARY KEY, booking_id TEXT NOT NULL UNIQUE, razorpay_order_id TEXT UNIQUE, razorpay_payment_id TEXT, amount INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'created', created_at TEXT NOT NULL)`)
  ]);
}
async function loadTicket(db, bookingId) {
  const booking = await db.prepare(`SELECT b.booking_id,b.bus_id,b.journey_date,b.total_amount,b.payment_status,b.created_at,bu.operator,bu.name AS bus_name,bu.bus_type,bu.from_city,bu.to_city,bu.departure,bu.arrival,bu.duration,COALESCE(o.full_name,'') AS owner_name FROM bookings b JOIN buses bu ON bu.bus_id=b.bus_id LEFT JOIN owners o ON o.owner_id=bu.owner_id WHERE b.booking_id=?`).bind(bookingId).first();
  if (!booking) return null;
  const passengers = await db.prepare(`SELECT seat_number AS seat,name,whatsapp FROM passengers WHERE booking_id=? ORDER BY seat_number`).bind(bookingId).all();
  return { ...booking, passengers: passengers.results || [], whatsapp: passengers.results?.[0]?.whatsapp || "" };
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: "D1 database is not bound." }, 503);
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) return json({ error: "Razorpay is not configured yet." }, 503);
  let body; try { body = await request.json(); } catch { return json({ error: "Invalid JSON." }, 400); }
  const paymentId = String(body?.razorpay_payment_id || ""), orderIdFromClient = String(body?.razorpay_order_id || ""), signature = String(body?.razorpay_signature || "");
  if (!paymentId || !orderIdFromClient || !signature) return json({ error: "Payment verification details are incomplete." }, 400);

  try {
    await ensurePaymentTables(env.DB);
    const attempt = await env.DB.prepare(`SELECT * FROM payment_attempts WHERE razorpay_order_id=?`).bind(orderIdFromClient).first();
    if (!attempt) return json({ error: "Payment order not found." }, 404);
    if (attempt.status === "paid") { const ticket = await loadTicket(env.DB, attempt.booking_id); return json({ success: true, alreadyProcessed: true, bookingId: attempt.booking_id, totalAmount: ticket?.total_amount || attempt.amount, whatsappSent: true }); }
    if (!await verifySignature(attempt.razorpay_order_id, paymentId, signature, env.RAZORPAY_KEY_SECRET)) return json({ error: "Payment verification failed." }, 400);

    let payment = await razorpay(env, `/payments/${encodeURIComponent(paymentId)}`);
    if (payment.order_id && payment.order_id !== attempt.razorpay_order_id) return json({ error: "Payment order mismatch." }, 400);
    if (Number(payment.amount) !== Number(attempt.amount) * 100) return json({ error: "Payment amount mismatch." }, 400);
    if (payment.status === "authorized") payment = await razorpay(env, `/payments/${encodeURIComponent(paymentId)}/capture`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amount: Number(attempt.amount) * 100, currency: "INR" }) });
    if (payment.status !== "captured") return json({ error: `Payment is not captured yet (${payment.status || "unknown"}). Please retry.` }, 409);

    const booking = await env.DB.prepare(`SELECT booking_id FROM bookings WHERE booking_id=? AND payment_status='pending'`).bind(attempt.booking_id).first();
    if (!booking) {
      await refundPayment(env, paymentId, attempt.amount);
      return json({ error: "The seat reservation expired before payment confirmation. The captured payment has been sent for refund." }, 409);
    }

    try {
      await env.DB.batch([
        env.DB.prepare(`UPDATE bookings SET payment_status='paid' WHERE booking_id=?`).bind(attempt.booking_id),
        env.DB.prepare(`UPDATE passengers SET booking_status='confirmed' WHERE booking_id=?`).bind(attempt.booking_id),
        env.DB.prepare(`UPDATE payment_attempts SET razorpay_payment_id=?, status='paid' WHERE attempt_id=?`).bind(paymentId, attempt.attempt_id),
        env.DB.prepare(`DELETE FROM seat_reservations WHERE booking_id=?`).bind(attempt.booking_id)
      ]);
    } catch (error) {
      await refundPayment(env, paymentId, attempt.amount);
      throw error;
    }

    const ticket = await loadTicket(env.DB, attempt.booking_id);
    if (!ticket) { await refundPayment(env, paymentId, attempt.amount); return json({ error: "Booking record could not be loaded after payment. Refund initiated." }, 500); }
    const pdf = await buildTicketPdf({ bookingId: ticket.booking_id, journeyDate: ticket.journey_date, amount: ticket.total_amount, passengers: ticket.passengers, operator: ticket.operator, ownerName: ticket.owner_name, busName: ticket.bus_name, busType: ticket.bus_type, fromCity: ticket.from_city, toCity: ticket.to_city, departure: ticket.departure, arrival: ticket.arrival, duration: ticket.duration });

    let whatsapp = { sent: false, skipped: true, reason: "Not configured." };
    try { whatsapp = await sendBookingWhatsApp(env, ticket, pdf); } catch (error) { console.error("WhatsApp ticket delivery failed", error); whatsapp = { sent: false, skipped: false, reason: String(error?.message || error) }; }
    return json({ success: true, bookingId: ticket.booking_id, totalAmount: ticket.total_amount, paymentStatus: "paid", whatsappSent: Boolean(whatsapp.sent), whatsappReason: whatsapp.reason || "" });
  } catch (error) {
    console.error("Payment verification error", error);
    return json({ error: "Payment was received but booking confirmation could not be completed. Please contact JANBAHON support." }, 500);
  }
}
