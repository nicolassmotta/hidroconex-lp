import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleApiRequest, routeUsesDatabase } from "./api.js";
import { catalogCacheControl, triggerSiteRebuild } from "./catalog.js";
import { MONGODB_DB_NAME, MONGODB_URI, PORT } from "./config.js";
import { validateContactPayload } from "./contact.js";
import { db, ensureDatabase } from "./db.js";
import { sendError, setCorsHeaders, setSecurityHeaders, statusCodeFromError } from "./http.js";
import { decodeBase64Image, detectImageType, stripImageMetadata } from "./images.js";
import { recordFailureEvent, validateFailurePayload } from "./monitoring.js";
import { nextPreviousIds, validateProductPayload } from "./products.js";
import { resolveStaticFile, serveStatic } from "./static.js";
import { cleanText } from "./text.js";

export { handleApiRequest };

const __filename = fileURLToPath(import.meta.url);

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
  if (db.client) {
    await db.client.close();
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
  catalogCacheControl,
  cleanText,
  nextPreviousIds,
  decodeBase64Image,
  detectImageType,
  resolveStaticFile,
  routeUsesDatabase,
  stripImageMetadata,
  triggerSiteRebuild,
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
