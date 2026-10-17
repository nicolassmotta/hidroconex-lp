import crypto from "node:crypto";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GridFSBucket, MongoClient, ObjectId } from "mongodb";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "dist");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const LEGACY_JSON_FILE = path.join(__dirname, "data", "catalog.json");
// Mesmo roteamento do vercel.json: HTML gerado no build, app-shell para /admin e
// produtos criados depois do build, 404.html (status 404) para o resto.
const APP_SHELL_FILE = "app-shell.html";
const NOT_FOUND_FILE = "404.html";

loadEnv(path.join(ROOT_DIR, ".env"));

const PORT = Number(process.env.PORT || 3333);
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "hidroconex";
const CONFIGURED_TOKEN_TTL_HOURS = Number(process.env.ADMIN_TOKEN_TTL_HOURS || 8);
const TOKEN_TTL_HOURS =
  Number.isFinite(CONFIGURED_TOKEN_TTL_HOURS) && CONFIGURED_TOKEN_TTL_HOURS > 0
    ? CONFIGURED_TOKEN_TTL_HOURS
    : 8;
const TOKEN_TTL_MS = TOKEN_TTL_HOURS * 60 * 60 * 1000;
const DEFAULT_IMAGE_LIMIT_MB = process.env.VERCEL ? 3 : 8;
const CONFIGURED_IMAGE_LIMIT_MB = Number(process.env.IMAGE_LIMIT_MB || DEFAULT_IMAGE_LIMIT_MB);
const IMAGE_LIMIT_MB =
  Number.isFinite(CONFIGURED_IMAGE_LIMIT_MB) && CONFIGURED_IMAGE_LIMIT_MB > 0
    ? CONFIGURED_IMAGE_LIMIT_MB
    : DEFAULT_IMAGE_LIMIT_MB;
const CONFIGURED_JSON_LIMIT_MB = Number(process.env.JSON_BODY_LIMIT_MB || IMAGE_LIMIT_MB + 2);
const JSON_LIMIT_MB =
  Number.isFinite(CONFIGURED_JSON_LIMIT_MB) && CONFIGURED_JSON_LIMIT_MB > 0
    ? CONFIGURED_JSON_LIMIT_MB
    : IMAGE_LIMIT_MB + 2;
const JSON_LIMIT_BYTES = JSON_LIMIT_MB * 1024 * 1024;
const IMAGE_LIMIT_BYTES = IMAGE_LIMIT_MB * 1024 * 1024;
const CONFIGURED_LOGIN_MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS || 8);
const LOGIN_MAX_ATTEMPTS =
  Number.isFinite(CONFIGURED_LOGIN_MAX_ATTEMPTS) && CONFIGURED_LOGIN_MAX_ATTEMPTS > 0
    ? CONFIGURED_LOGIN_MAX_ATTEMPTS
    : 8;
const CONFIGURED_LOGIN_WINDOW_MIN = Number(process.env.LOGIN_WINDOW_MIN || 15);
const LOGIN_WINDOW_MS =
  (Number.isFinite(CONFIGURED_LOGIN_WINDOW_MIN) && CONFIGURED_LOGIN_WINDOW_MIN > 0
    ? CONFIGURED_LOGIN_WINDOW_MIN
    : 15) *
  60 *
  1000;
const CONFIGURED_LOGIN_BLOCK_MIN = Number(process.env.LOGIN_BLOCK_MIN || 15);
const LOGIN_BLOCK_MS =
  (Number.isFinite(CONFIGURED_LOGIN_BLOCK_MIN) && CONFIGURED_LOGIN_BLOCK_MIN > 0
    ? CONFIGURED_LOGIN_BLOCK_MIN
    : 15) *
  60 *
  1000;
const CONFIGURED_CONTACT_MAX_ATTEMPTS = Number(process.env.CONTACT_MAX_ATTEMPTS || 5);
const CONTACT_MAX_ATTEMPTS =
  Number.isFinite(CONFIGURED_CONTACT_MAX_ATTEMPTS) && CONFIGURED_CONTACT_MAX_ATTEMPTS > 0
    ? CONFIGURED_CONTACT_MAX_ATTEMPTS
    : 5;
const CONFIGURED_CONTACT_WINDOW_MIN = Number(process.env.CONTACT_WINDOW_MIN || 10);
const CONTACT_WINDOW_MS =
  (Number.isFinite(CONFIGURED_CONTACT_WINDOW_MIN) && CONFIGURED_CONTACT_WINDOW_MIN > 0
    ? CONFIGURED_CONTACT_WINDOW_MIN
    : 10) *
  60 *
  1000;
const CONFIGURED_CONTACT_BLOCK_MIN = Number(process.env.CONTACT_BLOCK_MIN || 20);
const CONTACT_BLOCK_MS =
  (Number.isFinite(CONFIGURED_CONTACT_BLOCK_MIN) && CONFIGURED_CONTACT_BLOCK_MIN > 0
    ? CONFIGURED_CONTACT_BLOCK_MIN
    : 20) *
  60 *
  1000;
