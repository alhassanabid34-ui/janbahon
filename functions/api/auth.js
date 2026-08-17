import { sendOtp, verifyOtp, normalizeMobile } from "../lib/otp.js";

const COOKIE = "jb_passenger_session";
const SESSION_DAYS = 7;
const PBKDF2_ITERATIONS = 120000;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
  });
}

function b64(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function unb64(value) {
  const s = atob(value);
  return new Uint8Array([...s].map(c => c.charCodeAt(0)));
}

async function digestToken(token) {
  return b64(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))));
}

async function hashPassword(password, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256
  );
  return { salt: b64(salt), hash: b64(new Uint8Array(bits)) };
}

function sameBytes(a, b) {
  const aa = unb64(a), bb = unb64(b);
  if (aa.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
}

async function checkPassword(password, salt, expected) {
  const result = await hashPassword(password, unb64(salt));
  return sameBytes(result.hash, expected);
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
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS passenger_sessions (
      session_hash TEXT PRIMARY KEY,
      passenger_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL
    )
  `).run();
}

async function createSession(env, user) {
  const token = crypto.randomUUID() + crypto.randomUUID();
  const hash = await digestToken(token);
  const expires = Date.now() + SESSION_DAYS * 86400000;
  await env.DB.prepare(
    "INSERT INTO passenger_sessions (session_hash, passenger_id, expires_at, created_at) VALUES (?, ?, ?, ?)"
  ).bind(hash, user.passenger_id, expires, new Date().toISOString()).run();
  return `${COOKIE}=${token}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`;
}

async function currentUser(request, env) {
  const raw = (request.headers.get("Cookie") || "")
    .split(";")
    .map(v => v.trim())
    .find(v => v.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  if (!raw) return null;
  const hash = await digestToken(raw);
  const row = await env.DB.prepare(
    `SELECT p.passenger_id, p.mobile, p.full_name, p.created_at
     FROM passenger_sessions s JOIN passenger_accounts p ON p.passenger_id = s.passenger_id
     WHERE s.session_hash = ? AND s.expires_at > ?`
  ).bind(hash, Date.now()).first();
  return row || null;
}

function clearCookie() {
  return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

export async function onRequestGet({ request, env }) {
  try {
    await ensureDb(env);
    const user = await currentUser(request, env);
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
      const fullName = String(body?.fullName || "").trim().slice(0, 100);
      const password = String(body?.password || "");
      const code = String(body?.code || "").replace(/\D/g, "").slice(0, 6);
      if (!mobile || !fullName || password.length < 6 || code.length !== 6) {
        return json({ error: "Enter your name, valid mobile number, 6-digit OTP and a password of at least 6 characters." }, 400);
      }
      const existing = await env.DB.prepare("SELECT passenger_id FROM passenger_accounts WHERE mobile = ?").bind(mobile).first();
      if (existing) return json({ error: "An account already exists for this mobile number. Please login." }, 409);
      const otp = await verifyOtp(env, mobile, "passenger_register", code);
      if (!otp.success) return json({ error: otp.error }, otp.status || 401);
      const pw = await hashPassword(password);
      const user = {
        passenger_id: `PAX-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`,
        mobile,
        full_name: fullName
      };
      await env.DB.prepare(
        `INSERT INTO passenger_accounts (passenger_id, mobile, full_name, password_hash, password_salt, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(user.passenger_id, user.mobile, user.full_name, pw.hash, pw.salt, new Date().toISOString()).run();
      const cookie = await createSession(env, user);
      return json({ success: true, user }, 200, { "Set-Cookie": cookie });
    }

    if (action === "login-password") {
      const body = await request.json();
      const mobile = normalizeMobile(body?.mobile);
      const password = String(body?.password || "");
      const user = await env.DB.prepare(
        "SELECT passenger_id, mobile, full_name, password_hash, password_salt FROM passenger_accounts WHERE mobile = ?"
      ).bind(mobile).first();
      if (!user || !(await checkPassword(password, user.password_salt, user.password_hash))) {
        return json({ error: "Incorrect mobile number or password." }, 401);
      }
      const cookie = await createSession(env, user);
      return json({ success: true, user: { passenger_id: user.passenger_id, mobile: user.mobile, full_name: user.full_name } }, 200, { "Set-Cookie": cookie });
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
      const user = await env.DB.prepare("SELECT passenger_id, mobile, full_name FROM passenger_accounts WHERE mobile = ?").bind(mobile).first();
      if (!user) return json({ error: "Passenger account not found." }, 404);
      const cookie = await createSession(env, user);
      return json({ success: true, user }, 200, { "Set-Cookie": cookie });
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
      const password = String(body?.password || "");
      if (password.length < 6) return json({ error: "Password must be at least 6 characters." }, 400);
      const otp = await verifyOtp(env, mobile, "passenger_reset", code);
      if (!otp.success) return json({ error: otp.error }, otp.status || 401);
      const pw = await hashPassword(password);
      await env.DB.prepare("UPDATE passenger_accounts SET password_hash = ?, password_salt = ? WHERE mobile = ?").bind(pw.hash, pw.salt, mobile).run();
      return json({ success: true });
    }

    if (action === "logout") {
      const raw = (request.headers.get("Cookie") || "").split(";").map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
      if (raw) await env.DB.prepare("DELETE FROM passenger_sessions WHERE session_hash = ?").bind(await digestToken(raw)).run();
      return json({ success: true }, 200, { "Set-Cookie": clearCookie() });
    }

    return json({ error: "Unknown authentication action." }, 400);
  } catch (error) {
    console.error("Passenger auth error", error);
    return json({ error: String(error?.message || error) }, 500);
  }
}
