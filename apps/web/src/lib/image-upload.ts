import { api } from "@/lib/api";

/**
 * Image Upload Service
 *
 * Handles image uploads to Cloudflare R2 via Worker.
 * Supports different upload types: product, profile, rfq
 */

// Get the worker URL from environment or use default
const WORKER_URL =
  process.env.NEXT_PUBLIC_IMAGE_WORKER_URL || "https://images.orivraa.com";

type WorkerOperation = "upload" | "delete";

export function validateImageWorkerUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("NEXT_PUBLIC_IMAGE_WORKER_URL must be a valid HTTPS URL");
  }

  if (url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_IMAGE_WORKER_URL must be a valid HTTPS URL");
  }

  return url.toString().replace(/\/+$/, "");
}

function getWorkerUrl(): string {
  return validateImageWorkerUrl(WORKER_URL);
}

async function getWorkerToken(
  operation: WorkerOperation,
  uploadType?: string,
): Promise<string> {
  getWorkerUrl();
  const response = await api.get<{ token?: string }>(
    "/auth/image-upload-token",
    { params: { operation, ...(uploadType ? { uploadType } : {}) } },
  );
  if (!response.data?.token) {
    throw new Error("Image upload authorization is unavailable");
  }
  return response.data.token;
}

export type UploadType =
  | "product"
  | "profile"
  | "rfq"
  | "kyc"
  | "review-proof"
  | "certificate";

export type UploadErrorCode =
  | "FILE_TOO_LARGE"
  | "INVALID_FILE_TYPE"
  | "HTTP_ERROR"
  | "INVALID_RESPONSE";

export interface UploadResult {
  success: boolean;
  url?: string;
  urls?: {
    original: string;
    large: string;
    medium: string;
    thumbnail: string;
  };
  key?: string;
  error?: string;
  errorCode?: UploadErrorCode;
  httpStatus?: number;
}

export interface UploadOptions {
  type: UploadType;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  /** Keep PNG/JPEG for bill logos — pdfkit cannot embed WebP. */
  outputMime?: "image/webp" | "image/jpeg" | "image/png";
  onProgress?: (progress: number) => void;
}

export async function readUploadResult(
  response: Response,
): Promise<UploadResult> {
  let parsed: unknown;
  try {
    parsed = (await response.json()) as unknown;
  } catch {
    // The worker or an edge proxy can return HTML/plain text during an outage.
  }

  const payload =
    parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Partial<UploadResult>)
      : {};

  if (response.ok && payload.success === true) {
    return payload as UploadResult;
  }

  const workerError =
    typeof payload.error === "string" && payload.error.trim()
      ? payload.error.trim()
      : undefined;
  const errorCode = classifyUploadError(workerError, response.status);

  return {
    ...payload,
    success: false,
    error: workerError || "Upload failed. Please try again.",
    errorCode,
    httpStatus: response.status,
  };
}

function classifyUploadError(
  message: string | undefined,
  status?: number,
): UploadErrorCode {
  if (
    status === 413 ||
    /\b(?:file too large|maximum (?:file )?size)\b/i.test(message || "")
  ) {
    return "FILE_TOO_LARGE";
  }
  if (
    status === 415 ||
    /\b(?:invalid|unsupported) file type\b/i.test(message || "")
  ) {
    return "INVALID_FILE_TYPE";
  }
  return status && status >= 400 ? "HTTP_ERROR" : "INVALID_RESPONSE";
}

export function isExpectedUploadValidationError(
  result: Pick<UploadResult, "errorCode">,
): boolean {
  return (
    result.errorCode === "FILE_TOO_LARGE" ||
    result.errorCode === "INVALID_FILE_TYPE"
  );
}

// Default sizing options by upload type
const DEFAULT_OPTIONS: Record<
  UploadType,
  { maxWidth: number; maxHeight: number; quality: number }
