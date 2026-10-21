import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { DIST_DIR, PUBLIC_DIR } from "./config.js";
import { sendError, setSecurityHeaders } from "./http.js";

// Mesmo roteamento do vercel.json: HTML gerado no build, app-shell para /admin e
// produtos criados depois do build, 404.html (status 404) para o resto.
const APP_SHELL_FILE = "app-shell.html";
const NOT_FOUND_FILE = "404.html";

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

export async function resolveStaticFile(pathname, distDir = DIST_DIR) {
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

export async function serveStatic(req, res, pathname) {
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
