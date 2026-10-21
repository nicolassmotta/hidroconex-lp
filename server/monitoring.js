import {
  FAILURE_EVENT_MESSAGE_MAX_LENGTH,
  FAILURE_EVENT_STACK_MAX_LENGTH,
  FAILURE_EVENT_TTL_DAYS,
  FAILURE_EVENT_TTL_MS,
} from "./config.js";
import { db } from "./db.js";
import { clientIp, ipHash } from "./http.js";
import { truncateText } from "./text.js";

export function validateFailurePayload(payload) {
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

export async function recordFailureEvent(req, event) {
  if (!db.failureEvents) return;

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
    await db.failureEvents.insertOne(document);
  } catch (error) {
    console.warn("Não foi possível registrar falha:", error.message);
  }
}

export async function failureSummary(limit = 20) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000);
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const visibleFailures = { type: { $ne: "smoke-test" } };

  const [events, count24h, count7d] = await Promise.all([
    db.failureEvents.find(visibleFailures).sort({ createdAt: -1 }).limit(safeLimit).toArray(),
    db.failureEvents.countDocuments({ ...visibleFailures, createdAt: { $gte: since24h } }),
    db.failureEvents.countDocuments({ ...visibleFailures, createdAt: { $gte: since7d } }),
  ]);

  return {
    ttlDays: FAILURE_EVENT_TTL_DAYS,
    count24h,
    count7d,
    lastFailureAt: events[0]?.createdAt?.toISOString?.() || null,
    events: events.map(serializeFailureEvent),
  };
}