const ADMIN_SESSION_COOKIE = "hidroconex_admin_session";
const MODEL_MAX_LENGTH = 120;
const DESCRIPTION_MAX_LENGTH = 1000;
const CONTACT_NAME_MAX_LENGTH = 120;
const CONTACT_PHONE_MAX_LENGTH = 40;
const CONTACT_EMAIL_MAX_LENGTH = 160;
const CONTACT_MESSAGE_MAX_LENGTH = 2000;
const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";
const CONFIGURED_FAILURE_EVENT_TTL_DAYS = Number(process.env.FAILURE_EVENT_TTL_DAYS || 14);
const FAILURE_EVENT_TTL_DAYS =
  Number.isFinite(CONFIGURED_FAILURE_EVENT_TTL_DAYS) && CONFIGURED_FAILURE_EVENT_TTL_DAYS > 0
    ? Math.min(CONFIGURED_FAILURE_EVENT_TTL_DAYS, 90)
    : 14;
const FAILURE_EVENT_TTL_MS = FAILURE_EVENT_TTL_DAYS * 24 * 60 * 60 * 1000;
const FAILURE_EVENT_MESSAGE_MAX_LENGTH = 500;
const FAILURE_EVENT_STACK_MAX_LENGTH = 2000;

const CATEGORY_MAP = {
  "rm-luvas": { mainCategory: "Reservatórios Metálicos", subCategory: "Luvas" },
  "rm-niples": { mainCategory: "Reservatórios Metálicos", subCategory: "Niples" },
  "ts-juntas": { mainCategory: "Tanques Subterrâneos", subCategory: "Juntas" },
  "ts-luvas": { mainCategory: "Tanques Subterrâneos", subCategory: "Luvas" },
  "ts-niples": { mainCategory: "Tanques Subterrâneos", subCategory: "Niples" },
  "ts-plugs": { mainCategory: "Tanques Subterrâneos", subCategory: "Plugs" },
  "ts-filtros": { mainCategory: "Tanques Subterrâneos", subCategory: "Filtros" },
};

const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

let mongoClient;
let database;
let productsCollection;
let settingsCollection;
let imagesBucket;
let loginAttemptsCollection;
let adminSessionsCollection;
let contactAttemptsCollection;
let failureEventsCollection;
let databaseReadyPromise;

function loadEnv(filePath) {
  if (!fsSync.existsSync(filePath)) return;

  const content = fsSync.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function setCorsHeaders(req, res) {
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
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://hcaptcha.com https://*.hcaptcha.com",
    "frame-src https://www.google.com https://*.google.com https://hcaptcha.com https://*.hcaptcha.com",
    "form-action 'self'",
  ].join("; ");
}

function setSecurityHeaders(res) {
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

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  setSecurityHeaders(res);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message });
}

function cleanText(value) {
  if (!value) return "";
  if (!/[ÃÂ]/.test(value)) return value;

  try {
    const bytes = Uint8Array.from(String(value), (character) => character.charCodeAt(0) & 0xff);
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    return decoded.includes("�") ? String(value) : decoded;
  } catch {
    return String(value);
  }
}

function adminPassword() {
  return process.env.ADMIN_PASSWORD || "";
}

