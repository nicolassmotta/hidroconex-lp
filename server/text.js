export function cleanText(value) {
  if (!value) return "";
  if (!/[ÃÂ]/.test(value)) return value;

  try {
    const bytes = Uint8Array.from(String(value), (character) => character.charCodeAt(0) & 0xff);
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    return decoded.includes("�") ? String(value) : decoded;
  } catch {
    return String(value);
  }
}

export function truncateText(value, maxLength) {
  const text = String(value || "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}
