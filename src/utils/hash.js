import crypto from "crypto";

/**
 * Tạo SHA256 hash từ chuỗi
 */
export function createHash(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

/**
 * Tạo hash từ resume + JD để làm cache key
 */
export function createCacheKey(resumeText, jdText) {
  const combined = resumeText.trim() + "|||" + jdText.trim();
  return createHash(combined);
}
