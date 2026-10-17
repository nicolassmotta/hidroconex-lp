import {
  adminPassword,
  clearAdminSessionCookie,
  clearLoginAttempts,
  createAdminSession,
  destroyAdminSession,
  getLoginBlock,
  registerFailedLogin,
  requireAdmin,
  safePasswordMatch,
  setAdminSessionCookie,
} from "./auth.js";
import { catalogCacheControl, makeProductId, readCatalog, triggerSiteRebuild } from "./catalog.js";
import {
  DESCRIPTION_MAX_LENGTH,
  IMAGE_LIMIT_MB,
  MODEL_MAX_LENGTH,
  TOKEN_TTL_MS,
} from "./config.js";
import {
  getContactBlock,
  registerContactAttempt,
  submitContactToWeb3Forms,
  validateContactPayload,
} from "./contact.js";
import { db, ensureDatabase } from "./db.js";
import { clientIp, readJsonBody, sendError, sendJson, setCorsHeaders, setSecurityHeaders } from "./http.js";
import { deleteUploadedImage, streamCatalogImage, writeUploadedImage } from "./images.js";
import { failureSummary, recordFailureEvent, validateFailurePayload } from "./monitoring.js";
import {
  nextPreviousIds,
  normalizeProductForStorage,
  serializeProduct,
  validateProductPayload,
} from "./products.js";

async function handleApi(req, res, pathname) {
  if (req.method === "GET" && pathname === "/api/health") {
    sendJson(res, 200, {
      ok: true,
      service: "hidroconex-api",
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/ready") {
    const productCount = await db.products.countDocuments();
    sendJson(res, 200, {
      ok: true,
      service: "hidroconex-api",
      database: "mongodb",
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
    sendJson(res, 200, { products }, { "Cache-Control": catalogCacheControl(req) });
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

      await db.products.insertOne(product);
      sendJson(res, 201, {
        product: serializeProduct(product),
        rebuild: await triggerSiteRebuild(req),
      });
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

      const products = await db.products.find({ id: { $in: ids } }).toArray();
      const foundIds = new Set(products.map((product) => product.id));
      const missingIds = ids.filter((id) => !foundIds.has(id));

      for (const product of products) {
        await deleteUploadedImage(product.imageId);
      }

      if (products.length) {
        await db.products.deleteMany({ id: { $in: [...foundIds] } });
      }

      sendJson(res, 200, {
        removed: products.length,
        missing: missingIds.length,
        missingIds,
        rebuild: products.length ? await triggerSiteRebuild(req) : "disabled",
      });
      return;
    }

    const productId = decodeURIComponent(pathname.replace("/api/admin/products/", ""));
    const existingProduct = await db.products.findOne({ id: productId });

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

      const nextId = await makeProductId(
        validation.product.categoryId,
        validation.product.model,
        existingProduct.id,
      );
      const nextProduct = normalizeProductForStorage({
        ...existingProduct,
        ...validation.product,
        id: nextId,
        previousIds: nextPreviousIds(existingProduct, nextId),
        imageId: nextImageId,
        imageUrl: payload.image?.data ? "" : existingProduct.imageUrl,
        importPath: payload.image?.data ? "" : existingProduct.importPath,
        updatedAt: new Date(),
      });

      await db.products.updateOne(
        { _id: existingProduct._id },
        { $set: nextProduct },
      );
      sendJson(res, 200, {
        product: serializeProduct(nextProduct),
        rebuild: await triggerSiteRebuild(req),
      });
      return;
    }

    if (req.method === "DELETE") {
      await db.products.deleteOne({ _id: existingProduct._id });
      await deleteUploadedImage(existingProduct.imageId);
      sendJson(res, 200, {
        product: serializeProduct(existingProduct),
        rebuild: await triggerSiteRebuild(req),
      });
      return;
    }
  }

  sendError(res, 404, "Rota não encontrada.");
}

export function routeUsesDatabase(method, pathname) {
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
