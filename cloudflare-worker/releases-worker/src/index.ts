/**
 * Orivraa Releases Worker
 *
 * Serves desktop installers from the `orivraa-releases` R2 bucket.
 * Designed to be bound to releases.orivraa.com via a Cloudflare route.
 *
 * Object layout in R2:
 *   desktop/v{version}/{filename}   — versioned installers (.msi, .exe, .dmg)
 *   desktop/latest/{filename}       — copy of the latest installer
 *   desktop/latest.json             — Tauri updater manifest (optional fallback)
 *   desktop/v{version}/latest.json  — versioned updater manifest
 *
 * Endpoints:
 *   GET  /desktop/{path...}         — stream installer from R2 (range support)
 *   GET  /latest.json               — convenience redirect to desktop/latest.json
 *   GET  /health                    — health check
 *   HEAD /desktop/{path...}         — metadata only (size, content-type)
 *
 * Security:
 *   - Only GET/HEAD methods are allowed for object access.
 *   - CORS headers are set for configured allowed origins.
 *   - No listing of bucket contents (no directory index).
 */

export interface Env {
  RELEASES_BUCKET: R2Bucket;
  ALLOWED_ORIGINS: string;
}

// Content-Type map for common installer extensions
const CONTENT_TYPES: Record<string, string> = {
  ".msi": "application/x-msi",
  ".exe": "application/vnd.microsoft.portable-executable",
  ".dmg": "application/x-apple-diskimage",
  ".app": "application/octet-stream",
  ".zip": "application/zip",
  ".json": "application/json; charset=utf-8",
  ".sig": "application/octet-stream",
  ".txt": "text/plain; charset=utf-8",
};

function contentTypeFor(filename: string): string {
  const lower = filename.toLowerCase();
  for (const [ext, type] of Object.entries(CONTENT_TYPES)) {
    if (lower.endsWith(ext)) return type;
  }
  return "application/octet-stream";
}

function isAllowedOrigin(origin: string | null, allowed: string): boolean {
  if (!origin) return false;
  const list = allowed.split(",").map((s) => s.trim()).filter(Boolean);
  return list.includes(origin) || list.includes("*");
}

function corsHeaders(origin: string | null, allowed: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (isAllowedOrigin(origin, allowed)) {
    headers["Access-Control-Allow-Origin"] = origin as string;
    headers["Access-Control-Allow-Methods"] = "GET, HEAD, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Range, Content-Type";
    headers["Access-Control-Max-Age"] = "86400";
    headers["Vary"] = "Origin";
  }
  return headers;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin, env.ALLOWED_ORIGINS);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    // Health check
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({ status: "ok", service: "orivraa-releases", time: new Date().toISOString() }),
        { status: 200, headers: { "Content-Type": "application/json; charset=utf-8", ...cors } }
      );
    }

    // Convenience: /latest.json → /desktop/latest.json
    let key = url.pathname.replace(/^\//, "");
    if (key === "latest.json") {
      key = "desktop/latest.json";
    }

    // Only allow GET/HEAD for object access
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD, OPTIONS", ...cors },
      });
    }

    if (!key) {
      return new Response("Not Found", { status: 404, headers: cors });
    }

    // Reject path traversal and empty segments
    if (key.includes("..") || key.includes("//")) {
      return new Response("Bad Request", { status: 400, headers: cors });
    }

    const rangeHeader = request.headers.get("Range");
    const options: R2GetOptions = rangeHeader ? { range: parseRange(rangeHeader) } : {};

    const object = await env.RELEASES_BUCKET.get(key, options);

    if (!object) {
      return new Response("Not Found", { status: 404, headers: cors });
    }

    const filename = key.split("/").pop() || "download";
    const isManifest = key.endsWith(".json");
    const isInstaller = !isManifest && !key.endsWith(".txt") && !key.endsWith(".sig");

    const headers = new Headers(cors);
    headers.set("Content-Type", contentTypeFor(filename));
    headers.set("Accept-Ranges", "bytes");
    headers.set("ETag", object.httpEtag);

    // Size: R2 only writes Content-Length for full responses; for ranges use part size
    if (object.size != null) {
      headers.set("Content-Length", String(object.size));
    }

    // Force download for installer files (browsers shouldn't try to render .exe/.msi/.dmg)
    if (isInstaller) {
      headers.set("Content-Disposition", `attachment; filename="${filename}"`);
      headers.set("Cache-Control", "public, max-age=3600, immutable");
    } else if (isManifest) {
      // Updater JSON should be cached briefly so new versions propagate quickly
      headers.set("Cache-Control", "public, max-age=300");
    } else {
      headers.set("Cache-Control", "public, max-age=3600");
    }

    // Range support
    if (rangeHeader && object.range) {
      const r = object.range as { offset?: number; length?: number; suffix?: number };
      const start = r.offset ?? 0;
      const end = start + (object.size ?? 0) - 1;
      const total = "size" in object && typeof object.size === "number" ? object.size : "*";
      headers.set("Content-Range", `bytes ${start}-${end}/${total}`);
      return new Response(object.body, { status: 206, headers });
    }

    // HEAD returns headers only, no body
    if (request.method === "HEAD") {
      return new Response(null, { status: 200, headers });
    }

    return new Response(object.body, { status: 200, headers });
  },
};

/**
 * Parse a single-range `Range: bytes=start-end` header into R2 range options.
 * Supports open-ended ranges (bytes=start-) and full ranges (bytes=start-end).
 */
function parseRange(rangeHeader: string): R2Range | undefined {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
  if (!match) return undefined;
  const startStr = match[1];
  const endStr = match[2];
  if (startStr === "" && endStr === "") return undefined;
  if (startStr === "") {
    // suffix range: bytes=-N → last N bytes
    const suffix = parseInt(endStr, 10);
    if (Number.isNaN(suffix)) return undefined;
    return { suffix };
  }
  const offset = parseInt(startStr, 10);
  if (Number.isNaN(offset)) return undefined;
  if (endStr === "") {
    return { offset };
  }
  const end = parseInt(endStr, 10);
  if (Number.isNaN(end)) return undefined;
  return { offset, length: end - offset + 1 };
}
