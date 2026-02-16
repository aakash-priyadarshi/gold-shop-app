/**
 * Image Upload Service
 * 
 * Handles image uploads to Cloudflare R2 via Worker.
 * Supports different upload types: product, profile, rfq
 */

// Get the worker URL from environment or use default
const WORKER_URL = process.env.NEXT_PUBLIC_IMAGE_WORKER_URL || 'https://images.orivraa.com';

export type UploadType = 'product' | 'profile' | 'rfq' | 'kyc';

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
}

export interface UploadOptions {
  type: UploadType;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  onProgress?: (progress: number) => void;
}

// Default sizing options by upload type
const DEFAULT_OPTIONS: Record<UploadType, { maxWidth: number; maxHeight: number; quality: number }> = {
  product: { maxWidth: 1200, maxHeight: 1200, quality: 90 },
  profile: { maxWidth: 400, maxHeight: 400, quality: 90 },
  rfq: { maxWidth: 1200, maxHeight: 1200, quality: 90 },
  kyc: { maxWidth: 1600, maxHeight: 1600, quality: 95 },
};

/**
 * Compress and resize image on client side before upload
 * This reduces upload time and bandwidth while maintaining quality
 */
export async function compressImage(
  file: File,
  options: { maxWidth: number; maxHeight: number; quality: number }
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
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
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP if supported, otherwise JPEG
        const mimeType = 'image/webp';
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              // Fallback to JPEG if WebP fails
              canvas.toBlob(
                (jpegBlob) => {
                  if (jpegBlob) {
                    resolve(jpegBlob);
                  } else {
                    reject(new Error('Failed to compress image'));
                  }
                },
                'image/jpeg',
                options.quality / 100
              );
            }
          },
          mimeType,
          options.quality / 100
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload an image file to the Cloudflare Worker
 */
export async function uploadImage(
  file: File,
  options: UploadOptions
): Promise<UploadResult> {
  const { type, onProgress } = options;
  const defaults = DEFAULT_OPTIONS[type];
  
  const maxWidth = options.maxWidth || defaults.maxWidth;
  const maxHeight = options.maxHeight || defaults.maxHeight;
  const quality = options.quality || defaults.quality;

  try {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}`,
      };
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'File too large. Maximum size is 10MB',
      };
    }

    onProgress?.(10);

    // Compress image on client side
    const compressedBlob = await compressImage(file, { maxWidth, maxHeight, quality });
    
    onProgress?.(40);

    // Create form data
    const formData = new FormData();
    formData.append('file', compressedBlob, file.name);

    // Upload to worker
    const response = await fetch(`${WORKER_URL}/upload`, {
      method: 'POST',
      headers: {
        'X-Upload-Type': type,
      },
      body: formData,
    });

    onProgress?.(90);

    const result: UploadResult = await response.json();
    
    onProgress?.(100);

    return result;
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Upload a base64 image string to the Cloudflare Worker
 */
export async function uploadBase64Image(
  base64Data: string,
  options: UploadOptions & { filename?: string }
): Promise<UploadResult> {
  const { type, filename = 'image.jpg' } = options;

  try {
    const response = await fetch(`${WORKER_URL}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Upload-Type': type,
      },
      body: JSON.stringify({
        data: base64Data,
        filename,
      }),
    });

    return await response.json();
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Delete an image from R2
 */
export async function deleteImage(key: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${WORKER_URL}/delete/${encodeURIComponent(key)}`, {
      method: 'DELETE',
    });
    return await response.json();
  } catch (error) {
    console.error('Delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
}

/**
 * Get the full URL for an image key
 */
export function getImageUrl(key: string, variant?: 'original' | 'medium' | 'thumbnail'): string {
  if (!key) return '';
  
  // If it's already a full URL, return as-is
  if (key.startsWith('http://') || key.startsWith('https://')) {
    return key;
  }
  
  // Build URL with optional variant query param
  let url = `${WORKER_URL}/${key}`;
  
  if (variant === 'medium') {
    url += '?w=600';
  } else if (variant === 'thumbnail') {
    url += '?w=200';
  }
  
  return url;
}

/**
 * Check if a string is a valid image URL or key
 */
export function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  
  // Check if it's a full URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return true;
  }
  
  // Check if it's a valid key format (type/timestamp-random.ext)
  return /^(product|profile|rfq)\/\d+-[a-z0-9]+\.(jpg|jpeg|png|webp|gif)$/i.test(url);
}
