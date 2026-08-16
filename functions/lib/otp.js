const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function normalizeMobile(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return "";
}

function jsonError(message, status = 400) {
  return { error: message, status };
}

async function sha256Hex(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function randomOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function sendOtp(env, mobile, purpose) {
  const normalized = normalizeMobile(mobile);
  if (!normalized) return jsonError("Enter a valid 10-digit Indian mobile number.");
  if (!env.TWOFACTOR_API_KEY) return jsonError("2Factor OTP is not configured. Add TWOFACTOR_API_KEY in Cloudflare Secrets.", 500);

  const now = Date.now();
  const existing = await env.DB.prepare(
    "SELECT last_sent_at FROM otp_codes WHERE mobile = ? AND purpose = ?"
  ).bind(normalized, purpose).first();

  if (existing?.last_sent_at && now - Number(existing.last_sent_at) < RESEND_MS) {
    return jsonError("Please wait 60 seconds before requesting another OTP.", 429);
  }

  const otp = randomOtp();
  const response = await fetch(
    `https://2factor.in/API/V1/${encodeURIComponent(env.TWOFACTOR_API_KEY)}/SMS/${encodeURIComponent(normalized)}/${otp}`,
    { method: "POST" }
  );
  const text = await response.text();
  let data = {};
  try { data = JSON.parse(text); } catch {}
  if (!response.ok || (data.Status && String(data.Status).toLowerCase() !== "success")) {
    throw new Error(data.Details || data.message || "2Factor could not send the OTP.");
  }

  const otpHash = await sha256Hex(`${normalized}:${purpose}:${otp}`);
  await env.DB.prepare(
    `INSERT INTO otp_codes (mobile, purpose, otp_hash, expires_at, attempts, last_sent_at)
     VALUES (?, ?, ?, ?, 0, ?)
     ON CONFLICT(mobile, purpose) DO UPDATE SET
       otp_hash = excluded.otp_hash,
       expires_at = excluded.expires_at,
       attempts = 0,
       last_sent_at = excluded.last_sent_at`
  ).bind(normalized, purpose, otpHash, now + OTP_TTL_MS, now).run();

  return { success: true, mobile: normalized };
}

export async function verifyOtp(env, mobile, purpose, code) {
  const normalized = normalizeMobile(mobile);
  const cleanCode = String(code || "").replace(/\D/g, "").slice(0, 6);
  if (!normalized || cleanCode.length !== 6) return jsonError("Mobile number and 6-digit OTP are required.");

  const row = await env.DB.prepare(
    "SELECT otp_hash, expires_at, attempts FROM otp_codes WHERE mobile = ? AND purpose = ?"
  ).bind(normalized, purpose).first();

  if (!row) return jsonError("OTP not found. Please request a new OTP.", 401);
  if (Number(row.expires_at) < Date.now()) return jsonError("OTP expired. Please request a new OTP.", 401);
  if (Number(row.attempts) >= MAX_ATTEMPTS) return jsonError("Too many incorrect attempts. Please request a new OTP.", 429);

  const expected = await sha256Hex(`${normalized}:${purpose}:${cleanCode}`);
  if (expected !== row.otp_hash) {
    await env.DB.prepare("UPDATE otp_codes SET attempts = attempts + 1 WHERE mobile = ? AND purpose = ?").bind(normalized, purpose).run();
    return jsonError("Incorrect OTP.", 401);
  }

  await env.DB.prepare("DELETE FROM otp_codes WHERE mobile = ? AND purpose = ?").bind(normalized, purpose).run();
  return { success: true, mobile: normalized };
}

export { normalizeMobile };
