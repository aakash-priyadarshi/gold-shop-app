export const IMAGE_WORKER_AUDIENCE = "orivraa-image-worker";

export interface ImageWorkerClaims {
  sub: string;
  shopId?: string | null;
  role: string;
  op: "upload" | "delete";
  uploadType?: string;
  maxBytes?: number;
  aud: typeof IMAGE_WORKER_AUDIENCE;
  iat: number;
  exp: number;
  jti: string;
}

const textEncoder = new TextEncoder();

function decodeBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodeJson(value: string): unknown {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));
}

export async function verifyImageWorkerToken(
  token: string | null,
  secret: string | undefined,
  now = Math.floor(Date.now() / 1000),
): Promise<ImageWorkerClaims | null> {
  if (!token || !secret || secret.length < 32) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const header = decodeJson(parts[0]) as { alg?: string; typ?: string };
    if (header.alg !== "HS256" || header.typ !== "JWT") return null;
    const payload = decodeJson(parts[1]) as Partial<ImageWorkerClaims>;
    if (
      typeof payload.sub !== "string" ||
      typeof payload.role !== "string" ||
      payload.aud !== IMAGE_WORKER_AUDIENCE ||
      (payload.op !== "upload" && payload.op !== "delete") ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number" ||
      typeof payload.jti !== "string" ||
      payload.exp <= now ||
      payload.iat > now + 60
    ) {
      return null;
    }

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      textEncoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      cryptoKey,
      decodeBase64Url(parts[2]),
      textEncoder.encode(`${parts[0]}.${parts[1]}`),
    );
    return valid ? (payload as ImageWorkerClaims) : null;
  } catch {
    return null;
  }
}

export type DetectedFileType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif"
  | "image/avif"
  | "video/mp4"
  | "video/webm"
  | "application/pdf"
  | "application/msword"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

export function detectFileType(bytes: Uint8Array): DetectedFileType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    ascii(bytes, 1, 3) === "PNG" &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return "image/webp";
  }
  if (bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(ascii(bytes, 0, 6))) {
    return "image/gif";
  }
  if (bytes.length >= 12 && ascii(bytes, 4, 4) === "ftyp") {
    const brands = ascii(bytes, 8, Math.min(32, bytes.length - 8));
    if (/\b(?:avif|avis)\b/.test(brands)) return "image/avif";
    return "video/mp4";
  }
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return "video/webm";
  }
  if (bytes.length >= 5 && ascii(bytes, 0, 5) === "%PDF-") return "application/pdf";
  if (bytes.length >= 8 && bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0 && bytes[4] === 0xa1 && bytes[5] === 0xb1 && bytes[6] === 0x1a && bytes[7] === 0xe1) {
    return "application/msword";
  }
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return null;
}

export function maxBytesForType(type: DetectedFileType): number {
  if (type.startsWith("video/")) return 10 * 1024 * 1024;
  if (type.startsWith("application/")) return 5 * 1024 * 1024;
  return 10 * 1024 * 1024;
}

export function isSafeObjectKey(key: string): boolean {
  return /^(?:product|profile|rfq|designs|kyc|chat|certificate|review-proof|email)\/[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp|gif|avif|mp4|webm|pdf|doc|docx)$/i.test(key) &&
    !key.includes("..") &&
    !key.includes("\\");
}
