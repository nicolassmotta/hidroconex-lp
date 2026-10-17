import crypto from "node:crypto";
import {
  ADMIN_SESSION_COOKIE,
  LOGIN_BLOCK_MS,
  LOGIN_MAX_ATTEMPTS,
  LOGIN_WINDOW_MS,
  TOKEN_TTL_MS,
} from "./config.js";
import { db } from "./db.js";
import { clientIp, sendError } from "./http.js";

export function adminPassword() {
  return process.env.ADMIN_PASSWORD || "";
}

export function safePasswordMatch(received, expected) {
  // Constant-time comparison to avoid leaking the password through timing.
  // SHA-256 normalizes the inputs to a fixed length so timingSafeEqual never throws.
  const receivedHash = crypto.createHash("sha256").update(String(received)).digest();
  const expectedHash = crypto.createHash("sha256").update(String(expected)).digest();
  return crypto.timingSafeEqual(receivedHash, expectedHash);
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  const cookies = new Map();

  for (const entry of header.split(";")) {
    const separator = entry.indexOf("=");
    if (separator === -1) continue;

    const key = entry.slice(0, separator).trim();
    const value = entry.slice(separator + 1).trim();
    if (!key) continue;

    try {
      cookies.set(key, decodeURIComponent(value));
    } catch {
      cookies.set(key, value);
    }
  }

  return cookies;
}

function adminTokenFromRequest(req) {
  return parseCookies(req).get(ADMIN_SESSION_COOKIE) || "";
}

function sessionTokenHash(token) {
  return crypto.createHash("sha256").update(String(token)).digest("base64url");
}

function isSecureRequest(req) {
  return Boolean(
    process.env.VERCEL ||
      process.env.NODE_ENV === "production" ||
      req.headers["x-forwarded-proto"] === "https" ||
      req.socket?.encrypted,
  );
}

export function setAdminSessionCookie(req, res, token, maxAgeMs) {
  const parts = [
    `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    `Max-Age=${Math.max(0, Math.floor(maxAgeMs / 1000))}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
  ];

  if (isSecureRequest(req)) {
    parts.push("Secure");
  }

  res.setHeader("Set-Cookie", parts.join("; "));
}

export function clearAdminSessionCookie(req, res) {
  setAdminSessionCookie(req, res, "", 0);
}

export async function createAdminSession(req) {
  const token = crypto.randomBytes(32).toString("base64url");
  const now = Date.now();
  const expiresAt = new Date(now + TOKEN_TTL_MS);

  await db.adminSessions.insertOne({
    tokenHash: sessionTokenHash(token),
    createdAt: new Date(now),
    expiresAt,
    ip: clientIp(req),
    userAgent: String(req.headers["user-agent"] || "").slice(0, 300),
  });

  return { token, expiresAt };
}

export async function destroyAdminSession(req) {
  const token = adminTokenFromRequest(req);
  if (!token) return;

  await db.adminSessions.deleteOne({ tokenHash: sessionTokenHash(token) });
}

async function verifyAdminSession(token) {
  if (!token) {
    return { ok: false, status: 401, message: "Sessão inválida." };
  }

  const session = await db.adminSessions.findOne({ tokenHash: sessionTokenHash(token) });
  if (!session) {
    return { ok: false, status: 401, message: "Sessão inválida." };
  }

  if (!session.expiresAt || session.expiresAt.getTime() < Date.now()) {
    await db.adminSessions.deleteOne({ _id: session._id });
    return { ok: false, status: 401, message: "Sessão expirada." };
  }

  return { ok: true, session };
}

export async function requireAdmin(req, res) {
  const result = await verifyAdminSession(adminTokenFromRequest(req));

  if (!result.ok) {
    sendError(res, result.status, result.message);
    return false;
  }

  return true;
}

/** Returns remaining block time in ms (0 when the IP is allowed to try). */
export async function getLoginBlock(ip) {
  const doc = await db.loginAttempts.findOne({ _id: ip });
  if (doc?.blockedUntil && doc.blockedUntil > Date.now()) {
    return doc.blockedUntil - Date.now();
  }
  return 0;
}

export async function registerFailedLogin(ip) {
  const now = Date.now();
  const doc = await db.loginAttempts.findOne({ _id: ip });

  const withinWindow = doc?.windowStart && now - doc.windowStart < LOGIN_WINDOW_MS;
  const count = (withinWindow ? doc.count || 0 : 0) + 1;

  const update = {
    count,
    windowStart: withinWindow ? doc.windowStart : now,
    expireAt: new Date(now + LOGIN_WINDOW_MS + LOGIN_BLOCK_MS),
  };

  if (count >= LOGIN_MAX_ATTEMPTS) {
    update.blockedUntil = now + LOGIN_BLOCK_MS;
    update.count = 0;
    update.windowStart = now;
  }

  await db.loginAttempts.updateOne({ _id: ip }, { $set: update }, { upsert: true });
}

export async function clearLoginAttempts(ip) {
  await db.loginAttempts.deleteOne({ _id: ip });
}
