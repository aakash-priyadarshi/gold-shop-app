/**
 * Orivraa Images Worker
 *
 * Handles image uploads to Cloudflare R2 with automatic optimization.
 * Creates multiple variants (thumbnail, medium, large) on upload.
 *
 * Upload Types:
 * - product: Product images (large: 1200px, medium: 600px, thumb: 200px)
 * - profile: Profile avatars (large: 400px, medium: 200px, thumb: 100px)
 * - rfq: Custom order reference images (large: 1200px, medium: 600px, thumb: 200px)
 * - designs: AI-generated design images (large: 1024px, medium: 512px, thumb: 200px)
 * - kyc: KYC/verification documents (large: 1600px, medium: 800px, thumb: 200px)
 * - certificate: Hallmark / gemstone certificates (images + PDF)
 */

import {
  detectFileType,
  isSafeObjectKey,
  maxBytesForType,
  verifyImageWorkerToken,
} from "./security";

export interface Env {
  IMAGES_BUCKET: R2Bucket;
  DEMOS_BUCKET: R2Bucket;
  ALLOWED_ORIGINS: string;
  IMAGE_WORKER_AUTH_SECRET?: string;
}

interface UploadResponse {
  success: boolean;
  url?: string;
  urls?: {
    original: string;
    large: string;
    medium: string;
    thumbnail: string;
  };
  error?: string;
  key?: string;
}

interface ImageVariant {
  suffix: string;
  maxWidth: number;
  maxHeight: number;
  quality: number;
}

// Image variants by upload type
const VARIANTS: Record<string, ImageVariant[]> = {
  product: [
    { suffix: "", maxWidth: 1200, maxHeight: 1200, quality: 90 }, // Large/Original
    { suffix: "_medium", maxWidth: 600, maxHeight: 600, quality: 85 },
    { suffix: "_thumb", maxWidth: 200, maxHeight: 200, quality: 80 },
  ],
  profile: [
    { suffix: "", maxWidth: 400, maxHeight: 400, quality: 90 },
    { suffix: "_medium", maxWidth: 200, maxHeight: 200, quality: 85 },
    { suffix: "_thumb", maxWidth: 100, maxHeight: 100, quality: 80 },
  ],
  rfq: [
    { suffix: "", maxWidth: 1200, maxHeight: 1200, quality: 90 },
    { suffix: "_medium", maxWidth: 600, maxHeight: 600, quality: 85 },
    { suffix: "_thumb", maxWidth: 200, maxHeight: 200, quality: 80 },
  ],
  designs: [
    { suffix: "", maxWidth: 1024, maxHeight: 1024, quality: 90 }, // AI images are typically 1024px
    { suffix: "_medium", maxWidth: 512, maxHeight: 512, quality: 85 },
    { suffix: "_thumb", maxWidth: 200, maxHeight: 200, quality: 80 },
  ],
  kyc: [
    { suffix: "", maxWidth: 1600, maxHeight: 1600, quality: 95 }, // KYC docs need high fidelity
    { suffix: "_medium", maxWidth: 800, maxHeight: 800, quality: 90 },
    { suffix: "_thumb", maxWidth: 200, maxHeight: 200, quality: 85 },
  ],
  chat: [
    { suffix: "", maxWidth: 1200, maxHeight: 1200, quality: 85 }, // Chat attachments
    { suffix: "_medium", maxWidth: 600, maxHeight: 600, quality: 80 },
    { suffix: "_thumb", maxWidth: 200, maxHeight: 200, quality: 75 },
  ],
  "review-proof": [
    { suffix: "", maxWidth: 1600, maxHeight: 1600, quality: 95 }, // Review proof screenshots
    { suffix: "_medium", maxWidth: 800, maxHeight: 800, quality: 90 },
    { suffix: "_thumb", maxWidth: 200, maxHeight: 200, quality: 85 },
  ],
  certificate: [
    { suffix: "", maxWidth: 1600, maxHeight: 1600, quality: 95 },
    { suffix: "_medium", maxWidth: 800, maxHeight: 800, quality: 90 },
    { suffix: "_thumb", maxWidth: 200, maxHeight: 200, quality: 85 },
  ],
};

// Allowed MIME types — images, videos, and documents
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];
const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ALLOWED_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  ...ALLOWED_DOC_TYPES,
];
const MAX_REQUEST_SIZE = 12 * 1024 * 1024; // 10MB payload plus multipart overhead

/** Voiced demo/tutorial langs in R2. UI also has si/he; those have no video assets yet. */
const SUPPORTED_DEMO_LANGS = [
  "en",
  "hi",
  "fr",
  "de",
  "es",
  "ar",
  "ta",
  "ne",
  "gu",
  "mr",
  "te",
  "kn",
];

