"use client";

import { MobileFeatureGate } from "@/components/mobile/MobileFeatureGate";
import { SellerProductBreakdown } from "@/components/shop/SellerProductBreakdown";
import { T } from "@/components/ui/T";
import { useAuth } from "@/hooks/useAuth";
import { useMarket } from "@/hooks/useMarket";
import {
  formatCurrencyAmount,
  getCurrencyForCountry,
  type SupportedCurrencyCode,
} from "@/lib/currency";
import { getImageUrl } from "@/lib/image-upload";
import { inventoryApi } from "@/lib/api";
import { ArrowLeft, Loader2, ScanLine } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type ProductRecord = {
  id: string;
  shopId?: string;
  nameEn: string;
  sku?: string;
  images?: string[];
  jewelleryType?: string;
  descriptionEn?: string;
  descriptionNe?: string;
  hallmarkNumber?: string;
  assayOffice?: string;
  certificateUrl?: string;
  stockQuantity?: number;
  totalPriceNpr?: number;
  composition?: unknown;
  gemstones?: unknown;
  totalWeightGrams?: number;
  metalValueNpr?: number;
  makingChargeNpr?: number;
  wastagePercent?: number;
  gemstoneValueNpr?: number;
  taxNpr?: number;
  setDiscountType?: string | null;
  setDiscountValue?: number | null;
  labels?: string[];
  shop?: { id?: string; shopName?: string };
  variants?: Array<{
    id: string;
    sizeLabel: string;
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

export default function MobileProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { selectedWeightUnit } = useMarket();
  const [item, setItem] = useState<ProductRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageIndex, setImageIndex] = useState(0);

  const shopCurrency: SupportedCurrencyCode =
    (user?.shop?.currency as SupportedCurrencyCode | undefined) ??
    getCurrencyForCountry(user?.shop?.country, "NPR");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await inventoryApi.getById(id);
      const data = (res.data ?? res) as ProductRecord;
      const ownerId = data.shopId ?? data.shop?.id;
      if (user?.shop?.id && ownerId && ownerId !== user.shop.id) {
        setError("This piece is not in your shop inventory.");
        setItem(null);
        return;
      }
      setItem(data);
      setImageIndex(0);
    } catch {
      setError("Could not load this product.");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [id, user?.shop?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const images = useMemo(
    () => (item?.images ?? []).filter(Boolean).map((src) => getImageUrl(src)),
    [item],
  );
  const image = images[imageIndex] ?? images[0];
  const variants = (item?.variants ?? []).filter((variant) => variant.isActive !== false);
  const setPieces = item?.setComponents ?? [];

  return (
    <MobileFeatureGate feature="mobilePOS" featureName="Mobile POS">
      <div className="flex flex-col min-h-full bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <header className="sticky top-0 z-10 flex items-center gap-2 px-3 py-3 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                router.back();
              } else {
                router.push("/m/pos");
              }
            }}
            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
              <T>Show to customer</T>
            </p>
            <h1 className="text-sm font-semibold truncate">
              {item?.nameEn || <T>Product details</T>}
            </h1>
          </div>
        </header>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
          </div>
        ) : error || !item ? (
          <div className="flex-1 px-6 py-16 text-center space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {error || <T>Product not found</T>}
            </p>
            <Link href="/m/pos" className="text-sm font-semibold text-amber-700 underline">
              <T>Back to POS</T>
            </Link>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-8">
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
              <p className="text-lg font-bold text-amber-700">
                {formatCurrencyAmount(item.totalPriceNpr ?? 0, shopCurrency, {
                  decimals: 2,
                })}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(item.labels ?? []).includes("demo") && (
                  <span className="px-2 py-1 rounded-full bg-emerald-50 text-xs font-semibold text-emerald-800">
                    <T>Sample piece</T>
                  </span>
                )}
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
                  <span className="px-2 py-1 rounded-full bg-amber-50 text-xs text-amber-800">
                    HUID {item.hallmarkNumber}
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
              currency={shopCurrency}
              weightUnit={selectedWeightUnit}
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
                          shopCurrency,
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
                      {variant.sizeLabel}
                      {variant.priceOverride != null
                        ? ` · ${formatCurrencyAmount(variant.priceOverride, shopCurrency, { decimals: 2 })}`
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

            {item.certificateUrl && (
              <a
                href={item.certificateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-sm font-semibold text-amber-700 underline"
              >
                <T>View certificate</T>
              </a>
            )}
          </div>
        )}
      </div>
    </MobileFeatureGate>
  );
}