function safePasswordMatch(received, expected) {
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

function setAdminSessionCookie(req, res, token, maxAgeMs) {
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

function clearAdminSessionCookie(req, res) {
  setAdminSessionCookie(req, res, "", 0);
}

async function createAdminSession(req) {
  const token = crypto.randomBytes(32).toString("base64url");
  const now = Date.now();
  const expiresAt = new Date(now + TOKEN_TTL_MS);

  await adminSessionsCollection.insertOne({
    tokenHash: sessionTokenHash(token),
    createdAt: new Date(now),
    expiresAt,
    ip: clientIp(req),
    userAgent: String(req.headers["user-agent"] || "").slice(0, 300),
  });

  return { token, expiresAt };
}

async function destroyAdminSession(req) {
  const token = adminTokenFromRequest(req);
  if (!token) return;

  await adminSessionsCollection.deleteOne({ tokenHash: sessionTokenHash(token) });
}

async function verifyAdminSession(token) {
  if (!token) {
    return { ok: false, status: 401, message: "Sessão inválida." };
  }

  const session = await adminSessionsCollection.findOne({ tokenHash: sessionTokenHash(token) });
  if (!session) {
    return { ok: false, status: 401, message: "Sessão inválida." };
  }

  if (!session.expiresAt || session.expiresAt.getTime() < Date.now()) {
    await adminSessionsCollection.deleteOne({ _id: session._id });
    return { ok: false, status: 401, message: "Sessão expirada." };
  }

  return { ok: true, session };
}

async function requireAdmin(req, res) {
  const result = await verifyAdminSession(adminTokenFromRequest(req));

  if (!result.ok) {
    sendError(res, result.status, result.message);
    return false;
  }

  return true;
}

function clientIp(req) {
  const forwarded = req?.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req?.socket?.remoteAddress || "unknown";
}

function truncateText(value, maxLength) {
  const text = String(value || "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function ipHash(ip) {
  return crypto.createHash("sha256").update(String(ip || "unknown")).digest("hex");
}

function statusCodeFromError(error) {
  const statusCode = Number(error?.statusCode || error?.status || 500);
  return Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599 ? statusCode : 500;
}

function validateFailurePayload(payload) {
  payload = payload && typeof payload === "object" ? payload : {};
  const message = truncateText(payload.message, FAILURE_EVENT_MESSAGE_MAX_LENGTH);
  if (!message) return { ok: false, message: "Informe a mensagem da falha." };

  const severity = payload.severity === "warning" ? "warning" : "error";

  return {
    ok: true,
    event: {
      source: "frontend",
      severity,
      type: truncateText(payload.type || "runtime", 80) || "runtime",
      message,
      stack: truncateText(payload.stack, FAILURE_EVENT_STACK_MAX_LENGTH),
      route: truncateText(payload.route, 240),
      component: truncateText(payload.component, 120),
    },
  };
}

function serializeFailureEvent(event) {
  return {
    id: String(event._id),
    source: event.source || "api",
    severity: event.severity || "error",
    type: event.type || "exception",
    method: event.method || "",
    route: event.route || "",
    statusCode: event.statusCode || null,
    message: event.message || "",
    stack: event.stack || "",
    component: event.component || "",
    userAgent: event.userAgent || "",
    createdAt: event.createdAt?.toISOString?.() || event.createdAt,
  };
}

async function recordFailureEvent(req, event) {
  if (!failureEventsCollection) return;

  const now = new Date();
  const document = {
    source: event.source || "api",
    severity: event.severity || "error",
    type: event.type || "exception",
    method: event.method || req?.method || "",
    route: truncateText(event.route || "", 240),
    statusCode: event.statusCode || null,
    message: truncateText(event.message, FAILURE_EVENT_MESSAGE_MAX_LENGTH),
    stack: truncateText(event.stack, FAILURE_EVENT_STACK_MAX_LENGTH),
    component: truncateText(event.component, 120),
    userAgent: truncateText(req?.headers?.["user-agent"], 300),
    ipHash: ipHash(clientIp(req || {})),
    createdAt: now,
    expireAt: new Date(now.getTime() + FAILURE_EVENT_TTL_MS),
  };

  try {
    await failureEventsCollection.insertOne(document);
  } catch (error) {
    console.warn("Não foi possível registrar falha:", error.message);
  }
}

async function failureSummary(limit = 20) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000);
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const visibleFailures = { type: { $ne: "smoke-test" } };

  const [events, count24h, count7d] = await Promise.all([
    failureEventsCollection.find(visibleFailures).sort({ createdAt: -1 }).limit(safeLimit).toArray(),
    failureEventsCollection.countDocuments({ ...visibleFailures, createdAt: { $gte: since24h } }),
    failureEventsCollection.countDocuments({ ...visibleFailures, createdAt: { $gte: since7d } }),
  ]);

  return {
    ttlDays: FAILURE_EVENT_TTL_DAYS,
    count24h,
    count7d,
    lastFailureAt: events[0]?.createdAt?.toISOString?.() || null,
    events: events.map(serializeFailureEvent),
  };
}

/** Returns remaining block time in ms (0 when the IP is allowed to try). */
async function getLoginBlock(ip) {
  const doc = await loginAttemptsCollection.findOne({ _id: ip });
  if (doc?.blockedUntil && doc.blockedUntil > Date.now()) {
    return doc.blockedUntil - Date.now();
  }
  return 0;
}

async function registerFailedLogin(ip) {
  const now = Date.now();
  const doc = await loginAttemptsCollection.findOne({ _id: ip });

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

  await loginAttemptsCollection.updateOne({ _id: ip }, { $set: update }, { upsert: true });
}

async function clearLoginAttempts(ip) {
  await loginAttemptsCollection.deleteOne({ _id: ip });
}

async function getContactBlock(ip) {
  const doc = await contactAttemptsCollection.findOne({ _id: ip });
  if (doc?.blockedUntil && doc.blockedUntil > Date.now()) {
    return doc.blockedUntil - Date.now();
  }
  return 0;
}

async function registerContactAttempt(ip) {
  const now = Date.now();
  const doc = await contactAttemptsCollection.findOne({ _id: ip });
  const withinWindow = doc?.windowStart && now - doc.windowStart < CONTACT_WINDOW_MS;
  const count = (withinWindow ? doc.count || 0 : 0) + 1;

  const update = {
    count,
    windowStart: withinWindow ? doc.windowStart : now,
    expireAt: new Date(now + CONTACT_WINDOW_MS + CONTACT_BLOCK_MS),
  };

  if (count >= CONTACT_MAX_ATTEMPTS) {
    update.blockedUntil = now + CONTACT_BLOCK_MS;
    update.count = 0;
    update.windowStart = now;
  }

  await contactAttemptsCollection.updateOne({ _id: ip }, { $set: update }, { upsert: true });
}

function sanitizeContactText(value) {
  return String(value || "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim();
}

function isValidContactEmail(value) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateContactPayload(payload) {
  const name = sanitizeContactText(payload.name);
  const phone = sanitizeContactText(payload.phone);
  const email = sanitizeContactText(payload.email).toLowerCase();
  const message = sanitizeContactText(payload.message);
  const captchaToken = sanitizeContactText(payload.captchaToken || payload["h-captcha-response"]);

  if (!name) return { ok: false, message: "Informe seu nome." };
  if (name.length > CONTACT_NAME_MAX_LENGTH) {
    return { ok: false, message: `Nome muito longo. Use até ${CONTACT_NAME_MAX_LENGTH} caracteres.` };
  }

  if (!phone) return { ok: false, message: "Informe um telefone para contato." };
  if (phone.length > CONTACT_PHONE_MAX_LENGTH) {
    return {
      ok: false,
      message: `Telefone muito longo. Use até ${CONTACT_PHONE_MAX_LENGTH} caracteres.`,
    };
  }

  if (email.length > CONTACT_EMAIL_MAX_LENGTH || !isValidContactEmail(email)) {
    return { ok: false, message: "Informe um e-mail válido ou deixe o campo vazio." };
  }

  if (!message) return { ok: false, message: "Descreva o que você precisa." };
  if (message.length > CONTACT_MESSAGE_MAX_LENGTH) {
    return {
      ok: false,
      message: `Mensagem muito longa. Use até ${CONTACT_MESSAGE_MAX_LENGTH} caracteres.`,
    };
  }

  if (!captchaToken) return { ok: false, message: "Confirme o captcha antes de enviar." };

  return {
    ok: true,
    contact: {
      name,
      phone,
      email,
      message,
      captchaToken,
    },
  };
}

function web3FormsAccessKey() {
  return process.env.WEB3FORMS_ACCESS_KEY || process.env.VITE_WEB3FORMS_ACCESS_KEY || "";
}

async function submitContactToWeb3Forms(contact) {
  const accessKey = web3FormsAccessKey();
  if (!accessKey) {
    const error = new Error("WEB3FORMS_ACCESS_KEY não configurado no backend.");
    error.statusCode = 500;
    throw error;
  }

  const response = await fetch(WEB3FORMS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      access_key: accessKey,
      subject: "Novo contato pelo site Hidroconex",
      from_name: contact.name,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      message: contact.message,
      "h-captcha-response": contact.captchaToken,
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || data?.success !== true) {
    const error = new Error(
      typeof data?.message === "string"
        ? data.message
        : "Não foi possível enviar sua solicitação agora.",
    );
    error.statusCode = response.ok ? 502 : response.status;
    throw error;
  }

  return data;
}

async function readJsonBody(req) {
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

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function makeProductId(categoryId, model, currentId) {
  const base = `${categoryId}-${slugify(model) || crypto.randomUUID().slice(0, 8)}`;
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existingProduct = await productsCollection.findOne({ id: candidate });
    if (!existingProduct || existingProduct.id === currentId) {
      return candidate;
    }

    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

function toDate(value, fallback = new Date()) {
  if (value instanceof Date) return value;
  if (!value) return fallback;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function toObjectId(value) {
  if (!value) return null;
  if (value instanceof ObjectId) return value;
  if (ObjectId.isValid(String(value))) return new ObjectId(String(value));
  return null;
}

function normalizeProductForStorage(product) {
  const category = CATEGORY_MAP[product.categoryId];
  const now = new Date();

  return {
    id: String(product.id),
    categoryId: String(product.categoryId),
    mainCategory: category?.mainCategory || cleanText(product.mainCategory),
    subCategory: category?.subCategory || cleanText(product.subCategory),
    model: cleanText(product.model),
    importPath: product.importPath || "",
    imageUrl: product.imageUrl || "",
    imageId: toObjectId(product.imageId),
    description: cleanText(product.description),
    createdAt: toDate(product.createdAt, now),
    updatedAt: toDate(product.updatedAt, now),
  };
}

function serializeProduct(product) {
  const imageId = toObjectId(product.imageId);

  return {
    id: product.id,
    categoryId: product.categoryId,
    mainCategory: product.mainCategory,
    subCategory: product.subCategory,
    model: product.model,
    importPath: product.importPath || "",
    imageUrl: imageId ? `/api/catalog/images/${imageId.toString()}` : product.imageUrl || "",
    description: product.description || "",
    createdAt: toDate(product.createdAt).toISOString(),
    updatedAt: toDate(product.updatedAt).toISOString(),
  };
}

async function loadCatalogFromJsonFile() {
  if (!fsSync.existsSync(LEGACY_JSON_FILE)) return [];

  try {
    const content = await fs.readFile(LEGACY_JSON_FILE, "utf8");
    const parsed = JSON.parse(content);
    const products = Array.isArray(parsed.products) ? parsed.products : [];
    return products.map(normalizeProductForStorage);
  } catch (error) {
    console.warn("Não foi possível importar o catálogo JSON antigo:", error.message);
    return [];
  }
}

async function loadCatalogFromStaticFile() {
  const legacyPath = path.join(ROOT_DIR, "src", "data", "catalog.ts");

  try {
    const source = await fs.readFile(legacyPath, "utf8");
    const markerIndex = source.indexOf("export const catalogData");
    if (markerIndex === -1) return [];

    const afterMarker = source.slice(markerIndex);
    const assignmentIndex = afterMarker.indexOf("=");
    const arrayStart = afterMarker.indexOf("[", assignmentIndex);
    const arrayEnd = afterMarker.lastIndexOf("];");
    if (assignmentIndex === -1 || arrayStart === -1 || arrayEnd === -1) return [];

    const jsonText = afterMarker.slice(arrayStart, arrayEnd + 1);
    const items = JSON.parse(jsonText);
    const timestamp = new Date();

    return items.map((item) =>
      normalizeProductForStorage({
        ...item,
        imageUrl: "",
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    );
  } catch (error) {
    console.warn("Não foi possível importar o catálogo estático:", error.message);
    return [];
  }
}

async function loadSeedCatalog() {
  const jsonProducts = await loadCatalogFromJsonFile();
  if (jsonProducts.length) return jsonProducts;

  return loadCatalogFromStaticFile();
}

async function seedCatalogIfNeeded() {
  const seedSetting = await settingsCollection.findOne({ key: "legacyCatalogSeeded" });
  if (seedSetting) return;

  const currentCount = await productsCollection.countDocuments();
  if (currentCount > 0) {
    await settingsCollection.updateOne(
      { key: "legacyCatalogSeeded" },
      { $set: { value: true, seededAt: new Date(), skippedBecauseProductsExist: true } },
      { upsert: true },
    );
    return;
  }

  const products = await loadSeedCatalog();
  if (products.length) {
    await productsCollection.insertMany(products, { ordered: false });
  }

  await settingsCollection.updateOne(
    { key: "legacyCatalogSeeded" },
    { $set: { value: true, seededAt: new Date(), productCount: products.length } },
    { upsert: true },
  );
}

async function connectDatabase() {
  if (productsCollection) return;

  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: Number(process.env.MONGODB_TIMEOUT_MS || 5000),
  });

  await client.connect();
  mongoClient = client;
  database = client.db(MONGODB_DB_NAME);
  productsCollection = database.collection("products");
  settingsCollection = database.collection("settings");
  imagesBucket = new GridFSBucket(database, { bucketName: "productImages" });
  loginAttemptsCollection = database.collection("loginAttempts");
  adminSessionsCollection = database.collection("adminSessions");
  contactAttemptsCollection = database.collection("contactAttempts");
  failureEventsCollection = database.collection("failureEvents");

  await productsCollection.createIndex({ id: 1 }, { unique: true });
  await productsCollection.createIndex({ categoryId: 1, model: 1 });
  await productsCollection.createIndex({ mainCategory: 1, subCategory: 1, model: 1 });
  await settingsCollection.createIndex({ key: 1 }, { unique: true });
  // TTL index: stale login-attempt records auto-expire so the collection
  // never grows unbounded.
  await loginAttemptsCollection.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 });
  await adminSessionsCollection.createIndex({ tokenHash: 1 }, { unique: true });
  await adminSessionsCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await contactAttemptsCollection.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 });
  await failureEventsCollection.createIndex({ createdAt: -1 });
  await failureEventsCollection.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 });
  await seedCatalogIfNeeded();
}

