import * as crypto from "crypto";

const TOKEN_SECRET =
  process.env.CATALOGUE_TOKEN_SECRET || "catalogue-secret-change-me";

export interface CatalogueTokenPayload {
  slug: string;
  pv: string; // password version: first 10 chars of passwordHash
  exp: number; // unix timestamp
}

export function createCatalogueToken(
  slug: string,
  passwordHash: string,
): string {
  const payload: CatalogueTokenPayload = {
    slug,
    pv: passwordHash.substring(0, 10),
    exp: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(data)
    .digest("base64url");
  return `${data}.${signature}`;
}

export function verifyCatalogueToken(
  token: string,
  expectedSlug: string,
  currentPasswordHash: string,
): boolean {
  try {
    const [data, signature] = token.split(".");
    if (!data || !signature) return false;

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", TOKEN_SECRET)
      .update(data)
      .digest("base64url");
    if (signature !== expectedSignature) return false;

    // Decode payload
    const payload: CatalogueTokenPayload = JSON.parse(
      Buffer.from(data, "base64url").toString(),
    );

    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) return false;

    // Check slug
    if (payload.slug !== expectedSlug) return false;

    // Check password version (invalidates token if password changed)
    if (payload.pv !== currentPasswordHash.substring(0, 10)) return false;

    return true;
  } catch {
    return false;
  }
}

export function hashViewerIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT || "ip-hash-salt-change-me";
  return crypto
    .createHash("sha256")
    .update(ip + salt)
    .digest("hex");
}
