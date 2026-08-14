"use client";

import { MobileFeatureGate } from "@/components/mobile/MobileFeatureGate";
import { WalkInProductView, type WalkInProduct } from "@/components/shop/WalkInProductView";
import { T } from "@/components/ui/T";
import { useAuth } from "@/hooks/useAuth";
import { useMarket } from "@/hooks/useMarket";
import {
  getCurrencyForCountry,
  type SupportedCurrencyCode,
} from "@/lib/currency";
import { inventoryApi } from "@/lib/api";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function MobileProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { selectedWeightUnit } = useMarket();
  const [item, setItem] = useState<WalkInProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const shopCurrency: SupportedCurrencyCode =
    (user?.shop?.currency as SupportedCurrencyCode | undefined) ??
    getCurrencyForCountry(user?.shop?.country, "NPR");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await inventoryApi.getById(id);
      const data = (res.data ?? res) as WalkInProduct & {
        shopId?: string;
        shop?: { id?: string };
      };
      const ownerId = data.shopId ?? data.shop?.id;
      if (user?.shop?.id && ownerId && ownerId !== user.shop.id) {
        setError("This piece is not in your shop inventory.");
        setItem(null);
        return;
      }
      setItem(data);
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
          <div className="flex-1 overflow-y-auto px-4 py-4 pb-8">
            <WalkInProductView
              item={item}
              currency={shopCurrency}
              weightUnit={selectedWeightUnit}
            />
          </div>
        )}
      </div>
    </MobileFeatureGate>
  );
}
