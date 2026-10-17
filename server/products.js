import { ObjectId } from "mongodb";
import { CATEGORY_MAP, DESCRIPTION_MAX_LENGTH, MODEL_MAX_LENGTH } from "./config.js";
import { cleanText } from "./text.js";

export function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toDate(value, fallback = new Date()) {
  if (value instanceof Date) return value;
  if (!value) return fallback;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export function toObjectId(value) {
  if (!value) return null;
  if (value instanceof ObjectId) return value;
  if (ObjectId.isValid(String(value))) return new ObjectId(String(value));
  return null;
}

// Ids antigos de um produto renomeado: as URLs velhas continuam levando à página nova.
export function nextPreviousIds(existingProduct, nextId) {
  const ids = [...(existingProduct.previousIds || [])];
  if (existingProduct.id !== nextId) {
    ids.push(existingProduct.id);
  }

  return [...new Set(ids.map(String))].filter((id) => id && id !== nextId);
}

export function normalizeProductForStorage(product) {
  const category = CATEGORY_MAP[product.categoryId];
  const now = new Date();

  return {
    id: String(product.id),
    previousIds: Array.isArray(product.previousIds) ? product.previousIds.map(String) : [],
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

export function serializeProduct(product) {
  const imageId = toObjectId(product.imageId);

  return {
    id: product.id,
    previousIds: product.previousIds || [],
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

export function validateProductPayload(payload, options = {}) {
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
