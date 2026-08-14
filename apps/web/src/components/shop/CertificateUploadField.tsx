"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { isCertificatePdfUrl } from "@/lib/certificates";
import { getImageUrl, uploadCertificate } from "@/lib/image-upload";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

export function CertificateUploadField({
  label,
  hint,
  value,
  onChange,
}: {
  label: ReactNode;
  hint?: ReactNode;
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const pdf = isCertificatePdfUrl(value);
  const preview = value && !pdf ? getImageUrl(value) : "";

  const handleFile = async (file: File) => {
    setUploading(true);
    setProgress(0);
    try {
      const result = await uploadCertificate(file, { onProgress: setProgress });
      if (result.success && result.url) {
        onChange(result.url);
        toast({
          title: "Certificate uploaded",
          description: "Photos are compressed. PDFs stay under 5MB.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Upload failed",
          description: result.error || "Could not upload this file",
        });
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      {value ? (
        <div className="flex items-center gap-3 rounded-lg border bg-background p-2">
          {pdf ? (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-14 w-14 items-center justify-center rounded-md bg-amber-50 text-amber-800"
            >
              <FileText className="h-6 w-6" />
            </a>
          ) : (
            <a
              href={preview}
              target="_blank"
              rel="noopener noreferrer"
              className="relative h-14 w-14 overflow-hidden rounded-md bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="h-full w-full object-cover" />
            </a>
          )}
          <div className="min-w-0 flex-1">
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-amber-800 underline truncate block"
            >
              {pdf ? <T>View PDF</T> : <T>View certificate</T>}
            </a>
            <p className="text-[11px] text-muted-foreground">
              <T>Replace or remove anytime.</T>
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-red-600"
            onClick={() => onChange("")}
            aria-label="Remove certificate"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {uploading ? `${progress}%` : <T>Upload photo or PDF</T>}
        </Button>
      )}
      {hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
