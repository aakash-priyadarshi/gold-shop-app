"use client";

import { ProductCertificatesPanel } from "@/components/shop/ProductCertificatesPanel";
import { SellerProductBreakdown } from "@/components/shop/SellerProductBreakdown";
import { T } from "@/components/ui/T";
import {
  formatCurrencyAmount,
  type SupportedCurrencyCode,
} from "@/lib/currency";
import { getImageUrl } from "@/lib/image-upload";
import { parseProductGemstones } from "@/lib/inventory/productBreakdown";
import { hallmarkIdLabel } from "@gold-shop/shared";
import { ScanLine } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import type { WeightUnit } from "@gold-shop/shared";

export type WalkInProduct = {
  nameEn: string;
  sku?: string;
  jewelleryType?: string;
  images?: string[];
  totalPriceNpr?: number;
  hallmarkNumber?: string;
  assayOffice?: string;
  descriptionEn?: string;
  descriptionNe?: string;
  certificateUrl?: string | null;
  purityCertUrl?: string | null;
  composition?: unknown;
  gemstones?: unknown;
  totalWeightGrams?: number;
  weightGrams?: number;
  metalValueNpr?: number;
  makingChargeNpr?: number;
  wastagePercent?: number;
  gemstoneValueNpr?: number;
  taxNpr?: number;
  variants?: Array<{
    id: string;
    sizeLabel?: string;
    size?: string;
    stock?: number;
    priceOverride?: number;
    isActive?: boolean;
  }>;
  setComponents?: Array<{
    id: string;
    role?: string | null;
    componentItem?: {
      id: string;
      nameEn: string;
      sku?: string;
      jewelleryType?: string;
      totalWeightGrams?: number;
      totalPriceNpr?: number;
    };
  }>;
};

export function WalkInProductView({
  item,
  currency,
  weightUnit,
}: {
  item: WalkInProduct;
  currency: SupportedCurrencyCode;
  weightUnit: WeightUnit;
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const images = useMemo(
    () => (item.images ?? []).filter(Boolean).map((src) => getImageUrl(src)),
    [item.images],
  );
  const image = images[imageIndex] ?? images[0];
  const variants = (item.variants ?? []).filter(
    (variant) => variant.isActive !== false,
  );
  const setPieces = item.setComponents ?? [];
  const gemstones = parseProductGemstones(item);
  const idLabel = item.hallmarkNumber
    ? hallmarkIdLabel(item.hallmarkNumber)
    : "";

  return (
    <div className="space-y-4">
      <div className="aspect-square w-full rounded-2xl bg-gray-100 dark:bg-gray-900 relative overflow-hidden">
        {image ? (
          <Image
            src={image}
            alt={item.nameEn}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <ScanLine className="h-12 w-12 text-gray-300" />
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((src, index) => (
            <button
              key={src}
              type="button"
              onClick={() => setImageIndex(index)}
              className={`relative h-14 w-14 flex-shrink-0 rounded-xl overflow-hidden border ${
                index === imageIndex
                  ? "border-amber-500"
                  : "border-gray-200 dark:border-gray-800"
              }`}
            >
              <Image src={src} alt="" fill className="object-cover" sizes="56px" />
            </button>
          ))}
        </div>
      )}

      <div className="space-y-1">
        <h2 className="text-xl font-bold leading-tight">{item.nameEn}</h2>
        {item.totalPriceNpr != null && (
          <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
            {formatCurrencyAmount(item.totalPriceNpr, currency, { decimals: 2 })}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {item.jewelleryType && (
            <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300">
              {item.jewelleryType.replace(/_/g, " ")}
            </span>
          )}
          {item.sku && (
            <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-500">
              SKU {item.sku}
            </span>
          )}
          {item.hallmarkNumber && (
            <span className="px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-xs text-amber-800 dark:text-amber-200">
              {idLabel} {item.hallmarkNumber}
            </span>
          )}
          {item.assayOffice && (
            <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-600">
              {item.assayOffice}
            </span>
          )}
        </div>
      </div>

      <SellerProductBreakdown
        item={item}
        currency={currency}
        weightUnit={weightUnit}
      />

      {setPieces.length > 0 && (
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase text-gray-400">
            <T>Set pieces</T>
          </p>
          {setPieces.map((piece) => (
            <div
              key={piece.id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {piece.componentItem?.nameEn}
                </p>
                <p className="text-[11px] text-gray-400">
                  {[piece.role, piece.componentItem?.sku]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              {piece.componentItem?.totalPriceNpr != null && (
                <p className="tabular-nums text-gray-700 dark:text-gray-200">
                  {formatCurrencyAmount(
                    piece.componentItem.totalPriceNpr,
                    currency,
                    { decimals: 2 },
                  )}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {variants.length > 0 && (
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase text-gray-400">
            <T>Sizes</T>
          </p>
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => (
              <span
                key={variant.id}
                className="rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm"
              >
                {variant.sizeLabel || variant.size}
                {variant.priceOverride != null
                  ? ` · ${formatCurrencyAmount(variant.priceOverride, currency, { decimals: 2 })}`
                  : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {(item.descriptionEn || item.descriptionNe) && (
        <div className="rounded-2xl bg-gray-50 dark:bg-gray-900 p-4">
          <p className="text-xs font-semibold uppercase text-gray-400 mb-2">
            <T>Description</T>
          </p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {item.descriptionEn || item.descriptionNe}
          </p>
        </div>
      )}

      <ProductCertificatesPanel
        certificateUrl={item.certificateUrl}
        purityCertUrl={item.purityCertUrl}
        gemstones={gemstones}
      />
    </div>
  );
}