async function ensureDatabase() {
  if (productsCollection) return;

  if (!databaseReadyPromise) {
    databaseReadyPromise = connectDatabase().catch((error) => {
      databaseReadyPromise = undefined;
      throw error;
    });
  }

  await databaseReadyPromise;
}

async function readCatalog() {
  const products = await productsCollection
    .find({})
    .sort({ mainCategory: 1, subCategory: 1, model: 1 })
    .toArray();

  return products.map(serializeProduct);
}

function validateProductPayload(payload, options = {}) {
  const category = CATEGORY_MAP[payload.categoryId];
  if (!category) {
    return { ok: false, message: "Categoria inválida." };
  }

  const model = String(payload.model || "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();
  if (!model) {
    return { ok: false, message: "Informe o modelo do produto." };
  }

  if (model.length > MODEL_MAX_LENGTH) {
    return { ok: false, message: `Modelo muito longo. Use até ${MODEL_MAX_LENGTH} caracteres.` };
  }

  const description = String(payload.description || "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim();
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    return {
      ok: false,
      message: `Descrição muito longa. Use até ${DESCRIPTION_MAX_LENGTH} caracteres.`,
    };
  }

  if (options.requireImage && !payload.image?.data) {
    return { ok: false, message: "Envie uma imagem para o produto." };
  }

  return {
    ok: true,
    product: {
      categoryId: payload.categoryId,
      mainCategory: category.mainCategory,
      subCategory: category.subCategory,
      model,
      description,
    },
  };
}

function safeUploadName(filename, extension) {
  const baseName = path.basename(filename || "produto").replace(/\.[^.]+$/, "");
  const safeBaseName = slugify(baseName) || "produto";
  return `${Date.now()}-${crypto.randomUUID()}-${safeBaseName}.${extension}`;
}

function decodeBase64Image(data) {
  const rawData = String(data || "")
    .replace(/^data:[^,]+,/, "")
    .replace(/\s/g, "");

  if (!rawData || rawData.length % 4 === 1 || !/^[A-Za-z0-9+/]+={0,2}$/.test(rawData)) {
    const error = new Error("Imagem inválida.");
    error.statusCode = 400;
    throw error;
  }

  return Buffer.from(rawData, "base64");
}

function detectImageType(buffer) {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer.toString("ascii", 1, 4) === "PNG" &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { contentType: "image/png", extension: "png" };
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { contentType: "image/webp", extension: "webp" };
  }

  return null;
}

