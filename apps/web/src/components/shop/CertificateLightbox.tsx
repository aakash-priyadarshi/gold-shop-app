"use client";

import { T } from "@/components/ui/T";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { isCertificatePdfUrl } from "@/lib/certificates";
import { getImageUrl } from "@/lib/image-upload";
import { cn } from "@/lib/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useState, type ReactNode } from "react";

export function CertificateLightbox({
  url,
  label,
  open,
  onOpenChange,
}: {
  url: string;
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pdf = isCertificatePdfUrl(url);
  const src = getImageUrl(url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-[80]" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[90] flex w-[min(96vw,56rem)] max-h-[90dvh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border bg-background shadow-lg outline-none",
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <DialogTitle className="truncate text-sm font-semibold">
              {label}
            </DialogTitle>
            <DialogClose className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
              <X className="h-4 w-4" />
              <span className="sr-only">
                <T>Close</T>
              </span>
            </DialogClose>
          </div>
          <DialogDescription className="sr-only">
            <T>Certificate preview</T>
          </DialogDescription>
          <div className="min-h-0 flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
            {pdf ? (
              <iframe
                title={label}
                src={src}
                className="h-[min(80dvh,720px)] w-full border-0 bg-white"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={label}
                className="mx-auto max-h-[80dvh] w-auto max-w-full object-contain p-3"
              />
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

export function CertificatePreviewButton({
  url,
  label,
  className,
  children,
}: {
  url: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
      >
        {children}
      </button>
      <CertificateLightbox
        url={url}
        label={label}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
