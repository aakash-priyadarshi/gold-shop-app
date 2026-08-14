"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { WalkInProductView, type WalkInProduct } from "@/components/shop/WalkInProductView";
import { T } from "@/components/ui/T";
import { useAuth } from "@/hooks/useAuth";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import { useMarket } from "@/hooks/useMarket";
import { inventoryApi } from "@/lib/api";
import type { SupportedCurrencyCode } from "@/lib/currency";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function ShopProductWalkInPage() {
  return (
    <ShopGuard>
      <ShopProductWalkInBody />
    </ShopGuard>
  );
}

function ShopProductWalkInBody() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { currencyCode } = useShopCurrency();
  const { selectedWeightUnit } = useMarket();
  const [item, setItem] = useState<WalkInProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <header className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur">
        <Link
          href="/dashboard/shop/products"
          className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
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
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
        </div>
      ) : error || !item ? (
        <p className="px-6 py-16 text-center text-sm text-gray-600">
          {error || <T>Product not found</T>}
        </p>
      ) : (
        <div className="mx-auto max-w-xl px-4 py-4 pb-10">
          <WalkInProductView
            item={item}
            currency={currencyCode as SupportedCurrencyCode}
            weightUnit={selectedWeightUnit}
          />
        </div>
      )}
    </div>
  );
}
