"use client";

import { T } from "@/components/ui/T";
import {
  collectProductCertificates,
  isCertificatePdfUrl,
  type ProductCertificateGem,
} from "@/lib/certificates";
import { getImageUrl } from "@/lib/image-upload";
import { FileText } from "lucide-react";

export function ProductCertificatesPanel({
  certificateUrl,
  purityCertUrl,
  gemstones,
}: {
  certificateUrl?: string | null;
  purityCertUrl?: string | null;
  gemstones?: ProductCertificateGem[] | null;
}) {
  const links = collectProductCertificates({
    certificateUrl,
    purityCertUrl,
    gemstones,
  });
  if (links.length === 0) return null;

  return (
    <div
      data-tour="product-certificates-view"
      className="rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-3"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
        <T>Certificates</T>
      </p>
      <div className="space-y-2">
        {links.map((link) => {
          const pdf = isCertificatePdfUrl(link.url);
          const href = pdf ? link.url : getImageUrl(link.url);
          return (
            <a
              key={`${link.kind}-${link.url}`}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-amber-100 dark:border-amber-900/30 bg-white dark:bg-gray-900 p-3 hover:border-amber-300"
            >
              {pdf ? (
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50 text-amber-800">
                  <FileText className="h-5 w-5" />
                </span>
              ) : (
                <span className="relative h-12 w-12 overflow-hidden rounded-lg bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={href} alt="" className="h-full w-full object-cover" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-amber-800 dark:text-amber-300">
                  <T>See certificate</T>
                </span>
                <span className="block text-[11px] text-gray-500 truncate">
                  {link.label}
                </span>
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
