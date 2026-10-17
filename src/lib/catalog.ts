import { catalogData as staticCatalogData } from "@/data/catalog";
import { getCategoryMeta } from "@/data/categories";
import { whatsappUrl } from "@/data/company";

/** Id do <script type="application/json"> com o catálogo usado na pré-renderização. */
export const CATALOG_SNAPSHOT_ID = "catalog-snapshot";

export interface CatalogItem {
  id: string;
  categoryId: string;
  mainCategory: string;
  subCategory: string;
  model: string;
  importPath?: string;
  imageUrl?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface FetchCatalogOptions {
  fallbackToStatic?: boolean;
  /** Ignora o cache da CDN (o admin precisa ver a edição que acabou de salvar). */
  fresh?: boolean;
}

export interface AppConfig {
  imageLimitMb: number;
  modelMaxLength: number;
  descriptionMaxLength: number;
}

const configuredImageLimitMb = Number(import.meta.env.VITE_IMAGE_LIMIT_MB);
const DEFAULT_MODEL_MAX_LENGTH = 120;
const DEFAULT_DESCRIPTION_MAX_LENGTH = 1000;

/**
 * Mirrors the API upload limit used in production. When the backend IMAGE_LIMIT_MB
 * is customized, expose the same value as VITE_IMAGE_LIMIT_MB for the client.
 */
export const ADMIN_IMAGE_LIMIT_MB =
  Number.isFinite(configuredImageLimitMb) && configuredImageLimitMb > 0
    ? configuredImageLimitMb
    : 3;

function validImageLimit(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function validPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

const optimizedProductImages = import.meta.glob("/src/assets/ProductsOptimized/**/*.webp", {
  eager: true,
  import: "default",
}) as Record<string, string>;

// Miniaturas de 480 px geradas por scripts/optimizeImages.js para os cards.
const productThumbnails = import.meta.glob("/src/assets/ProductsThumbs/**/*.webp", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function cleanText(value?: string) {
  if (!value) return "";
  if (!/[ÃÂ]/.test(value)) return value;

  try {
    const bytes = Uint8Array.from(value, (character) => character.charCodeAt(0) & 0xff);
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    return decoded.includes("�") ? value : decoded;
  } catch {
    return value;
  }
}

function normalizeCatalogItem(product: CatalogItem): CatalogItem {
  const category = getCategoryMeta(product.categoryId);

  return {
    ...product,
    mainCategory: category?.mainCategory || cleanText(product.mainCategory),
    subCategory: category?.subCategory || cleanText(product.subCategory),
    model: cleanText(product.model),
    description: cleanText(product.description),
  };
}

export function normalizeSearchText(value?: string) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function optimizedPathFor(importPath?: string, outputDir = "ProductsOptimized") {
  if (!importPath) return "";
  return importPath
    .replace(/^\./, "")
    .replace("/src/assets/Products/", `/src/assets/${outputDir}/`)
    .replace(/\.png$/i, ".webp");
}

function findImageByPath(imageMap: Record<string, string>, key: string): string {
  if (!key) return "";

  let url = imageMap[key];

  if (!url) {
    url = imageMap[key.normalize("NFC")];
  }

  if (!url) {
    url = imageMap[key.normalize("NFD")];
  }

  if (!url) {
    const filename = key.split("/").pop();
    if (filename) {
      const foundKey = Object.keys(imageMap).find((imageKey) =>
        imageKey.endsWith(`/${filename}`),
      );
      if (foundKey) {
        url = imageMap[foundKey];
      }
    }
  }

  return url ?? "";
}

function resolveStaticImage(importPath?: string): string {
  if (!importPath) return "";

  return findImageByPath(optimizedProductImages, optimizedPathFor(importPath));
}

export function resolveCatalogImage(product: Pick<CatalogItem, "imageUrl" | "importPath">): string {
  if (product.imageUrl) return product.imageUrl;
  return resolveStaticImage(product.importPath) || "/placeholder.svg";
}

/** Imagem menor para cards; fotos enviadas pelo admin (GridFS) não têm miniatura. */
export function resolveCatalogThumbnail(
  product: Pick<CatalogItem, "imageUrl" | "importPath">,
): string {
  if (product.imageUrl) return product.imageUrl;

  return (
    findImageByPath(productThumbnails, optimizedPathFor(product.importPath, "ProductsThumbs")) ||
    resolveCatalogImage(product)
  );
}

export function normalizeCatalog(products: CatalogItem[]): CatalogItem[] {
  return products.map(normalizeCatalogItem);
}

export function staticCatalog(): CatalogItem[] {
  return normalizeCatalog(
    staticCatalogData.map((product) => ({
      ...product,
      imageUrl: "",
    })),
  );
}

function catalogErrorFromResponse(status: number, data: unknown): Error {
  const payload = data as { error?: string | { message?: string }; message?: string } | null;
  const message =
    (typeof payload?.error === "string" && payload.error) ||
    (typeof payload?.error === "object" &&
      typeof payload.error.message === "string" &&
      payload.error.message) ||
    (typeof payload?.message === "string" && payload.message) ||
    `Nao foi possivel carregar o catalogo (HTTP ${status}).`;

  return new Error(message);
}

export async function fetchCatalog(options: FetchCatalogOptions = {}): Promise<CatalogItem[]> {
  const { fallbackToStatic = true, fresh = false } = options;

  try {
    const response = await fetch(fresh ? "/api/catalog?fresh=1" : "/api/catalog", {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw catalogErrorFromResponse(response.status, data);
    }

    const data = await response.json().catch(() => null);
    if (data && Array.isArray(data.products)) {
      return normalizeCatalog(data.products);
    }

    throw new Error("Resposta invalida da API de catalogo.");
  } catch (error) {
    if (!fallbackToStatic) {
      throw error instanceof Error
        ? error
        : new Error("Nao foi possivel carregar o catalogo.");
    }

    // The static catalog keeps the public site useful while the API is offline.
  }

  return staticCatalog();
}

export async function fetchAppConfig(): Promise<AppConfig> {
  try {
    const response = await fetch("/api/config", {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error("Config API unavailable");
    }

    const data = await response.json().catch(() => null);
    return {
      imageLimitMb: validImageLimit(data?.imageLimitMb)
        ? data.imageLimitMb
        : ADMIN_IMAGE_LIMIT_MB,
      modelMaxLength: validPositiveNumber(data?.modelMaxLength)
        ? data.modelMaxLength
        : DEFAULT_MODEL_MAX_LENGTH,
      descriptionMaxLength: validPositiveNumber(data?.descriptionMaxLength)
        ? data.descriptionMaxLength
        : DEFAULT_DESCRIPTION_MAX_LENGTH,
    };
  } catch {
    return {
      imageLimitMb: ADMIN_IMAGE_LIMIT_MB,
      modelMaxLength: DEFAULT_MODEL_MAX_LENGTH,
      descriptionMaxLength: DEFAULT_DESCRIPTION_MAX_LENGTH,
    };
  }
}

export function productSearchText(product: CatalogItem) {
  return normalizeSearchText(
    [
      product.model,
      product.description,
      product.mainCategory,
      product.subCategory,
      product.categoryId,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

export function productQuoteUrl(product: Pick<CatalogItem, "model">) {
  return whatsappUrl(
    `Olá! Vim pelo site da Hidroconex e gostaria de solicitar orçamento do produto: ${product.model}.`,
  );
}