function stripJpegMetadata(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return buffer;

  const chunks = [buffer.subarray(0, 2)];
  let offset = 2;

  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff) {
      chunks.push(buffer.subarray(offset));
      return Buffer.concat(chunks);
    }

    const marker = buffer[offset + 1];
    if (marker === 0xda || marker === 0xd9) {
      chunks.push(buffer.subarray(offset));
      return Buffer.concat(chunks);
    }

    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      chunks.push(buffer.subarray(offset, offset + 2));
      offset += 2;
      continue;
    }

    const segmentLength = buffer.readUInt16BE(offset + 2);
    const segmentEnd = offset + 2 + segmentLength;
    if (segmentLength < 2 || segmentEnd > buffer.length) return buffer;

    const isMetadataSegment = marker === 0xe1 || marker === 0xed || marker === 0xfe;
    if (!isMetadataSegment) {
      chunks.push(buffer.subarray(offset, segmentEnd));
    }

    offset = segmentEnd;
  }

  return Buffer.concat(chunks);
}

function stripPngMetadata(buffer) {
  const signature = buffer.subarray(0, 8);
  const chunks = [signature];
  const metadataChunks = new Set(["tEXt", "zTXt", "iTXt", "tIME", "eXIf"]);
  let offset = 8;

  while (offset + 12 <= buffer.length) {
    const chunkLength = buffer.readUInt32BE(offset);
    const chunkType = buffer.toString("ascii", offset + 4, offset + 8);
    const chunkEnd = offset + 12 + chunkLength;
    if (chunkEnd > buffer.length) return buffer;

    if (!metadataChunks.has(chunkType)) {
      chunks.push(buffer.subarray(offset, chunkEnd));
    }

    offset = chunkEnd;
    if (chunkType === "IEND") break;
  }

  return Buffer.concat(chunks);
}