> = {
  product: { maxWidth: 1200, maxHeight: 1200, quality: 90 },
  profile: { maxWidth: 400, maxHeight: 400, quality: 90 },
  rfq: { maxWidth: 1200, maxHeight: 1200, quality: 90 },
  kyc: { maxWidth: 1600, maxHeight: 1600, quality: 95 },
  "review-proof": { maxWidth: 1600, maxHeight: 1600, quality: 95 },
  certificate: { maxWidth: 1600, maxHeight: 1600, quality: 90 },
};

/**
 * Compress and resize image on client side before upload
 * This reduces upload time and bandwidth while maintaining quality
 */
export async function compressImage(
  file: File,
  options: {
    maxWidth: number;
    maxHeight: number;
    quality: number;
    mimeType?: "image/webp" | "image/jpeg" | "image/png";
  },
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        const { maxWidth, maxHeight } = options;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        // Use high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = options.mimeType || "image/webp";
        const quality =
          mimeType === "image/png" ? undefined : options.quality / 100;
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
              return;
            }
            canvas.toBlob(
              (jpegBlob) => {
                if (jpegBlob) {
                  resolve(jpegBlob);
                } else {
                  reject(new Error("Failed to compress image"));
                }
              },
              "image/jpeg",
              options.quality / 100,
            );
          },
          mimeType,
          quality,
        );
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function filenameForCompressed(originalName: string, blob: Blob): string {
  const base = originalName.replace(/\.[^.]+$/, "") || "upload";
  if (blob.type === "image/png") return `${base}.png`;
  if (blob.type === "image/jpeg") return `${base}.jpg`;
  if (blob.type === "image/webp") return `${base}.webp`;
  return originalName;
}

/**
 * Upload an image file to the Cloudflare Worker
 */
