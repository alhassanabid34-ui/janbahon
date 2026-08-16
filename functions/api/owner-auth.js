import { sendOtp, verifyOtp } from "../lib/otp.js";

const SESSION_COOKIE = "jb_owner_session";
const SESSION_DAYS = 7;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extraHeaders }
  });
}

function b64url(bytes) {
  let binary = "";
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function b64urlString(value) {
  return b64url(new TextEncoder().encode(value));
}

function fromB64url(value) {
  const padded = String(value || "").replaceAll("-", "+").replaceAll("_", "/") + "===";
  const binary = atob(padded.slice(0, padded.length - (padded.length % 4)));
  return new Uint8Array([...binary].map(ch => ch.charCodeAt(0)));
}

async function hmac(value, secret) {
  if (!secret) throw new Error("OWNER_AUTH_SECRET is not configured.");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

async function makeSession(mobile, secret, pending = false) {
  const payload = JSON.stringify({ mobile, pending, exp: Date.now() + SESSION_DAYS * 86400000 });
  const body = b64urlString(payload);
  const signature = b64url(await hmac(body, secret));
  return `${body}.${signature}`;
}

async function readSession(request, secret) {
  const cookie = request.headers.get("Cookie") || "";
  const raw = cookie.split(";").map(v => v.trim()).find(v => v.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  if (!raw || !secret) return null;
  const [body, signature] = raw.split(".");
  if (!body || !signature) return null;
  const expected = b64url(await hmac(body, secret));
  if (expected !== signature) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    if (!payload.mobile || !payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function sessionCookie(value) {
  return `${SESSION_COOKIE}=${value}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`;
}

function requireDb(env) {
  if (!env.DB) throw new Error("D1 database is not bound yet.");
}

async function encryptText(value, secret) {
  if (!secret) throw new Error("OWNER_DATA_KEY is not configured.");
  const rawKey = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  const key = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(value)));
  return `${b64url(iv)}.${b64url(ciphertext)}`;
}

async function storeKycFile(env, file, key, maxBytes) {
  if (!env.MEDIA) throw new Error("R2 MEDIA binding is not configured.");
  if (!(file instanceof File) || file.size < 1) throw new Error("Required document is missing.");
  if (file.size > maxBytes) throw new Error("Document is too large.");
  const allowed = new Set(["application/pdf", "image/jpeg", "image/png"]);
  if (!allowed.has(file.type)) throw new Error("Aadhaar/PAN must be PDF, JPG or PNG.");
  await env.MEDIA.put(key, file, { httpMetadata: { contentType: file.type, contentDisposition: "attachment" } });
  return key;
}

export async function onRequestGet({ request, env }) {
  try {
    requireDb(env);
    const session = await readSession(request, env.OWNER_AUTH_SECRET);
    if (!session) return json({ authenticated: false });
    const owner = await env.DB.prepare(
      `SELECT owner_id, mobile, full_name, business_name, address, bank_ifsc, bank_holder, status, created_at
       FROM owners WHERE mobile = ?`
    ).bind(session.mobile).first();
    return json({ authenticated: !!owner, owner: owner || null, pendingRegistration: !owner });
  } catch (error) {
    return json({ error: String(error?.message || error) }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    requireDb(env);
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (action === "send-otp") {
      const body = await request.json();
      const result = await sendOtp(env, body?.mobile, "owner_login");
      if (!result.success) return json({ error: result.error }, result.status || 400);
      return json({ success: true, mobile: result.mobile });
    }

    if (action === "verify-otp") {
      const body = await request.json();
      const result = await verifyOtp(env, body?.mobile, "owner_login", body?.code);
      if (!result.success) return json({ error: result.error }, result.status || 400);
      const mobile = result.mobile;
      const owner = await env.DB.prepare("SELECT owner_id, full_name, business_name, status FROM owners WHERE mobile = ?").bind(mobile).first();
      const token = await makeSession(mobile, env.OWNER_AUTH_SECRET, !owner);
      return json({ success: true, registered: !!owner, owner: owner || null }, 200, { "Set-Cookie": sessionCookie(token) });
    }

    if (action === "register") {
      const session = await readSession(request, env.OWNER_AUTH_SECRET);
      if (!session) return json({ error: "Please verify your mobile number first." }, 401);
      const form = await request.formData();
      const fullName = String(form.get("fullName") || "").trim().slice(0, 100);
      const businessName = String(form.get("businessName") || "").trim().slice(0, 120);
      const address = String(form.get("address") || "").trim().slice(0, 300);
      const bankHolder = String(form.get("bankHolder") || "").trim().slice(0, 100);
      const bankAccount = String(form.get("bankAccount") || "").replace(/\s/g, "").slice(0, 30);
      const bankIfsc = String(form.get("bankIfsc") || "").trim().toUpperCase().slice(0, 11);
      const aadhaar = form.get("aadhaar");
      const pan = form.get("pan");
      if (!fullName || !businessName || !address || !bankHolder || !/^\d{9,30}$/.test(bankAccount) || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankIfsc)) {
        return json({ error: "Please complete all owner and bank details correctly." }, 400);
      }
      if (!(aadhaar instanceof File) || !(pan instanceof File)) return json({ error: "Aadhaar and PAN documents are required." }, 400);
      const ownerId = `OWN-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
      const aadhaarKey = await storeKycFile(env, aadhaar, `kyc/${ownerId}/aadhaar-${crypto.randomUUID()}`, 5 * 1024 * 1024);
      const panKey = await storeKycFile(env, pan, `kyc/${ownerId}/pan-${crypto.randomUUID()}`, 5 * 1024 * 1024);
      const bankAccountEnc = await encryptText(bankAccount, env.OWNER_DATA_KEY);
      await env.DB.prepare(
        `INSERT INTO owners (owner_id, mobile, full_name, business_name, address, aadhaar_doc_key, pan_doc_key, bank_account_enc, bank_ifsc, bank_holder, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
      ).bind(ownerId, session.mobile, fullName, businessName, address, aadhaarKey, panKey, bankAccountEnc, bankIfsc, bankHolder, new Date().toISOString()).run();
      return json({ success: true, ownerId, status: "pending" });
    }

    if (action === "logout") {
      return json({ success: true }, 200, { "Set-Cookie": `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (error) {
    console.error("Owner auth error", error);
    return json({ error: String(error?.message || error) }, 500);
  }
}
