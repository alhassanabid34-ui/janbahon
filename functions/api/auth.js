import { sendOtp, verifyOtp } from "../lib/otp.js";

const SESSION_COOKIE = "jb_user_session";
const SESSION_DAYS = 30;
const PASSWORD_ITERATIONS = 100000;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extraHeaders }
  });
}

function normalizeMobile(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return "";
}

function b64(bytes) {
  let binary = "";
  new Uint8Array(bytes).forEach(b => binary += String.fromCharCode(b));
  return btoa(binary);
}

function fromB64(value) {
  const binary = atob(value);
  return new Uint8Array([...binary].map(ch => ch.charCodeAt(0)));
}

async function derivePassword(password, salt) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: PASSWORD_ITERATIONS, hash: "SHA-256" }, key, 256);
  return b64(bits);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifyPassword(password, saltB64, expectedHash) {
  if (!password || !saltB64 || !expectedHash) return false;
  const actual = await derivePassword(password, fromB64(saltB64));
  return timingSafeEqual(actual, expectedHash);
}

async function makeSession(mobile, secret) {
  if (!secret) throw new Error("USER_AUTH_SECRET is not configured.");
  const payload = JSON.stringify({ mobile, exp: Date.now() + SESSION_DAYS * 86400000 });
  const body = b64(new TextEncoder().encode(payload)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  const signature = b64(sigBytes).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  return `${body}.${signature}`;
}

async function readSession(request, secret) {
  const cookie = request.headers.get("Cookie") || "";
  const raw = cookie.split(";").map(v => v.trim()).find(v => v.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  if (!raw || !secret) return null;
  const [body, signature] = raw.split(".");
  if (!body || !signature) return null;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expectedBytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  const expected = b64(expectedBytes).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  if (!timingSafeEqual(expected, signature)) return null;
  try {
    const padded = body.replaceAll("-", "+").replaceAll("_", "/") + "===";
    const payload = JSON.parse(new TextDecoder().decode(fromB64(padded.slice(0, padded.length - (padded.length % 4)))));
    if (!payload.mobile || !payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}

function sessionCookie(value) {
  return `${SESSION_COOKIE}=${value}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

function passwordError(password) {
  if (String(password || "").length < 6) return "Password must be at least 6 characters.";
  if (String(password || "").length > 128) return "Password is too long.";
  return "";
}

async function createUser(env, mobile, fullName, password) {
  const existing = await env.DB.prepare("SELECT user_id FROM users WHERE mobile = ?").bind(mobile).first();
  if (existing) return { error: "An account with this mobile number already exists.", status: 409 };
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePassword(password, salt);
  const now = new Date().toISOString();
  const userId = `USR-${crypto.randomUUID().replaceAll("-", "").slice(0, 14).toUpperCase()}`;
  await env.DB.prepare(
    `INSERT INTO users (user_id, mobile, full_name, password_hash, password_salt, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`
  ).bind(userId, mobile, String(fullName || "").trim().slice(0, 100), hash, b64(salt), now, now).run();
  return { userId };
}

export async function onRequestGet({ request, env }) {
  try {
    if (!env.DB) throw new Error("D1 database is not bound yet.");
    const session = await readSession(request, env.USER_AUTH_SECRET);
    if (!session) return json({ authenticated: false, user: null });
    const user = await env.DB.prepare("SELECT user_id, mobile, full_name, status, created_at FROM users WHERE mobile = ?").bind(session.mobile).first();
    if (!user || user.status !== "active") return json({ authenticated: false, user: null });
    return json({ authenticated: true, user });
  } catch (error) {
    return json({ error: String(error?.message || error) }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) throw new Error("D1 database is not bound yet.");
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const body = request.headers.get("content-type")?.includes("application/json") ? await request.json() : {};
    const mobile = normalizeMobile(body?.mobile);

    if (["register-send-otp", "login-send-otp", "reset-send-otp"].includes(action)) {
      if (!mobile) return json({ error: "Enter a valid 10-digit Indian mobile number." }, 400);
      if (action === "register-send-otp") {
        const existing = await env.DB.prepare("SELECT user_id FROM users WHERE mobile = ?").bind(mobile).first();
        if (existing) return json({ error: "This mobile number is already registered. Please log in." }, 409);
      }
      if (action === "reset-send-otp") {
        const existing = await env.DB.prepare("SELECT user_id FROM users WHERE mobile = ?").bind(mobile).first();
        if (!existing) return json({ error: "No account was found for this mobile number." }, 404);
      }
      const purpose = action.replace("-send-otp", "");
      const result = await sendOtp(env, mobile, `user_${purpose}`);
      if (!result.success) return json({ error: result.error }, result.status || 400);
      return json({ success: true, mobile: result.mobile });
    }

    if (action === "register") {
      const result = await verifyOtp(env, mobile, "user_register", body?.code);
      if (!result.success) return json({ error: result.error }, result.status || 400);
      const passError = passwordError(body?.password);
      if (passError) return json({ error: passError }, 400);
      const created = await createUser(env, result.mobile, body?.fullName, body?.password);
      if (created.error) return json({ error: created.error }, created.status);
      const token = await makeSession(result.mobile, env.USER_AUTH_SECRET);
      return json({ success: true, registered: true, userId: created.userId }, 200, { "Set-Cookie": sessionCookie(token) });
    }

    if (action === "login-password") {
      if (!mobile || !body?.password) return json({ error: "Mobile number and password are required." }, 400);
      const user = await env.DB.prepare("SELECT user_id, mobile, full_name, password_hash, password_salt, status FROM users WHERE mobile = ?").bind(mobile).first();
      if (!user || user.status !== "active") return json({ error: "Invalid mobile number or password." }, 401);
      if (!await verifyPassword(body.password, user.password_salt, user.password_hash)) return json({ error: "Invalid mobile number or password." }, 401);
      const token = await makeSession(mobile, env.USER_AUTH_SECRET);
      return json({ success: true, user: { user_id: user.user_id, mobile: user.mobile, full_name: user.full_name } }, 200, { "Set-Cookie": sessionCookie(token) });
    }

    if (action === "login-otp") {
      const result = await verifyOtp(env, mobile, "user_login", body?.code);
      if (!result.success) return json({ error: result.error }, result.status || 400);
      const user = await env.DB.prepare("SELECT user_id, mobile, full_name, status FROM users WHERE mobile = ?").bind(result.mobile).first();
      if (!user || user.status !== "active") return json({ error: "No active account was found for this mobile number. Please sign up first." }, 404);
      const token = await makeSession(result.mobile, env.USER_AUTH_SECRET);
      return json({ success: true, user }, 200, { "Set-Cookie": sessionCookie(token) });
    }

    if (action === "reset-password") {
      const result = await verifyOtp(env, mobile, "user_reset", body?.code);
      if (!result.success) return json({ error: result.error }, result.status || 400);
      const passError = passwordError(body?.password);
      if (passError) return json({ error: passError }, 400);
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const hash = await derivePassword(body.password, salt);
      const updated = await env.DB.prepare("UPDATE users SET password_hash = ?, password_salt = ?, updated_at = ? WHERE mobile = ?")
        .bind(hash, b64(salt), new Date().toISOString(), result.mobile).run();
      if (!updated.meta?.changes) return json({ error: "Account not found." }, 404);
      const token = await makeSession(result.mobile, env.USER_AUTH_SECRET);
      return json({ success: true, passwordReset: true }, 200, { "Set-Cookie": sessionCookie(token) });
    }

    if (action === "logout") {
      return json({ success: true }, 200, { "Set-Cookie": clearSessionCookie() });
    }

    return json({ error: "Unknown authentication action." }, 400);
  } catch (error) {
    console.error("User auth error", error);
    return json({ error: String(error?.message || error) }, 500);
  }
}