function stripWebpMetadata(buffer) {
  const chunks = [];
  let offset = 12;
  let changed = false;

  while (offset + 8 <= buffer.length) {
    const chunkType = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkEnd = offset + 8 + chunkSize;
    const paddedEnd = chunkEnd + (chunkSize % 2);
    if (chunkEnd > buffer.length || paddedEnd > buffer.length) return buffer;

    if (chunkType === "EXIF" || chunkType === "XMP ") {
      changed = true;
    } else {
      chunks.push(buffer.subarray(offset, paddedEnd));
    }

    offset = paddedEnd;
  }

  if (!changed) return buffer;

  const riffSize = 4 + chunks.reduce((total, chunk) => total + chunk.length, 0);
  const header = Buffer.from(buffer.subarray(0, 12));
  header.writeUInt32LE(riffSize, 4);
  return Buffer.concat([header, ...chunks]);
}

function stripImageMetadata(buffer, contentType) {
  if (contentType === "image/jpeg") return stripJpegMetadata(buffer);
  if (contentType === "image/png") return stripPngMetadata(buffer);
  if (contentType === "image/webp") return stripWebpMetadata(buffer);
  return buffer;
}

async function writeUploadedImage(image) {
  if (!image?.data) return null;

  const claimedContentType = String(image.contentType || "").toLowerCase();
  if (!IMAGE_TYPES[claimedContentType]) {
    const error = new Error("Formato de imagem inválido. Use PNG, JPG ou WebP.");
    error.statusCode = 400;
    throw error;
  }

  let buffer = decodeBase64Image(image.data);
  if (!buffer.length) {
    const error = new Error("Arquivo de imagem vazio.");
    error.statusCode = 400;
    throw error;
  }

  if (buffer.length > IMAGE_LIMIT_BYTES) {
    const error = new Error(`Imagem muito grande. Limite atual: ${IMAGE_LIMIT_MB} MB.`);
    error.statusCode = 413;
    throw error;
  }

  const detectedType = detectImageType(buffer);
  if (!detectedType || detectedType.contentType !== claimedContentType) {
    const error = new Error("O conteúdo da imagem não corresponde ao formato enviado.");
    error.statusCode = 400;
    throw error;
  }

  buffer = stripImageMetadata(buffer, detectedType.contentType);

  return new Promise((resolve, reject) => {
    const uploadStream = imagesBucket.openUploadStream(safeUploadName(image.filename, detectedType.extension), {
      contentType: detectedType.contentType,
      metadata: {
        originalName: image.filename || "",
        contentType: detectedType.contentType,
        uploadedAt: new Date(),
      },
    });

    uploadStream.on("finish", () => resolve(uploadStream.id));
    uploadStream.on("error", reject);
    uploadStream.end(buffer);
  });
}

async function deleteUploadedImage(imageId) {
  const objectId = toObjectId(imageId);
  if (!objectId) return;

  try {
    await imagesBucket.delete(objectId);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn("Não foi possível remover imagem antiga:", error.message);
    }
  }
}

async function streamCatalogImage(res, imageId) {
  const objectId = toObjectId(imageId);
  if (!objectId) {
    sendError(res, 404, "Imagem não encontrada.");
    return;
  }

  const file = await database.collection("productImages.files").findOne({ _id: objectId });
  if (!file) {
    sendError(res, 404, "Imagem não encontrada.");
    return;
  }

  setSecurityHeaders(res);
  res.writeHead(200, {
    "Content-Type": file.contentType || file.metadata?.contentType || "application/octet-stream",
    "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
  });

  imagesBucket.openDownloadStream(objectId).pipe(res);
}

