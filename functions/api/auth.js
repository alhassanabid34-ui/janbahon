import { sendOtp, verifyOtp, normalizeMobile } from "../lib/otp.js";

const SESSION_COOKIE = "jb_passenger_session";
const SESSION_DAYS = 7;
const PBKDF2_ITERATIONS = 120000;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders
    }
  });
}

function secret(env) {
  const value = env.PASSENGER_AUTH_SECRET || env.OWNER_AUTH_SECRET;
  if (!value) throw new Error("Passenger authentication secret is not configured.");
  return value;
}

function b64(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromB64(value) {
  const binary = atob(value);
  return new Uint8Array([...binary].map(ch => ch.charCodeAt(0)));
}

async function passwordHash(password, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256
  );
  return { salt: b64(salt), hash: b64(new Uint8Array(bits)) };
}

function safeEqual(a, b) {
  const aa = fromB64(a);
  const bb = fromB64(b);
  if (aa.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
}

async function verifyPassword(password, saltB64, expectedHash) {
  const result = await passwordHash(password, fromB64(saltB64));
  return safeEqual(result.hash, expectedHash);
}

function b64url(bytes) {
  return b64(bytes).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function b64urlString(value) {
  return b64url(new TextEncoder().encode(value));
}

function fromB64url(value) {
  const padded = String(value || "").replaceAll("-", "+").replaceAll("_", "/") + "===\";
  const clean = padded.slice(0, padded.length - (padded.length % 4));
  return fromB64(clean);
}

async function hmac(value, keySecret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(keySecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

async function makeSession(passengerId, mobile, env) {
  const payload = JSON.stringify({ passengerId, mobile, exp: Date.now() + SESSION_DAYS * 86400000 });
  const body = b64urlString(payload);
  const signature = b64url(await hmac(body, secret(env)));
  return `${body}.${signature}`;
}

async function readSession(request, env) {
  const raw = (request.headers.get("Cookie") || "")
    .split(";")
    .map(v => v.trim())
    .find(v => v.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  if (!raw) return null;
  const [body, signature] = raw.split(".");
  if (!body || !signature) return null;
  const expected = b64url(await hmac(body, secret(env)));
  if (expected !== signature) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    if (!payload.passengerId || !payload.mobile || Number(payload.exp) < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function sessionCookie(value) {
  return `${SESSION_COOKIE}=${value}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`;
}

async function ensureDb(env) {
  if (!env.DB) throw new Error("D1 database is not bound to this Pages project.");
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS passenger_accounts (
      passenger_id TEXT PRIMARY KEY,
      mobile TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `).run();
}

function cleanPassword(value) {
  return String(value || "");
}

export async function onRequestGet({ request, env }) {
  try {
    await ensureDb(env);
    const session = await readSession(request, env);
    if (!session) return json({ authenticated: false });
    const user = await env.DB.prepare(
      "SELECT passenger_id, mobile, full_name, created_at FROM passenger_accounts WHERE passenger_id = ?"
    ).bind(session.passengerId).first();
    return json({ authenticated: !!user, user: user || null });
  } catch (error) {
    return json({ error: String(error?.message || error) }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    await ensureDb(env);
    const action = new URL(request.url).searchParams.get("action");

    if (action === "register-send-otp") {
      const body = await request.json();
      const mobile = normalizeMobile(body?.mobile);
      if (!mobile) return json({ error: "Enter a valid 10-digit Indian mobile number." }, 400);
      const existing = await env.DB.prepare("SELECT passenger_id FROM passenger_accounts WHERE mobile = ?").bind(mobile).first();
      if (existing) return json({ error: "An account already exists for this mobile number. Please login." }, 409);
      const result = await sendOtp(env, mobile, "passenger_register");
      if (!result.success) return json({ error: result.error }, result.status || 400);
      return json({ success: true, mobile });
    }

    if (action === "register") {
      const body = await request.json();
      const mobile = normalizeMobile(body?.mobile);
      const name = String(body?.fullName || "").trim().slice(0, 100);
      const password = cleanPassword(body?.password);
      const code = String(body?.code || "").replace(/\D/g, "").slice(0, 6);
      if (!mobile || !name || password.length < 6 || code.length !== 6) {
        return json({ error: "Name, valid mobile number, 6-digit OTP and password of at least 6 characters are required." }, 400);
      }
      const existing = await env.DB.prepare("SELECT passenger_id FROM passenger_accounts WHERE mobile = ?").bind(mobile).first();
      if (existing) return json({ error: "An account already exists for this mobile number. Please login." }, 409);
      const otp = await verifyOtp(env, mobile, "passenger_register", code);
      if (!otp.success) return json({ error: otp.error }, otp.status || 401);
      const hashed = await passwordHash(password);
      const passengerId = `PAX-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
      await env.DB.prepare(
        `INSERT INTO passenger_accounts (passenger_id, mobile, full_name, password_hash, password_salt, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(passengerId, mobile, name, hashed.hash, hashed.salt, new Date().toISOString()).run();
      const token = await makeSession(passengerId, mobile, env);
      return json(
        { success: true, user: { passenger_id: passengerId, mobile, full_name: name } },
        200,
        { "Set-Cookie": sessionCookie(token) }
      );
    }

    if (action === "login-password") {
      const body = await request.json();
      const mobile = normalizeMobile(body?.mobile);
      const password = cleanPassword(body?.password);
      if (!mobile || !password) return json({ error: "Enter your mobile number and password." }, 400);
      const user = await env.DB.prepare(
        "SELECT passenger_id, mobile, full_name, password_hash, password_salt FROM passenger_accounts WHERE mobile = ?"
      ).bind(mobile).first();
      if (!user || !(await verifyPassword(password, user.password_salt, user.password_hash))) {
        return json({ error: "Incorrect mobile number or password." }, 401);
      }
      const token = await makeSession(user.passenger_id, user.mobile, env);
      return json(
        { success: true, user: { passenger_id: user.passenger_id, mobile: user.mobile, full_name: user.full_name } },
        200,
        { "Set-Cookie": sessionCookie(token) }
      );
    }

    if (action === "login-send-otp") {
      const body = await request.json();
      const mobile = normalizeMobile(body?.mobile);
      const user = await env.DB.prepare("SELECT passenger_id FROM passenger_accounts WHERE mobile = ?").bind(mobile).first();
      if (!user) return json({ error: "No passenger account exists for this mobile number." }, 404);
      const result = await sendOtp(env, mobile, "passenger_login");
      if (!result.success) return json({ error: result.error }, result.status || 400);
      return json({ success: true, mobile });
    }

    if (action === "login-otp") {
      const body = await request.json();
      const mobile = normalizeMobile(body?.mobile);
      const code = String(body?.code || "").replace(/\D/g, "").slice(0, 6);
      const otp = await verifyOtp(env, mobile, "passenger_login", code);
      if (!otp.success) return json({ error: otp.error }, otp.status || 401);
      const user = await env.DB.prepare(
        "SELECT passenger_id, mobile, full_name FROM passenger_accounts WHERE mobile = ?"
      ).bind(mobile).first();
      if (!user) return json({ error: "Passenger account not found." }, 404);
      const token = await makeSession(user.passenger_id, user.mobile, env);
      return json(
        { success: true, user },
        200,
        { "Set-Cookie": sessionCookie(token) }
      );
    }

    if (action === "reset-send-otp") {
      const body = await request.json();
      const mobile = normalizeMobile(body?.mobile);
      const user = await env.DB.prepare("SELECT passenger_id FROM passenger_accounts WHERE mobile = ?").bind(mobile).first();
      if (!user) return json({ error: "No passenger account exists for this mobile number." }, 404);
      const result = await sendOtp(env, mobile, "passenger_reset");
      if (!result.success) return json({ error: result.error }, result.status || 400);
      return json({ success: true, mobile });
    }

    if (action === "reset-password") {
      const body = await request.json();
      const mobile = normalizeMobile(body?.mobile);
      const code = String(body?.code || "").replace(/\D/g, "").slice(0, 6);
      const password = cleanPassword(body?.password);
      if (password.length < 6) return json({ error: "Password must be at least 6 characters." }, 400);
      const otp = await verifyOtp(env, mobile, "passenger_reset", code);
      if (!otp.success) return json({ error: otp.error }, otp.status || 401);
      const hashed = await passwordHash(password);
      await env.DB.prepare(
        "UPDATE passenger_accounts SET password_hash = ?, password_salt = ? WHERE mobile = ?"
      ).bind(hashed.hash, hashed.salt, mobile).run();
      return json({ success: true });
    }

    if (action === "logout") {
      return json(
        { success: true },
        200,
        { "Set-Cookie": `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` }
      );
    }

    return json({ error: "Unknown authentication action." }, 400);
  } catch (error) {
    console.error("Passenger auth error", error);
    return json({ error: String(error?.message || error) }, 500);
  }
}
