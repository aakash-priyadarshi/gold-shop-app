import assert from "node:assert/strict";
import { createHmac, webcrypto } from "node:crypto";
import worker from "../cloudflare-worker/src/index";
import {
  detectFileType,
  isSafeObjectKey,
  verifyImageWorkerToken,
} from "../cloudflare-worker/src/security";

// Node 18 does not expose WebCrypto on the global object in every patch release,
// while Cloudflare Workers always do. Keep this local test portable across CI's
// Node 18 and newer developer runtimes without adding a Worker-only dependency.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", { configurable: true, value: webcrypto });
}

const SECRET = "test-image-worker-secret-012345678901234567890";

function tokenFor(claims: Record<string, unknown>, now = 1_700_000_000) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({
    sub: "user-1",
    role: "SHOPKEEPER",
    op: "upload",
    uploadType: "product",
    aud: "orivraa-image-worker",
    iat: now,
    exp: now + 300,
    jti: "test-token",
    ...claims,
  });
  const signature = createHmac("sha256", SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}

class MemoryBucket {
  private readonly objects = new Map<string, { body: ArrayBuffer; customMetadata: Record<string, string> }>();

  async put(
    key: string,
    body: ArrayBuffer | ReadableStream,
    options: { customMetadata: Record<string, string> },
  ) {
    const buffer = body instanceof ReadableStream ? await new Response(body).arrayBuffer() : body;
    this.objects.set(key, { body: buffer, customMetadata: options.customMetadata });
  }

  async head(key: string) {
    const object = this.objects.get(key);
    if (!object) return null;
    return { customMetadata: object.customMetadata };
  }

  async get(key: string) {
    const object = this.objects.get(key);
    if (!object) return null;
    return {
      body: new Blob([object.body]).stream(),
      size: object.body.byteLength,
      httpEtag: "test-etag",
      writeHttpMetadata(headers: Headers) {
        headers.set("Content-Type", "image/jpeg");
      },
    };
  }

  async delete(key: string) {
    this.objects.delete(key);
  }
}

function env() {
  return {
    IMAGES_BUCKET: new MemoryBucket(),
    DEMOS_BUCKET: new MemoryBucket(),
    ALLOWED_ORIGINS: "https://orivraa.com",
    IMAGE_WORKER_AUTH_SECRET: SECRET,
  } as any;
}

async function uploadRequest(token: string, body: Blob, filename = "ring.jpg") {
  const form = new FormData();
  form.append("file", body, filename);
  return worker.fetch(
    new Request("https://images.orivraa.com/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "X-Upload-Type": "product" },
      body: form,
    }),
    env(),
    {} as any,
  );
}

async function main() {
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
assert.equal(detectFileType(jpeg), "image/jpeg");
assert.equal(detectFileType(new Uint8Array([0, 1, 2])), null);
assert.equal(isSafeObjectKey("product/1700000000-abc.jpg"), true);
assert.equal(isSafeObjectKey("product/../secret.jpg"), false);

const fixedToken = tokenFor({}, 1_700_000_000);
assert.ok(await verifyImageWorkerToken(fixedToken, SECRET, 1_700_000_001));
assert.equal(await verifyImageWorkerToken(fixedToken, SECRET, 1_700_000_301), null);
assert.equal(await verifyImageWorkerToken(`${fixedToken}x`, SECRET, 1_700_000_001), null);
const runtimeNow = Math.floor(Date.now() / 1000);
const validToken = tokenFor({}, runtimeNow);

const anonymous = await worker.fetch(
  new Request("https://images.orivraa.com/upload", { method: "POST" }),
  env(),
  {} as any,
);
assert.equal(anonymous.status, 401);

const sharedEnv = env();
const valid = await worker.fetch(
  new Request("https://images.orivraa.com/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${validToken}`, "X-Upload-Type": "product" },
    body: (() => {
      const form = new FormData();
      form.append("file", new Blob([jpeg], { type: "image/jpeg" }), "ring.jpg");
      return form;
    })(),
  }),
  sharedEnv,
  {} as any,
);
assert.equal(valid.status, 200);
const uploaded = (await valid.json()) as { key: string };

const mismatch = await worker.fetch(
  new Request("https://images.orivraa.com/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${validToken}`, "X-Upload-Type": "product" },
    body: (() => {
      const form = new FormData();
      form.append("file", new Blob([new Uint8Array([0, 1, 2])], { type: "image/jpeg" }), "ring.jpg");
      return form;
    })(),
  }),
  sharedEnv,
  {} as any,
);
assert.equal(mismatch.status, 400);

const unsupported = await worker.fetch(
  new Request("https://images.orivraa.com/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${validToken}`, "X-Upload-Type": "product" },
    body: (() => {
      const form = new FormData();
      form.append(
        "file",
        new Blob(["<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>"], {
          type: "image/svg+xml",
        }),
        "ring.svg",
      );
      return form;
    })(),
  }),
  sharedEnv,
  {} as any,
);
assert.equal(unsupported.status, 400);

const oversizedBytes = new Uint8Array(10 * 1024 * 1024 + 1);
oversizedBytes.set(jpeg);
const oversized = await worker.fetch(
  new Request("https://images.orivraa.com/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${validToken}`, "X-Upload-Type": "product" },
    body: (() => {
      const form = new FormData();
      form.append("file", new Blob([oversizedBytes], { type: "image/jpeg" }), "ring.jpg");
      return form;
    })(),
  }),
  sharedEnv,
  {} as any,
  );
  assert.equal(oversized.status, 413);

  const headerlessOversizedBytes = new Uint8Array(12 * 1024 * 1024 + 1);
  headerlessOversizedBytes.set(jpeg);
  const headerlessForm = new FormData();
  headerlessForm.append(
    "file",
    new Blob([headerlessOversizedBytes], { type: "image/jpeg" }),
    "ring.jpg",
  );
  const headerlessOversizedRequest = new Request("https://images.orivraa.com/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${validToken}`, "X-Upload-Type": "product" },
    body: headerlessForm,
  });
  assert.equal(headerlessOversizedRequest.headers.get("Content-Length"), null);
  const headerlessOversized = await worker.fetch(
    headerlessOversizedRequest,
    sharedEnv,
    {} as any,
  );
  assert.equal(headerlessOversized.status, 413);

const deleteToken = tokenFor({ op: "delete", uploadType: undefined }, runtimeNow);
const anonymousDelete = await worker.fetch(
  new Request(`https://images.orivraa.com/delete/${uploaded.key}`, { method: "DELETE" }),
  sharedEnv,
  {} as any,
);
assert.equal(anonymousDelete.status, 401);

const otherUserDelete = await worker.fetch(
  new Request(`https://images.orivraa.com/delete/${uploaded.key}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${tokenFor({ op: "delete", sub: "user-2", uploadType: undefined }, runtimeNow)}` },
  }),
  sharedEnv,
  {} as any,
);
assert.equal(otherUserDelete.status, 403);

const ownerDelete = await worker.fetch(
  new Request(`https://images.orivraa.com/delete/${uploaded.key}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${deleteToken}` },
  }),
  sharedEnv,
  {} as any,
);
assert.equal(ownerDelete.status, 200);

const traversalDelete = await worker.fetch(
  new Request("https://images.orivraa.com/delete/product%2F..%2Fsecret.jpg", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${deleteToken}` },
  }),
  sharedEnv,
  {} as any,
);
assert.equal(traversalDelete.status, 400);

console.log("Cloudflare image worker security tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
