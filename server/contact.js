import {
  CONTACT_BLOCK_MS,
  CONTACT_EMAIL_MAX_LENGTH,
  CONTACT_MAX_ATTEMPTS,
  CONTACT_MESSAGE_MAX_LENGTH,
  CONTACT_NAME_MAX_LENGTH,
  CONTACT_PHONE_MAX_LENGTH,
  CONTACT_WINDOW_MS,
  WEB3FORMS_ENDPOINT,
} from "./config.js";
import { db } from "./db.js";

export async function getContactBlock(ip) {
  const doc = await db.contactAttempts.findOne({ _id: ip });
  if (doc?.blockedUntil && doc.blockedUntil > Date.now()) {
    return doc.blockedUntil - Date.now();
  }
  return 0;
}

export async function registerContactAttempt(ip) {
  const now = Date.now();
  const doc = await db.contactAttempts.findOne({ _id: ip });
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

  await db.contactAttempts.updateOne({ _id: ip }, { $set: update }, { upsert: true });
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

export function validateContactPayload(payload) {
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

export async function submitContactToWeb3Forms(contact) {
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
