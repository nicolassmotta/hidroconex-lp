import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT_DIR = path.resolve(__dirname, "..");
export const DIST_DIR = path.join(ROOT_DIR, "dist");
export const PUBLIC_DIR = path.join(ROOT_DIR, "public");
export const LEGACY_JSON_FILE = path.join(__dirname, "data", "catalog.json");

loadEnv(path.join(ROOT_DIR, ".env"));

export const PORT = Number(process.env.PORT || 3333);
export const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
export const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "hidroconex";
export const CONFIGURED_TOKEN_TTL_HOURS = Number(process.env.ADMIN_TOKEN_TTL_HOURS || 8);
export const TOKEN_TTL_HOURS =
  Number.isFinite(CONFIGURED_TOKEN_TTL_HOURS) && CONFIGURED_TOKEN_TTL_HOURS > 0
    ? CONFIGURED_TOKEN_TTL_HOURS
    : 8;
export const TOKEN_TTL_MS = TOKEN_TTL_HOURS * 60 * 60 * 1000;
export const DEFAULT_IMAGE_LIMIT_MB = process.env.VERCEL ? 3 : 8;
export const CONFIGURED_IMAGE_LIMIT_MB = Number(process.env.IMAGE_LIMIT_MB || DEFAULT_IMAGE_LIMIT_MB);
export const IMAGE_LIMIT_MB =
  Number.isFinite(CONFIGURED_IMAGE_LIMIT_MB) && CONFIGURED_IMAGE_LIMIT_MB > 0
    ? CONFIGURED_IMAGE_LIMIT_MB
    : DEFAULT_IMAGE_LIMIT_MB;
export const CONFIGURED_JSON_LIMIT_MB = Number(process.env.JSON_BODY_LIMIT_MB || IMAGE_LIMIT_MB + 2);
export const JSON_LIMIT_MB =
  Number.isFinite(CONFIGURED_JSON_LIMIT_MB) && CONFIGURED_JSON_LIMIT_MB > 0
    ? CONFIGURED_JSON_LIMIT_MB
    : IMAGE_LIMIT_MB + 2;
export const JSON_LIMIT_BYTES = JSON_LIMIT_MB * 1024 * 1024;
export const IMAGE_LIMIT_BYTES = IMAGE_LIMIT_MB * 1024 * 1024;
export const CONFIGURED_LOGIN_MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS || 8);
export const LOGIN_MAX_ATTEMPTS =
  Number.isFinite(CONFIGURED_LOGIN_MAX_ATTEMPTS) && CONFIGURED_LOGIN_MAX_ATTEMPTS > 0
    ? CONFIGURED_LOGIN_MAX_ATTEMPTS
    : 8;
export const CONFIGURED_LOGIN_WINDOW_MIN = Number(process.env.LOGIN_WINDOW_MIN || 15);
export const LOGIN_WINDOW_MS =
  (Number.isFinite(CONFIGURED_LOGIN_WINDOW_MIN) && CONFIGURED_LOGIN_WINDOW_MIN > 0
    ? CONFIGURED_LOGIN_WINDOW_MIN
    : 15) *
  60 *
  1000;
export const CONFIGURED_LOGIN_BLOCK_MIN = Number(process.env.LOGIN_BLOCK_MIN || 15);
export const LOGIN_BLOCK_MS =
  (Number.isFinite(CONFIGURED_LOGIN_BLOCK_MIN) && CONFIGURED_LOGIN_BLOCK_MIN > 0
    ? CONFIGURED_LOGIN_BLOCK_MIN
    : 15) *
  60 *
  1000;
export const CONFIGURED_CONTACT_MAX_ATTEMPTS = Number(process.env.CONTACT_MAX_ATTEMPTS || 5);
export const CONTACT_MAX_ATTEMPTS =
  Number.isFinite(CONFIGURED_CONTACT_MAX_ATTEMPTS) && CONFIGURED_CONTACT_MAX_ATTEMPTS > 0
    ? CONFIGURED_CONTACT_MAX_ATTEMPTS
    : 5;
export const CONFIGURED_CONTACT_WINDOW_MIN = Number(process.env.CONTACT_WINDOW_MIN || 10);
export const CONTACT_WINDOW_MS =
  (Number.isFinite(CONFIGURED_CONTACT_WINDOW_MIN) && CONFIGURED_CONTACT_WINDOW_MIN > 0
    ? CONFIGURED_CONTACT_WINDOW_MIN
    : 10) *
  60 *
  1000;
export const CONFIGURED_CONTACT_BLOCK_MIN = Number(process.env.CONTACT_BLOCK_MIN || 20);
export const CONTACT_BLOCK_MS =
  (Number.isFinite(CONFIGURED_CONTACT_BLOCK_MIN) && CONFIGURED_CONTACT_BLOCK_MIN > 0
    ? CONFIGURED_CONTACT_BLOCK_MIN
    : 20) *
  60 *
  1000;
export const ADMIN_SESSION_COOKIE = "hidroconex_admin_session";
export const MODEL_MAX_LENGTH = 120;
export const DESCRIPTION_MAX_LENGTH = 1000;
export const CONTACT_NAME_MAX_LENGTH = 120;
export const CONTACT_PHONE_MAX_LENGTH = 40;
export const CONTACT_EMAIL_MAX_LENGTH = 160;
export const CONTACT_MESSAGE_MAX_LENGTH = 2000;
export const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";
export const CONFIGURED_FAILURE_EVENT_TTL_DAYS = Number(process.env.FAILURE_EVENT_TTL_DAYS || 14);
export const FAILURE_EVENT_TTL_DAYS =
  Number.isFinite(CONFIGURED_FAILURE_EVENT_TTL_DAYS) && CONFIGURED_FAILURE_EVENT_TTL_DAYS > 0
    ? Math.min(CONFIGURED_FAILURE_EVENT_TTL_DAYS, 90)
    : 14;
export const FAILURE_EVENT_TTL_MS = FAILURE_EVENT_TTL_DAYS * 24 * 60 * 60 * 1000;
export const FAILURE_EVENT_MESSAGE_MAX_LENGTH = 500;
export const FAILURE_EVENT_STACK_MAX_LENGTH = 2000;

export const CATEGORY_MAP = {
  "rm-luvas": { mainCategory: "Reservatórios Metálicos", subCategory: "Luvas" },
  "rm-niples": { mainCategory: "Reservatórios Metálicos", subCategory: "Niples" },
  "ts-juntas": { mainCategory: "Tanques Subterrâneos", subCategory: "Juntas" },
  "ts-luvas": { mainCategory: "Tanques Subterrâneos", subCategory: "Luvas" },
  "ts-niples": { mainCategory: "Tanques Subterrâneos", subCategory: "Niples" },
  "ts-plugs": { mainCategory: "Tanques Subterrâneos", subCategory: "Plugs" },
  "ts-filtros": { mainCategory: "Tanques Subterrâneos", subCategory: "Filtros" },
};

export const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

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
