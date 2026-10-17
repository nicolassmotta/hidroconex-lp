import crypto from "node:crypto";
import path from "node:path";
import { IMAGE_LIMIT_BYTES, IMAGE_LIMIT_MB, IMAGE_TYPES } from "./config.js";
import { db } from "./db.js";
import { sendError, setSecurityHeaders } from "./http.js";
import { slugify, toObjectId } from "./products.js";

function safeUploadName(filename, extension) {
  const baseName = path.basename(filename || "produto").replace(/\.[^.]+$/, "");
  const safeBaseName = slugify(baseName) || "produto";
  return `${Date.now()}-${crypto.randomUUID()}-${safeBaseName}.${extension}`;
}

export function decodeBase64Image(data) {
  const rawData = String(data || "")
    .replace(/^data:[^,]+,/, "")
    .replace(/\s/g, "");

  if (!rawData || rawData.length % 4 === 1 || !/^[A-Za-z0-9+/]+={0,2}$/.test(rawData)) {
    const error = new Error("Imagem inválida.");
    error.statusCode = 400;
    throw error;
  }

  return Buffer.from(rawData, "base64");
}

export function detectImageType(buffer) {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer.toString("ascii", 1, 4) === "PNG" &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { contentType: "image/png", extension: "png" };
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { contentType: "image/webp", extension: "webp" };
  }

  return null;
}

function stripJpegMetadata(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return buffer;

  const chunks = [buffer.subarray(0, 2)];
  let offset = 2;

  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff) {
      chunks.push(buffer.subarray(offset));
      return Buffer.concat(chunks);
    }

    const marker = buffer[offset + 1];
    if (marker === 0xda || marker === 0xd9) {
      chunks.push(buffer.subarray(offset));
      return Buffer.concat(chunks);
    }

    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      chunks.push(buffer.subarray(offset, offset + 2));
      offset += 2;
      continue;
    }

    const segmentLength = buffer.readUInt16BE(offset + 2);
    const segmentEnd = offset + 2 + segmentLength;
    if (segmentLength < 2 || segmentEnd > buffer.length) return buffer;

    const isMetadataSegment = marker === 0xe1 || marker === 0xed || marker === 0xfe;
    if (!isMetadataSegment) {
      chunks.push(buffer.subarray(offset, segmentEnd));
    }

    offset = segmentEnd;
  }

  return Buffer.concat(chunks);
}

function stripPngMetadata(buffer) {
  const signature = buffer.subarray(0, 8);
  const chunks = [signature];
  const metadataChunks = new Set(["tEXt", "zTXt", "iTXt", "tIME", "eXIf"]);
  let offset = 8;

  while (offset + 12 <= buffer.length) {
    const chunkLength = buffer.readUInt32BE(offset);
    const chunkType = buffer.toString("ascii", offset + 4, offset + 8);
    const chunkEnd = offset + 12 + chunkLength;
    if (chunkEnd > buffer.length) return buffer;

    if (!metadataChunks.has(chunkType)) {
      chunks.push(buffer.subarray(offset, chunkEnd));
    }

    offset = chunkEnd;
    if (chunkType === "IEND") break;
  }

  return Buffer.concat(chunks);
}

function stripWebpMetadata(buffer) {
  const chunks = [];
  let offset = 12;
  let changed = false;

  while (offset + 8 <= buffer.length) {
    const chunkType = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkEnd = offset + 8 + chunkSize;
    const paddedEnd = chunkEnd + (chunkSize % 2);
    if (chunkEnd > buffer.length || paddedEnd > buffer.length) return buffer;

    if (chunkType === "EXIF" || chunkType === "XMP ") {
      changed = true;
    } else {
      chunks.push(buffer.subarray(offset, paddedEnd));
    }

    offset = paddedEnd;
  }

  if (!changed) return buffer;

  const riffSize = 4 + chunks.reduce((total, chunk) => total + chunk.length, 0);
  const header = Buffer.from(buffer.subarray(0, 12));
  header.writeUInt32LE(riffSize, 4);
  return Buffer.concat([header, ...chunks]);
}

export function stripImageMetadata(buffer, contentType) {
  if (contentType === "image/jpeg") return stripJpegMetadata(buffer);
  if (contentType === "image/png") return stripPngMetadata(buffer);
  if (contentType === "image/webp") return stripWebpMetadata(buffer);
  return buffer;
}

export async function writeUploadedImage(image) {
  if (!image?.data) return null;

  const claimedContentType = String(image.contentType || "").toLowerCase();
  if (!IMAGE_TYPES[claimedContentType]) {
    const error = new Error("Formato de imagem inválido. Use PNG, JPG ou WebP.");
    error.statusCode = 400;
    throw error;
  }

  let buffer = decodeBase64Image(image.data);
  if (!buffer.length) {
    const error = new Error("Arquivo de imagem vazio.");
    error.statusCode = 400;
    throw error;
  }

  if (buffer.length > IMAGE_LIMIT_BYTES) {
    const error = new Error(`Imagem muito grande. Limite atual: ${IMAGE_LIMIT_MB} MB.`);
    error.statusCode = 413;
    throw error;
  }

  const detectedType = detectImageType(buffer);
  if (!detectedType || detectedType.contentType !== claimedContentType) {
    const error = new Error("O conteúdo da imagem não corresponde ao formato enviado.");
    error.statusCode = 400;
    throw error;
  }

  buffer = stripImageMetadata(buffer, detectedType.contentType);

  return new Promise((resolve, reject) => {
    const uploadStream = db.images.openUploadStream(safeUploadName(image.filename, detectedType.extension), {
      contentType: detectedType.contentType,
      metadata: {
        originalName: image.filename || "",
        contentType: detectedType.contentType,
        uploadedAt: new Date(),
      },
    });

    uploadStream.on("finish", () => resolve(uploadStream.id));
    uploadStream.on("error", reject);
    uploadStream.end(buffer);
  });
}

export async function deleteUploadedImage(imageId) {
  const objectId = toObjectId(imageId);
  if (!objectId) return;

  try {
    await db.images.delete(objectId);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn("Não foi possível remover imagem antiga:", error.message);
    }
  }
}

export async function streamCatalogImage(res, imageId) {
  const objectId = toObjectId(imageId);
  if (!objectId) {
    sendError(res, 404, "Imagem não encontrada.");
    return;
  }

  const file = await db.database.collection("productImages.files").findOne({ _id: objectId });
  if (!file) {
    sendError(res, 404, "Imagem não encontrada.");
    return;
  }

  setSecurityHeaders(res);
  res.writeHead(200, {
    "Content-Type": file.contentType || file.metadata?.contentType || "application/octet-stream",
    "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
  });

  db.images.openDownloadStream(objectId).pipe(res);
}
