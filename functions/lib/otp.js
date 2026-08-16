const RESEND_MS = 60 * 1000;
const OTP_TEMPLATE = "JNBHN 1";

function normalizeMobile(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return "";
}

function jsonError(message, status = 400) {
  return { error: message, status };
}

async function getJson(response) {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return {}; }
}

export async function sendOtp(env, mobile, purpose) {
  const normalized = normalizeMobile(mobile);
  if (!normalized) return jsonError("Enter a valid 10-digit Indian mobile number.");
  if (!env.TWOFACTOR_API_KEY) return jsonError("2Factor OTP is not configured. Add TWOFACTOR_API_KEY as an encrypted secret.", 500);

  const now = Date.now();
  if (env.DB) {
    const existing = await env.DB.prepare(
      "SELECT last_sent_at FROM otp_codes WHERE mobile = ? AND purpose = ?"
    ).bind(normalized, purpose).first();
    if (existing?.last_sent_at && now - Number(existing.last_sent_at) < RESEND_MS) {
      return jsonError("Please wait 60 seconds before requesting another OTP.", 429);
    }
  }

  const template = env.TWOFACTOR_OTP_TEMPLATE || OTP_TEMPLATE;
  const endpoint = `https://2factor.in/API/V1/${encodeURIComponent(env.TWOFACTOR_API_KEY)}/SMS/${encodeURIComponent(normalized)}/AUTOGEN/${encodeURIComponent(template)}`;
  const response = await fetch(endpoint, { method: "GET", headers: { "accept": "application/json" } });
  const data = await getJson(response);
  const status = String(data?.Status || "").toLowerCase();

  if (!response.ok || status !== "success") {
    throw new Error(data?.Details || data?.message || "2Factor could not send the OTP.");
  }

  // 2Factor generates and verifies the OTP. JanBahon never stores the OTP itself.
  // D1 keeps only a short-lived resend/attempt record for abuse protection.
  if (env.DB) {
    await env.DB.prepare(
      `INSERT INTO otp_codes (mobile, purpose, otp_hash, expires_at, attempts, last_sent_at)
       VALUES (?, ?, '2factor', ?, 0, ?)
       ON CONFLICT(mobile, purpose) DO UPDATE SET
         otp_hash = '2factor',
         expires_at = excluded.expires_at,
         attempts = 0,
         last_sent_at = excluded.last_sent_at`
    ).bind(normalized, purpose, now + 5 * 60 * 1000, now).run();
  }

  return { success: true, mobile: normalized };
}

export async function verifyOtp(env, mobile, purpose, code) {
  const normalized = normalizeMobile(mobile);
  const cleanCode = String(code || "").replace(/\D/g, "").slice(0, 6);
  if (!normalized || cleanCode.length !== 6) return jsonError("Mobile number and 6-digit OTP are required.");
  if (!env.TWOFACTOR_API_KEY) return jsonError("2Factor OTP is not configured. Add TWOFACTOR_API_KEY as an encrypted secret.", 500);

  if (env.DB) {
    const row = await env.DB.prepare(
      "SELECT expires_at, attempts FROM otp_codes WHERE mobile = ? AND purpose = ?"
    ).bind(normalized, purpose).first();
    if (!row) return jsonError("OTP not found. Please request a new OTP.", 401);
    if (Number(row.expires_at) < Date.now()) return jsonError("OTP expired. Please request a new OTP.", 401);
    if (Number(row.attempts) >= 5) return jsonError("Too many incorrect attempts. Please request a new OTP.", 429);
  }

  const endpoint = `https://2factor.in/API/V1/${encodeURIComponent(env.TWOFACTOR_API_KEY)}/SMS/VERIFY3/${encodeURIComponent(normalized)}/${encodeURIComponent(cleanCode)}`;
  const response = await fetch(endpoint, { method: "GET", headers: { "accept": "application/json" } });
  const data = await getJson(response);
  const status = String(data?.Status || "").toLowerCase();

  if (!response.ok || status !== "success") {
    if (env.DB) {
      await env.DB.prepare("UPDATE otp_codes SET attempts = attempts + 1 WHERE mobile = ? AND purpose = ?")
        .bind(normalized, purpose).run();
    }
    return jsonError(data?.Details || "Incorrect OTP.", 401);
  }

  if (env.DB) {
    await env.DB.prepare("DELETE FROM otp_codes WHERE mobile = ? AND purpose = ?")
      .bind(normalized, purpose).run();
  }

  return { success: true, mobile: normalized };
}

export { normalizeMobile };
