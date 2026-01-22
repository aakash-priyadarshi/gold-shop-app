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
 */

export interface Env {
  IMAGES_BUCKET: R2Bucket;
  ALLOWED_ORIGINS: string;
  UPLOAD_SECRET?: string; // Optional secret for additional security
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
};

// Allowed MIME types
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Generate a unique filename
function generateKey(type: string, originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  const ext = originalName.split(".").pop()?.toLowerCase() || "jpg";
  // Normalize extension
  const normalizedExt = ext === "jpeg" ? "jpg" : ext;
  return `${type}/${timestamp}-${random}.${normalizedExt}`;
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
        const key = path.replace("/delete/", "");
        return handleDelete(key, env, corsHeaders);
      }

      // Serve images (for non-public buckets)
      // Support both /images/key and /key formats
      if (path.startsWith("/images/")) {
        const key = path.replace("/images/", "");
        return handleServe(key, env, corsHeaders);
      }

      // Serve images from root path (e.g., /product/123.jpg)
      if (
        path.startsWith("/product/") ||
        path.startsWith("/profile/") ||
        path.startsWith("/rfq/") ||
        path.startsWith("/designs/")
      ) {
        const key = path.substring(1); // Remove leading slash
        return handleServe(key, env, corsHeaders);
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
  const contentType = request.headers.get("Content-Type") || "";

  // Get upload type from header or default to 'product'
  const uploadType = request.headers.get("X-Upload-Type") || "product";

  if (!VARIANTS[uploadType]) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Invalid upload type. Must be one of: ${Object.keys(VARIANTS).join(", ")}`,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
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
    file = new Blob([buffer], { type: contentType });
    const ext = contentType.split("/")[1] || "jpg";
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
    let mimeType = json.type || "image/jpeg";

    if (base64Data.includes("data:")) {
      const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        base64Data = matches[2];
      }
    }

    const binaryData = Uint8Array.from(atob(base64Data), (c) =>
      c.charCodeAt(0),
    );
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

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(", ")}`,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Generate unique key
  const baseKey = generateKey(uploadType, filename);
  const variants = VARIANTS[uploadType];

  // Store the original file
  // For now, we store the original without server-side processing
  // (Cloudflare Workers have limited image processing capabilities without paid features)
  // The client-side can handle resizing, or we use Cloudflare Images transformations on delivery

  const arrayBuffer = await file.arrayBuffer();

  // Store original
  await env.IMAGES_BUCKET.put(baseKey, arrayBuffer, {
    httpMetadata: {
      contentType: file.type,
      cacheControl: "public, max-age=31536000", // 1 year cache
    },
    customMetadata: {
      uploadType,
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
): Promise<Response> {
  try {
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
): Promise<Response> {
  const object = await env.IMAGES_BUCKET.get(key);

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

  // Add CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value as string);
  });

  return new Response(object.body, { headers });
}
