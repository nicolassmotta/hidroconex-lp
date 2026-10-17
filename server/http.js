import crypto from "node:crypto";
import { JSON_LIMIT_BYTES } from "./config.js";

export function setCorsHeaders(req, res) {
  // The SPA is served from the same origin as the API, so no CORS header is
  // needed by default. Only emit one when an allowlist is explicitly set via
  // CORS_ORIGIN — avoids a wildcard / arbitrary-origin-reflecting policy.
  const configuredOrigin = process.env.CORS_ORIGIN;
  if (!configuredOrigin) return;

  const allowed = configuredOrigin
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const requestOrigin = req.headers.origin;
  const origin = requestOrigin && allowed.includes(requestOrigin) ? requestOrigin : allowed[0];

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function contentSecurityPolicy() {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "script-src 'self' https://hcaptcha.com https://*.hcaptcha.com",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://hcaptcha.com https://*.hcaptcha.com",
    "frame-src https://www.google.com https://*.google.com https://hcaptcha.com https://*.hcaptcha.com",
    "form-action 'self'",
  ].join("; ");
}

export function setSecurityHeaders(res) {
  if (!res.getHeader("Content-Security-Policy")) {
    res.setHeader("Content-Security-Policy", contentSecurityPolicy());
  }
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
}

export function sendJson(res, statusCode, payload, headers = {}) {
  const body = JSON.stringify(payload);
  setSecurityHeaders(res);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

export function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message });
}

export function clientIp(req) {
  const forwarded = req?.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req?.socket?.remoteAddress || "unknown";
}

export function ipHash(ip) {
  return crypto.createHash("sha256").update(String(ip || "unknown")).digest("hex");
}

export function statusCodeFromError(error) {
  const statusCode = Number(error?.statusCode || error?.status || 500);
  return Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599 ? statusCode : 500;
}

export async function readJsonBody(req) {
  const chunks = [];
  let totalLength = 0;

  for await (const chunk of req) {
    totalLength += chunk.length;
    if (totalLength > JSON_LIMIT_BYTES) {
      const error = new Error("Payload muito grande.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  if (!chunks.length) return {};

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("JSON inválido.");
    error.statusCode = 400;
    throw error;
  }
}