async function handleApi(req, res, pathname) {
  if (req.method === "GET" && pathname === "/api/health") {
    sendJson(res, 200, {
      ok: true,
      service: "hidroconex-api",
      dbName: MONGODB_DB_NAME,
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/ready") {
    const productCount = await productsCollection.countDocuments();
    sendJson(res, 200, {
      ok: true,
      service: "hidroconex-api",
      database: "mongodb",
      dbName: MONGODB_DB_NAME,
      productCount,
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/config") {
    sendJson(res, 200, {
      imageLimitMb: IMAGE_LIMIT_MB,
      modelMaxLength: MODEL_MAX_LENGTH,
      descriptionMaxLength: DESCRIPTION_MAX_LENGTH,
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/monitoring/failures") {
    const payload = await readJsonBody(req);
    const validation = validateFailurePayload(payload);
    if (!validation.ok) {
      sendError(res, 400, validation.message);
      return;
    }

    await recordFailureEvent(req, {
      ...validation.event,
      route: validation.event.route || req.headers.referer || "",
    });
    sendJson(res, 202, { ok: true });
    return;
  }

  if (req.method === "POST" && pathname === "/api/contact") {
    const ip = clientIp(req);
    const blockedForMs = await getContactBlock(ip);
    if (blockedForMs > 0) {
      const minutes = Math.ceil(blockedForMs / 60000);
      sendError(res, 429, `Muitas mensagens em sequência. Tente novamente em ${minutes} min.`);
      return;
    }

    const payload = await readJsonBody(req);
    const validation = validateContactPayload(payload);
    if (!validation.ok) {
      sendError(res, 400, validation.message);
      return;
    }

    await registerContactAttempt(ip);
    await submitContactToWeb3Forms(validation.contact);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && pathname === "/api/catalog") {
    const products = await readCatalog();
    sendJson(res, 200, { products });
    return;
  }

  if (req.method === "GET" && pathname.startsWith("/api/catalog/images/")) {
    const imageId = decodeURIComponent(pathname.replace("/api/catalog/images/", ""));
    await streamCatalogImage(res, imageId);
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/login") {
    const payload = await readJsonBody(req);
    const configuredPassword = adminPassword();

    if (!configuredPassword) {
      sendError(res, 500, "ADMIN_PASSWORD não configurado no backend.");
      return;
    }

    const ip = clientIp(req);
    const blockedForMs = await getLoginBlock(ip);
    if (blockedForMs > 0) {
      const minutes = Math.ceil(blockedForMs / 60000);
      sendError(res, 429, `Muitas tentativas de login. Tente novamente em ${minutes} min.`);
      return;
    }

    if (!safePasswordMatch(payload.password || "", configuredPassword)) {
      await registerFailedLogin(ip);
      sendError(res, 401, "Senha inválida.");
      return;
    }

    await clearLoginAttempts(ip);
    const session = await createAdminSession(req);
    setAdminSessionCookie(req, res, session.token, TOKEN_TTL_MS);
    sendJson(res, 200, { expiresInMs: TOKEN_TTL_MS });
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/session") {
    if (!(await requireAdmin(req, res))) return;
    sendJson(res, 200, { ok: true, expiresInMs: TOKEN_TTL_MS });
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/logout") {
    await destroyAdminSession(req);
    clearAdminSessionCookie(req, res);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/failures") {
    if (!(await requireAdmin(req, res))) return;
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    sendJson(res, 200, await failureSummary(url.searchParams.get("limit") || 20));
    return;
  }

  if (pathname.startsWith("/api/admin/products")) {
    if (!(await requireAdmin(req, res))) return;

    if (req.method === "POST" && pathname === "/api/admin/products") {
      const payload = await readJsonBody(req);
      const validation = validateProductPayload(payload, { requireImage: true });
      if (!validation.ok) {
        sendError(res, 400, validation.message);
        return;
      }

      const now = new Date();
      const imageId = await writeUploadedImage(payload.image);
      const product = normalizeProductForStorage({
        ...validation.product,
        id: await makeProductId(validation.product.categoryId, validation.product.model),
        imageId,
        importPath: "",
        imageUrl: "",
        createdAt: now,
        updatedAt: now,
      });

      await productsCollection.insertOne(product);
      sendJson(res, 201, { product: serializeProduct(product) });
      return;
    }

    if (req.method === "DELETE" && pathname === "/api/admin/products") {
      const payload = await readJsonBody(req);
      const ids = Array.isArray(payload.ids)
        ? [...new Set(payload.ids.map((id) => String(id)).filter(Boolean))]
        : [];

      if (!ids.length) {
        sendError(res, 400, "Informe ao menos um produto para remover.");
        return;
      }

      if (ids.length > 100) {
        sendError(res, 400, "Remova no máximo 100 produtos por vez.");
        return;
      }

      const products = await productsCollection.find({ id: { $in: ids } }).toArray();
      const foundIds = new Set(products.map((product) => product.id));
      const missingIds = ids.filter((id) => !foundIds.has(id));

      for (const product of products) {
        await deleteUploadedImage(product.imageId);
      }

      if (products.length) {
        await productsCollection.deleteMany({ id: { $in: [...foundIds] } });
      }

      sendJson(res, 200, {
        removed: products.length,
        missing: missingIds.length,
        missingIds,
      });
      return;
    }

    const productId = decodeURIComponent(pathname.replace("/api/admin/products/", ""));
    const existingProduct = await productsCollection.findOne({ id: productId });

    if (!productId || !existingProduct) {
      sendError(res, 404, "Produto não encontrado.");
      return;
    }

    if (req.method === "PUT") {
      const payload = await readJsonBody(req);
      const validation = validateProductPayload(payload);
      if (!validation.ok) {
        sendError(res, 400, validation.message);
        return;
      }

      const nextImageId = payload.image?.data
        ? await writeUploadedImage(payload.image)
        : existingProduct.imageId;

      if (payload.image?.data && existingProduct.imageId) {
        await deleteUploadedImage(existingProduct.imageId);
      }

      const nextProduct = normalizeProductForStorage({
        ...existingProduct,
        ...validation.product,
        id: await makeProductId(
          validation.product.categoryId,
          validation.product.model,
          existingProduct.id,
        ),
        imageId: nextImageId,
        imageUrl: payload.image?.data ? "" : existingProduct.imageUrl,
        importPath: payload.image?.data ? "" : existingProduct.importPath,
        updatedAt: new Date(),
      });

      await productsCollection.updateOne(
        { _id: existingProduct._id },
        { $set: nextProduct },
      );
      sendJson(res, 200, { product: serializeProduct(nextProduct) });
      return;
    }

    if (req.method === "DELETE") {
      await productsCollection.deleteOne({ _id: existingProduct._id });
      await deleteUploadedImage(existingProduct.imageId);
      sendJson(res, 200, { product: serializeProduct(existingProduct) });
      return;
    }
  }

  sendError(res, 404, "Rota não encontrada.");
}

function routeUsesDatabase(method, pathname) {
  return !(method === "GET" && (pathname === "/api/health" || pathname === "/api/config"));
}

export async function handleApiRequest(req, res, pathname) {
  setSecurityHeaders(res);
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const requestPath =
    pathname ||
    decodeURIComponent(new URL(req.url || "/", `http://${req.headers.host || "localhost"}`).pathname);

  if (routeUsesDatabase(req.method, requestPath)) {
    await ensureDatabase();
  }

  await handleApi(req, res, requestPath);
}

function contentTypeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const types = {
    ".css": "text/css; charset=utf-8",
    ".gif": "image/gif",
    ".html": "text/html; charset=utf-8",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".txt": "text/plain; charset=utf-8",
    ".webp": "image/webp",
    ".xml": "application/xml; charset=utf-8",
  };

  return types[extension] || "application/octet-stream";
}

function safeJoin(baseDir, requestPath) {
  const normalizedBase = path.resolve(baseDir);
  const relativePath = decodeURIComponent(requestPath).replace(/^\/+/, "");
  const targetPath = path.resolve(normalizedBase, relativePath);
  const relativeToBase = path.relative(normalizedBase, targetPath);

  if (
    relativeToBase === ".." ||
    relativeToBase.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeToBase)
  ) {
    return null;
  }

  return targetPath;
}

async function fileExists(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function streamFile(res, filePath, statusCode = 200) {
  setSecurityHeaders(res);
  res.writeHead(statusCode, { "Content-Type": contentTypeFor(filePath) });
  fsSync.createReadStream(filePath).pipe(res);
}

function usesAppShell(pathname) {
  return pathname === "/admin" || /^\/produto\/[^/]+$/.test(pathname);
}

async function resolveStaticFile(pathname, distDir = DIST_DIR) {
  const cleanPath = pathname.replace(/\/+$/, "") || "/";
  const candidates = cleanPath === "/" ? ["/index.html"] : [cleanPath, `${cleanPath}/index.html`];

  for (const candidate of candidates) {
    const filePath = safeJoin(distDir, candidate);
    if (filePath && (await fileExists(filePath))) {
      return { filePath, statusCode: 200 };
    }
  }

  if (usesAppShell(cleanPath)) {
    return { filePath: path.join(distDir, APP_SHELL_FILE), statusCode: 200 };
  }

  return { filePath: path.join(distDir, NOT_FOUND_FILE), statusCode: 404 };
}

async function serveStatic(req, res, pathname) {
  if (pathname.startsWith("/uploads/")) {
    const uploadPath = safeJoin(PUBLIC_DIR, pathname);
    if (uploadPath && (await fileExists(uploadPath))) {
      await streamFile(res, uploadPath);
      return;
    }
  }

  if (!fsSync.existsSync(DIST_DIR)) {
    sendError(res, 404, "Build não encontrado. Rode npm run build antes de servir o frontend pelo Node.");
    return;
  }

  const { filePath, statusCode } = await resolveStaticFile(pathname);
  if (!(await fileExists(filePath))) {
    sendError(res, 404, "Página não encontrada.");
    return;
  }

  await streamFile(res, filePath, statusCode);
}

const server = http.createServer(async (req, res) => {
  let pathname = "/";
  try {
    setSecurityHeaders(res);
    setCorsHeaders(req, res);

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    pathname = decodeURIComponent(url.pathname);

    if (pathname.startsWith("/api/")) {
      await handleApiRequest(req, res, pathname);
      return;
    }

    await serveStatic(req, res, pathname);
  } catch (error) {
    console.error(error);
    const statusCode = statusCodeFromError(error);
    if (pathname.startsWith("/api/") && statusCode >= 500) {
      await recordFailureEvent(req, {
        source: "api",
        severity: "error",
        type: "exception",
        method: req.method,
        route: pathname,
        statusCode,
        message: error.message || "Erro interno.",
        stack: error.stack || "",
      });
    }
    if (!res.headersSent) {
      sendError(res, statusCode, error.message || "Erro interno.");
    } else {
      res.end();
    }
  }
});

async function shutdown() {
  server.close();
  if (mongoClient) {
    await mongoClient.close();
  }
}

process.on("SIGINT", () => {
  shutdown().finally(() => process.exit(0));
});

process.on("SIGTERM", () => {
  shutdown().finally(() => process.exit(0));
});

function redactMongoUri(uri) {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");
}

export const __test__ = {
  cleanText,
  decodeBase64Image,
  detectImageType,
  resolveStaticFile,
  routeUsesDatabase,
  stripImageMetadata,
  validateContactPayload,
  validateFailurePayload,
  validateProductPayload,
};

async function startServer() {
  try {
    await ensureDatabase();

    server.listen(PORT, () => {
      console.log(`Hidroconex API rodando em http://localhost:${PORT}`);
      console.log(`MongoDB conectado em ${MONGODB_DB_NAME}`);
    });
  } catch (error) {
    console.error("Não foi possível conectar ao MongoDB.");
    console.error(`MONGODB_URI=${redactMongoUri(MONGODB_URI)}`);
    console.error(`MONGODB_DB_NAME=${MONGODB_DB_NAME}`);
    console.error(error.message);
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  await startServer();
}