export async function uploadImage(
  file: File,
  options: UploadOptions,
): Promise<UploadResult> {
  const { type, onProgress } = options;
  const defaults = DEFAULT_OPTIONS[type];

  const maxWidth = options.maxWidth || defaults.maxWidth;
  const maxHeight = options.maxHeight || defaults.maxHeight;
  const quality = options.quality || defaults.quality;

  try {
    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/avif",
    ];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: `Invalid file type. Allowed: ${allowedTypes.join(", ")}`,
        errorCode: "INVALID_FILE_TYPE",
      };
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        success: false,
        error: "File too large. Maximum size is 10MB",
        errorCode: "FILE_TOO_LARGE",
      };
    }

    onProgress?.(10);

    // Compress image on client side
    const compressedBlob = await compressImage(file, {
      maxWidth,
      maxHeight,
      quality,
      mimeType: options.outputMime,
    });

    onProgress?.(40);

    const formData = new FormData();
    formData.append(
      "file",
      compressedBlob,
      filenameForCompressed(file.name, compressedBlob),
    );
    const token = await getWorkerToken("upload", type);

    // Upload to worker
    const response = await fetch(`${getWorkerUrl()}/upload`, {
      method: "POST",
      headers: {
        "X-Upload-Type": type,
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    onProgress?.(90);

    const result = await readUploadResult(response);

    onProgress?.(100);

    return result;
  } catch (error) {
    console.error("Upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

const CERTIFICATE_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];
const CERTIFICATE_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const CERTIFICATE_MAX_PDF_BYTES = 5 * 1024 * 1024;

function isPdfFile(file: File): boolean {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}

/**
 * Upload a hallmark or gemstone certificate. Photos are resized/compressed
 * before upload. PDFs are stored as-is and must be 5MB or smaller.
 */
export async function uploadCertificate(
  file: File,
  options?: { onProgress?: (progress: number) => void },
): Promise<UploadResult> {
  const onProgress = options?.onProgress;
  const pdf = isPdfFile(file);
  const image = CERTIFICATE_IMAGE_TYPES.includes(file.type);

  if (!pdf && !image) {
    return {
      success: false,
      error: "Upload a photo (JPG, PNG, WebP) or a PDF.",
    };
  }
  if (pdf && file.size > CERTIFICATE_MAX_PDF_BYTES) {
    return {
      success: false,
      error:
        "PDF must be 5MB or smaller. Photograph the certificate instead to save space.",
    };
  }
  if (image && file.size > CERTIFICATE_MAX_IMAGE_BYTES) {
    return {
      success: false,
      error: "Image must be 10MB or smaller.",
    };
  }

  try {
    onProgress?.(10);
    let body: Blob = file;
    let filename = file.name;
    if (image) {
      const compressed = await compressImage(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 90,
        mimeType: "image/webp",
      });
      body = compressed;
      filename = filenameForCompressed(file.name, compressed);
    }
    onProgress?.(40);
    const upload = async (type: "certificate" | "kyc") => {
      const formData = new FormData();
      formData.append("file", body, filename);
      const token = await getWorkerToken("upload", type);
      const response = await fetch(`${getWorkerUrl()}/upload`, {
        method: "POST",
        headers: {
          "X-Upload-Type": type,
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      return await readUploadResult(response);
    };

    let result = await upload("certificate");
    if (
      image &&
      !result.success &&
      /invalid upload type/i.test(result.error || "")
    ) {
      result = await upload("kyc");
    }
    onProgress?.(100);
    return result;
  } catch (error) {
    console.error("Certificate upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Upload a base64 image string to the Cloudflare Worker
 */
export async function uploadBase64Image(
  base64Data: string,
  options: UploadOptions & { filename?: string },
): Promise<UploadResult> {
  const { type, filename = "image.jpg" } = options;

  try {
    const token = await getWorkerToken("upload", type);
    const response = await fetch(`${getWorkerUrl()}/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Upload-Type": type,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        data: base64Data,
        filename,
      }),
    });

    return await readUploadResult(response);
  } catch (error) {
    console.error("Upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Delete an image from R2
 */
export async function deleteImage(
  key: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getWorkerToken("delete");
    const response = await fetch(
      `${getWorkerUrl()}/delete/${encodeURIComponent(key)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return await response.json();
  } catch (error) {
    console.error("Delete error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Delete failed",
    };
  }
}

/** Upload an authenticated non-image attachment (KYC documents or chat files). */
export async function uploadAuthenticatedFile(
  file: File,
  type: "kyc" | "chat",
): Promise<UploadResult> {
  if (file.size > 10 * 1024 * 1024) {
    return {
      success: false,
      error: "File too large. Maximum size is 10MB",
      errorCode: "FILE_TOO_LARGE",
    };
  }
  try {
    const token = await getWorkerToken("upload", type);
    const formData = new FormData();
    formData.append("file", file, file.name);
    const response = await fetch(`${getWorkerUrl()}/upload`, {
      method: "POST",
      headers: {
        "X-Upload-Type": type,
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    return await readUploadResult(response);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Get the full URL for an image key
 */
export function getImageUrl(
  key: string,
  variant?: "original" | "medium" | "thumbnail",
): string {
  if (!key) return "";

  // If it's already a full URL, return as-is
  if (key.startsWith("http://") || key.startsWith("https://")) {
    return key;
  }

  // Build URL with optional variant query param
  let url = `${getWorkerUrl()}/${key}`;

  if (variant === "medium") {
    url += "?w=600";
  } else if (variant === "thumbnail") {
    url += "?w=200";
  }

  return url;
}

/**
 * Check if a string is a valid image URL or key
 */
export function isValidImageUrl(url: string): boolean {
  if (!url) return false;

  // Check if it's a full URL
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return true;
  }

  // Check if it's a valid key format (type/timestamp-random.ext)
  return /^(product|profile|rfq|designs|kyc|chat|certificate|review-proof)\/\d+-[a-z0-9]+\.(jpg|jpeg|png|webp|gif|avif)$/i.test(
    url,
  );
}