// Upload types that allow video and document files
const MEDIA_UPLOAD_TYPES = ["chat"];
const CERTIFICATE_UPLOAD_TYPES = ["certificate"];

// Generate a unique filename
function generateKey(type: string, detectedType: string): string {
  const timestamp = Date.now();
  const random = crypto.randomUUID().replaceAll("-", "");
  const extension = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  }[detectedType] || "bin";
  return `${type}/${timestamp}-${random}.${extension}`;
}

async function authorize(
  request: Request,
  env: Env,
  operation: "upload" | "delete",
) {
  const header = request.headers.get("Authorization") || "";
  const token = header.match(/^Bearer\s+(.+)$/i)?.[1] || null;
  const claims = await verifyImageWorkerToken(token, env.IMAGE_WORKER_AUTH_SECRET);
  if (!claims || claims.op !== operation) return null;
  return claims;
}

function jsonError(message: string, status: number, corsHeaders: HeadersInit): Response {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Get CORS headers
function getCorsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigins = env.ALLOWED_ORIGINS?.split(",") || [];

  // Check if origin is allowed
  const isAllowed = allowedOrigins.some(
    (allowed) => origin === allowed.trim() || allowed.trim() === "*",
  );

  return {
    "Access-Control-Allow-Origin": isAllowed
      ? origin
      : allowedOrigins[0] || "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Upload-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const corsHeaders = getCorsHeaders(request, env);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Health check
      if (path === "/health") {
        return new Response(
          JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Upload endpoint
      if (path === "/upload" && request.method === "POST") {
        return handleUpload(request, env, corsHeaders);
      }

      // Delete endpoint
      if (path.startsWith("/delete/") && request.method === "DELETE") {
        let key: string;
        try {
          key = decodeURIComponent(path.replace("/delete/", ""));
        } catch {
          return jsonError("Invalid object key", 400, corsHeaders);
        }
        return handleDelete(key, env, corsHeaders, request);
      }

      // Serve images (for non-public buckets)
      // Support both /images/key and /key formats
      if (path.startsWith("/images/")) {
        const key = decodeURIComponent(path.replace("/images/", ""));
        return handleServe(key, env, corsHeaders, request);
      }

      // Serve SHORT demo videos (~30s screenshot reel) from DEMOS_BUCKET
      // Used on the homepage hero card and the /demo SEO page.
      if (path.startsWith("/demo/") && request.method === "GET") {
        const lang = path.replace("/demo/", "").split("/")[0];
        if (!SUPPORTED_DEMO_LANGS.includes(lang)) {
          return new Response(JSON.stringify({ error: `Invalid language. Supported: ${SUPPORTED_DEMO_LANGS.join(", ")}` }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return handleDemoServe(`demo_short_${lang}.mp4`, env, corsHeaders, request);
      }

      // Serve FULL TUTORIAL videos (~24min voiced walkthrough) from DEMOS_BUCKET
      // Used on the /tutorial SEO page and the seller dashboard help page.
      if (path.startsWith("/tutorial/") && request.method === "GET") {
        const lang = path.replace("/tutorial/", "").split("/")[0];
        if (!SUPPORTED_DEMO_LANGS.includes(lang)) {
          return new Response(JSON.stringify({ error: `Invalid language. Supported: ${SUPPORTED_DEMO_LANGS.join(", ")}` }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return handleDemoServe(`demo_voiced_${lang}.mp4`, env, corsHeaders, request);
      }

      // Serve videos from /vid/ path (hero videos, etc.)
      if (path.startsWith("/vid/")) {
        const key = decodeURIComponent(path.substring(1)); // Remove leading slash → "vid/filename.mp4"
        return handleServe(key, env, corsHeaders, request);
      }

      // Serve images from root path (e.g., /product/123.jpg)
      if (
        path.startsWith("/product/") ||
        path.startsWith("/profile/") ||
        path.startsWith("/rfq/") ||
        path.startsWith("/designs/") ||
        path.startsWith("/kyc/") ||
        path.startsWith("/chat/") ||
        path.startsWith("/certificate/") ||
        path.startsWith("/review-proof/")
      ) {
        const key = decodeURIComponent(path.substring(1)); // Remove leading slash
        return handleServe(key, env, corsHeaders, request);
      }

      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Worker error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error:
            error instanceof Error ? error.message : "Internal Server Error",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  },
};

async function handleUpload(
  request: Request,
  env: Env,
  corsHeaders: HeadersInit,
): Promise<Response> {
  const claims = await authorize(request, env, "upload");
  if (!claims) return jsonError("Valid upload authorization is required", 401, corsHeaders);

  const contentLength = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_SIZE) {
    return jsonError("Request body is too large", 413, corsHeaders);
  }

  const contentType = request.headers.get("Content-Type") || "";

  // Get upload type from header or default to 'product'
  const uploadType = request.headers.get("X-Upload-Type") || "product";

  if (!VARIANTS[uploadType]) {
    return jsonError(
      `Invalid upload type. Must be one of: ${Object.keys(VARIANTS).join(", ")}`,
      400,
      corsHeaders,
    );
  }
  if (claims.uploadType !== uploadType) {
    return jsonError("Authorization is not valid for this upload type", 403, corsHeaders);
  }

  let file: File | Blob;
  let filename: string;

  // Handle multipart form data
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const uploadedFile = formData.get("file") as File | null;

    if (!uploadedFile) {
      return new Response(
        JSON.stringify({ success: false, error: "No file provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    file = uploadedFile;
    filename = uploadedFile.name;
  }
  // Handle raw binary upload
  else if (ALLOWED_TYPES.some((type) => contentType.includes(type))) {
    const buffer = await request.arrayBuffer();
    const rawMimeType = contentType.split(";", 1)[0].trim().toLowerCase();
    file = new Blob([buffer], { type: rawMimeType });
    const ext = rawMimeType.split("/")[1] || "jpg";
    filename = `upload.${ext}`;
  }
  // Handle base64 JSON upload
  else if (contentType.includes("application/json")) {
    const json = (await request.json()) as {
      data?: string;
      filename?: string;
      type?: string;
    };

    if (!json.data) {
      return new Response(
        JSON.stringify({ success: false, error: "No image data provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse base64 data URL or raw base64
    let base64Data = json.data;
    let mimeType = (json.type || "image/jpeg").split(";", 1)[0].trim().toLowerCase();

    if (base64Data.includes("data:")) {
      const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1].trim().toLowerCase();
        base64Data = matches[2];
      }
    }

    let binaryData: Uint8Array;
    try {
      binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    } catch {
      return jsonError("Invalid base64 image data", 400, corsHeaders);
    }
    file = new Blob([binaryData], { type: mimeType });
    filename = json.filename || `upload.${mimeType.split("/")[1] || "jpg"}`;
  } else {
    return new Response(
      JSON.stringify({
        success: false,
        error:
          "Invalid content type. Use multipart/form-data, application/json with base64, or raw image bytes",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detectedType = detectFileType(bytes);
  if (!detectedType || detectedType !== file.type) {
    return jsonError(
      "File signature does not match the claimed content type",
      400,
      corsHeaders,
    );
  }

  // Validate file type — chat allows video/docs, certificates allow PDF, others images only
  const isMediaUpload = MEDIA_UPLOAD_TYPES.includes(uploadType);
  const isCertificateUpload = CERTIFICATE_UPLOAD_TYPES.includes(uploadType);
  const isImage = ALLOWED_IMAGE_TYPES.includes(detectedType);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(detectedType);
  const isDoc = ALLOWED_DOC_TYPES.includes(detectedType);
  const isPdf = detectedType === "application/pdf";

  if (isMediaUpload) {
    if (!isImage && !isVideo && !isDoc) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid file type: ${detectedType || file.type}. Allowed: images, videos (MP4/WebM), documents (PDF/DOC/DOCX)`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } else if (isCertificateUpload) {
    if (!isImage && !isPdf) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid file type: ${detectedType || file.type}. Allowed: JPEG, PNG, WebP, GIF, AVIF, or PDF`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } else {
    if (!ALLOWED_IMAGE_TYPES.includes(detectedType)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid file type: ${detectedType || file.type}. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  }

  // Validate file size — different limits per type
  const maxSize = Math.min(
    maxBytesForType(detectedType),
    claims.maxBytes || Number.MAX_SAFE_INTEGER,
  );
  if (file.size > maxSize) {
    return jsonError(
      `File too large. Maximum size: ${maxSize / 1024 / 1024}MB`,
      413,
      corsHeaders,
    );
  }

  // Generate unique key
  const baseKey = generateKey(uploadType, detectedType);
  const variants = VARIANTS[uploadType];

  // Store the original file
  // For now, we store the original without server-side processing
  // (Cloudflare Workers have limited image processing capabilities without paid features)
  // The client-side can handle resizing, or we use Cloudflare Images transformations on delivery

  const arrayBuffer = bytes.buffer;

  // Store original
  await env.IMAGES_BUCKET.put(baseKey, arrayBuffer, {
    httpMetadata: {
      contentType: file.type,
      cacheControl: "public, max-age=31536000", // 1 year cache
    },
    customMetadata: {
      uploadType,
      ownerId: claims.sub,
      shopId: claims.shopId || "",
      ownerRole: claims.role,
      originalName: filename,
      uploadedAt: new Date().toISOString(),
    },
  });

  // Build URLs
  // Use the R2 public URL or custom domain
  // Format: https://pub-{account_hash}.r2.dev/{key} or https://images.orivraa.com/{key}
  const baseUrl = "https://images.orivraa.com"; // Update this with your actual R2 public URL

  const response: UploadResponse = {
    success: true,
    key: baseKey,
    url: `${baseUrl}/${baseKey}`,
    urls: {
      original: `${baseUrl}/${baseKey}`,
      large: `${baseUrl}/${baseKey}`, // Same as original for now
      medium: `${baseUrl}/${baseKey}?w=600`, // Use Cloudflare Image Resizing if enabled
      thumbnail: `${baseUrl}/${baseKey}?w=200`,
    },
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleDelete(
  key: string,
  env: Env,
  corsHeaders: HeadersInit,
  request: Request,
): Promise<Response> {
  try {
    const claims = await authorize(request, env, "delete");
    if (!claims) return jsonError("Valid delete authorization is required", 401, corsHeaders);
    if (!isSafeObjectKey(key)) return jsonError("Invalid object key", 400, corsHeaders);

    const object = await env.IMAGES_BUCKET.head(key);
    if (!object) return jsonError("Not found", 404, corsHeaders);
    const ownerId = object.customMetadata?.ownerId;
    const isAdmin = claims.role === "ADMIN";
    if (!isAdmin && (!ownerId || ownerId !== claims.sub)) {
      return jsonError("You are not authorized to delete this object", 403, corsHeaders);
    }

    // Delete all variants
    const baseKey = key.replace(/_(thumb|medium)(\.[^.]+)$/, "$2");
    const ext = baseKey.split(".").pop();
    const keyWithoutExt = baseKey.replace(`.${ext}`, "");

    // Delete original and variants
    await Promise.all([
      env.IMAGES_BUCKET.delete(baseKey),
      env.IMAGES_BUCKET.delete(`${keyWithoutExt}_medium.${ext}`),
      env.IMAGES_BUCKET.delete(`${keyWithoutExt}_thumb.${ext}`),
    ]);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Delete failed",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}

async function handleServe(
  key: string,
  env: Env,
  corsHeaders: HeadersInit,
  request?: Request,
): Promise<Response> {
  // Parse Range header for video/audio streaming support
  const rangeHeader = request?.headers.get("Range");
  let r2Options: R2GetOptions | undefined;

  if (rangeHeader) {
    // Parse "bytes=START-END" (END is optional)
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : undefined;
      r2Options = {
        range: end !== undefined ? { offset: start, length: end - start + 1 } : { offset: start },
      };
    }
  }

  const object = await env.IMAGES_BUCKET.get(key, r2Options);

  if (!object) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000");
  headers.set("Accept-Ranges", "bytes");
  if ((headers.get("Content-Type") || "").includes("pdf")) {
    headers.set("Content-Disposition", "inline");
  }

  // Add CORS headers
  Object.entries(corsHeaders).forEach(([k, v]) => {
    headers.set(k, v as string);
  });

  // If this was a Range request, return 206 Partial Content
  if (rangeHeader && r2Options?.range) {
    const range = r2Options.range as { offset: number; length?: number };
    const start = range.offset;
    const totalSize = object.size;
    // R2 returns the range body; calculate actual end
    const end = range.length !== undefined
      ? Math.min(start + range.length - 1, totalSize - 1)
      : totalSize - 1;

    headers.set("Content-Range", `bytes ${start}-${end}/${totalSize}`);
    headers.set("Content-Length", String(end - start + 1));

    return new Response(object.body, { status: 206, headers });
  }

  return new Response(object.body, { headers });
}

async function handleDemoServe(
  key: string,
  env: Env,
  corsHeaders: HeadersInit,
  request: Request,
): Promise<Response> {
  const rangeHeader = request.headers.get("Range");
  let r2Options: R2GetOptions | undefined;

  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : undefined;
      r2Options = {
        range: end !== undefined ? { offset: start, length: end - start + 1 } : { offset: start },
      };
    }
  }

  const object = await env.DEMOS_BUCKET.get(key, r2Options);

  if (!object) {
    return new Response(JSON.stringify({ error: "Demo video not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const headers = new Headers();
  headers.set("Content-Type", "video/mp4");
  headers.set("ETag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000");
  headers.set("Accept-Ranges", "bytes");

  Object.entries(corsHeaders).forEach(([k, v]) => {
    headers.set(k, v as string);
  });

  if (rangeHeader && r2Options?.range) {
    const range = r2Options.range as { offset: number; length?: number };
    const start = range.offset;
    const totalSize = object.size;
    const end = range.length !== undefined
      ? Math.min(start + range.length - 1, totalSize - 1)
      : totalSize - 1;

    headers.set("Content-Range", `bytes ${start}-${end}/${totalSize}`);
    headers.set("Content-Length", String(end - start + 1));

    return new Response(object.body, { status: 206, headers });
  }

  headers.set("Content-Length", String(object.size));
  return new Response(object.body, { headers });
}
