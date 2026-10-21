import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { GridFSBucket, MongoClient } from "mongodb";
import { LEGACY_JSON_FILE, MONGODB_DB_NAME, MONGODB_URI, ROOT_DIR } from "./config.js";
import { normalizeProductForStorage } from "./products.js";

// Conexão e coleções compartilhadas pelos módulos da API (preenchidas em connectDatabase).
export const db = {
  client: null,
  database: null,
  products: null,
  settings: null,
  images: null,
  loginAttempts: null,
  adminSessions: null,
  contactAttempts: null,
  failureEvents: null,
};

let databaseReadyPromise;

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
  const seedSetting = await db.settings.findOne({ key: "legacyCatalogSeeded" });
  if (seedSetting) return;

  const currentCount = await db.products.countDocuments();
  if (currentCount > 0) {
    await db.settings.updateOne(
      { key: "legacyCatalogSeeded" },
      { $set: { value: true, seededAt: new Date(), skippedBecauseProductsExist: true } },
      { upsert: true },
    );
    return;
  }

  const products = await loadSeedCatalog();
  if (products.length) {
    await db.products.insertMany(products, { ordered: false });
  }

  await db.settings.updateOne(
    { key: "legacyCatalogSeeded" },
    { $set: { value: true, seededAt: new Date(), productCount: products.length } },
    { upsert: true },
  );
}

async function connectDatabase() {
  if (db.products) return;

  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: Number(process.env.MONGODB_TIMEOUT_MS || 5000),
  });

  await client.connect();
  db.client = client;
  db.database = client.db(MONGODB_DB_NAME);
  db.products = db.database.collection("products");
  db.settings = db.database.collection("settings");
  db.images = new GridFSBucket(db.database, { bucketName: "productImages" });
  db.loginAttempts = db.database.collection("loginAttempts");
  db.adminSessions = db.database.collection("adminSessions");
  db.contactAttempts = db.database.collection("contactAttempts");
  db.failureEvents = db.database.collection("failureEvents");

  await db.products.createIndex({ id: 1 }, { unique: true });
  await db.products.createIndex({ categoryId: 1, model: 1 });
  await db.products.createIndex({ mainCategory: 1, subCategory: 1, model: 1 });
  await db.settings.createIndex({ key: 1 }, { unique: true });
  // TTL index: stale login-attempt records auto-expire so the collection
  // never grows unbounded.
  await db.loginAttempts.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 });
  await db.adminSessions.createIndex({ tokenHash: 1 }, { unique: true });
  await db.adminSessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await db.contactAttempts.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 });
  await db.failureEvents.createIndex({ createdAt: -1 });
  await db.failureEvents.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 });
  await seedCatalogIfNeeded();
}

export async function ensureDatabase() {
  if (db.products) return;

  if (!databaseReadyPromise) {
    databaseReadyPromise = connectDatabase().catch((error) => {
      databaseReadyPromise = undefined;
      throw error;
    });
  }

  await databaseReadyPromise;
}
