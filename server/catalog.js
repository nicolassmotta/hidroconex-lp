import crypto from "node:crypto";
import { db } from "./db.js";
import { recordFailureEvent } from "./monitoring.js";
import { serializeProduct, slugify } from "./products.js";

export async function makeProductId(categoryId, model, currentId) {
  const base = `${categoryId}-${slugify(model) || crypto.randomUUID().slice(0, 8)}`;
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existingProduct = await db.products.findOne({ id: candidate });
    if (!existingProduct || existingProduct.id === currentId) {
      return candidate;
    }

    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function readCatalog() {
  const products = await db.products
    .find({})
    .sort({ mainCategory: 1, subCategory: 1, model: 1 })
    .toArray();

  return products.map(serializeProduct);
}

// Deploy Hook da Vercel (Settings > Git > Deploy Hooks): cada alteração no catálogo dispara
// um build novo, que regera o HTML estático e o sitemap. A Vercel cancela o build anterior
// do mesmo hook, então várias edições seguidas terminam num deploy só.
// O hook responde 201 só depois de criar o deploy, em ~7 s: com 5 s o build começava,
// mas o admin avisava que a atualização tinha falhado.
const DEPLOY_HOOK_TIMEOUT_MS = 20_000;

export async function triggerSiteRebuild(req) {
  const hookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hookUrl) return "disabled";

  try {
    const response = await fetch(hookUrl, {
      method: "POST",
      signal: AbortSignal.timeout(DEPLOY_HOOK_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`Deploy Hook respondeu HTTP ${response.status}.`);
    }

    return "started";
  } catch (error) {
    await recordFailureEvent(req, {
      source: "api",
      severity: "warning",
      type: "deploy-hook",
      route: "/api/admin/products",
      message: `Não foi possível atualizar o site: ${error.message}`,
    });
    return "failed";
  }
}

// O catálogo público fica 1 min na CDN da Vercel. O admin e o build pedem ?fresh=1
// e leem direto do banco, para não pegar a versão anterior a uma edição.
const CATALOG_CDN_CACHE = "public, max-age=0, s-maxage=60, stale-while-revalidate=600";

export function catalogCacheControl(req) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  return url.searchParams.has("fresh") ? "no-store" : CATALOG_CDN_CACHE;
}
