import { createHmac, randomUUID, timingSafeEqual } from "crypto";

export const IMAGE_WORKER_AUDIENCE = "orivraa-image-worker";
export const IMAGE_WORKER_TOKEN_TTL_SECONDS = 5 * 60;

export type ImageWorkerOperation = "upload" | "delete";

export interface ImageWorkerTokenClaims {
  sub: string;
  shopId?: string | null;
  role: string;
  op: ImageWorkerOperation;
  uploadType?: string;
  maxBytes?: number;
  aud: typeof IMAGE_WORKER_AUDIENCE;
  iat: number;
  exp: number;
  jti: string;
}

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function signParts(header: string, payload: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");
}

export function signImageWorkerToken(
  secret: string,
  claims: Omit<ImageWorkerTokenClaims, "aud" | "iat" | "exp" | "jti"> & {
    ttlSeconds?: number;
  },
  now = Math.floor(Date.now() / 1000),
): string {
  if (secret.length < 32) {
    throw new Error("IMAGE_WORKER_AUTH_SECRET must be at least 32 characters");
  }

  const header = encode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = encode(
    JSON.stringify({
      sub: claims.sub,
      shopId: claims.shopId ?? null,
      role: claims.role,
      op: claims.op,
      ...(claims.uploadType ? { uploadType: claims.uploadType } : {}),
      ...(claims.maxBytes ? { maxBytes: claims.maxBytes } : {}),
      aud: IMAGE_WORKER_AUDIENCE,
      iat: now,
      exp: now + (claims.ttlSeconds ?? IMAGE_WORKER_TOKEN_TTL_SECONDS),
      jti: randomUUID(),
    } satisfies ImageWorkerTokenClaims),
  );

  return `${header}.${payload}.${signParts(header, payload, secret)}`;
}

export function verifyImageWorkerTokenSignature(
  token: string,
  secret: string,
): boolean {
  const parts = token.split(".");
  if (parts.length !== 3 || secret.length < 32) return false;
  const expected = Buffer.from(signParts(parts[0], parts[1], secret));
  const actual = Buffer.from(parts[2]);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
