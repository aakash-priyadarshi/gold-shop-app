'use client';

import { useState, useCallback } from 'react';
import { uploadImage, deleteImage, type UploadType, type UploadResult } from '@/lib/image-upload';

interface UseImageUploadOptions {
  type: UploadType;
  maxFiles?: number;
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: string) => void;
}

interface UseImageUploadReturn {
  uploading: boolean;
  progress: number;
  error: string | null;
  upload: (file: File) => Promise<UploadResult>;
  uploadMultiple: (files: FileList | File[]) => Promise<UploadResult[]>;
  remove: (key: string) => Promise<boolean>;
  reset: () => void;
}

/**
 * Hook for handling image uploads to Cloudflare R2
 * 
 * Usage:
 * ```tsx
 * const { uploading, progress, upload, error } = useImageUpload({ type: 'product' });
 * 
 * const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
 *   const file = e.target.files?.[0];
 *   if (file) {
 *     const result = await upload(file);
 *     if (result.success) {
 *       // Use result.url
 *     }
 *   }
 * };
 * ```
 */
export function useImageUpload(options: UseImageUploadOptions): UseImageUploadReturn {
  const { type, maxFiles = 10, onSuccess, onError } = options;
  
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setError(null);
  }, []);

  const upload = useCallback(async (file: File): Promise<UploadResult> => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const result = await uploadImage(file, {
        type,
        onProgress: setProgress,
      });

      if (result.success) {
        onSuccess?.(result);
      } else {
        setError(result.error || 'Upload failed');
        onError?.(result.error || 'Upload failed');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      onError?.(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setUploading(false);
    }
  }, [type, onSuccess, onError]);

  const uploadMultiple = useCallback(async (files: FileList | File[]): Promise<UploadResult[]> => {
    const fileArray = Array.from(files).slice(0, maxFiles);
    
    setUploading(true);
    setProgress(0);
    setError(null);

    const results: UploadResult[] = [];
    const totalFiles = fileArray.length;

    for (let i = 0; i < totalFiles; i++) {
      try {
        const result = await uploadImage(fileArray[i], {
          type,
          onProgress: (fileProgress) => {
            // Calculate overall progress
            const overallProgress = ((i * 100) + fileProgress) / totalFiles;
            setProgress(Math.round(overallProgress));
          },
        });

        results.push(result);

        if (result.success) {
          onSuccess?.(result);
        } else {
          onError?.(result.error || `Failed to upload ${fileArray[i].name}`);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Upload failed';
        results.push({ success: false, error: errorMessage });
        onError?.(errorMessage);
      }
    }

    setUploading(false);
    setProgress(100);

    return results;
  }, [type, maxFiles, onSuccess, onError]);

  const remove = useCallback(async (key: string): Promise<boolean> => {
    try {
      const result = await deleteImage(key);
      return result.success;
    } catch {
      return false;
    }
  }, []);

  return {
    uploading,
    progress,
    error,
    upload,
    uploadMultiple,
    remove,
    reset,
  };
}
