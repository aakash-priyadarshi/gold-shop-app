"use client";

import {
  WalkInProductView,
  type WalkInProduct,
} from "@/components/shop/WalkInProductView";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { useMarket } from "@/hooks/useMarket";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import { inventoryApi, posApi } from "@/lib/api";
import { useT } from "@/providers/translation-provider";
import { Loader2, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export type SellerProductDetail = WalkInProduct & {
  id: string;
  status?: string;
  stockQuantity?: number;
};

export function SellerProductDetailDialog({
  item,
  open,
  onOpenChange,
  onAddedToPos,
}: {
  item: SellerProductDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddedToPos?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const t = useT();
  const { currencyCode } = useShopCurrency();
  const { selectedWeightUnit } = useMarket();
  const [detail, setDetail] = useState<SellerProductDetail | null>(item);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [variantId, setVariantId] = useState("");

  useEffect(() => {
    if (!open || !item?.id) return;
    let active = true;
    setDetail(item);
    setVariantId("");
    setLoading(true);
    Promise.allSettled([
      inventoryApi.getById(item.id),
      posApi.getActiveSession(),
    ])
      .then(([productResult, sessionResult]) => {
        if (!active) return;
        if (productResult.status === "fulfilled") {
          setDetail(productResult.value.data ?? item);
        }
        setHasActiveSession(
          sessionResult.status === "fulfilled" &&
            Boolean(sessionResult.value.data?.id),
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [item, open]);

  const sellableVariants = useMemo(
    () =>
      (detail?.variants ?? []).filter(
        (variant) =>
          variant.isActive !== false && (variant.stock ?? 0) > 0,
      ),
    [detail?.variants],
  );
  const requiresVariant = (detail?.variants?.length ?? 0) > 0;
  const outOfStock =
    requiresVariant
      ? sellableVariants.length === 0
      : (detail?.stockQuantity ?? 1) <= 0 || detail?.status === "SOLD";

  const addToPos = async () => {
    if (!detail) return;
    if (requiresVariant && !variantId) {
      toast({
        title: t("Choose a size or variant"),
        variant: "destructive",
      });
      return;
    }

    setAdding(true);
    try {
      const active = await posApi.getActiveSession();
      let session = active.data;
      let startedSession = false;
      if (!session?.id) {
        const created = await posApi.createSession({});
        session = created.data;
        startedSession = true;
      }
      await posApi.addItems(session.id, [
        {
          inventoryItemId: detail.id,
          variantId: variantId || undefined,
          qty: 1,
        },
      ]);
      toast({ title: t("Item added to POS basket") });
      await onAddedToPos?.();
      onOpenChange(false);
      if (startedSession) router.push("/dashboard/shop/pos");
    } catch (error: any) {
      toast({
        title: t("Could not add item to POS"),
        description:
          error?.response?.data?.message || t("Please check stock and try again"),
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle><T>Product details</T></DialogTitle>
          <DialogDescription>
            <T>Review the complete product record before adding it to the POS basket.</T>
          </DialogDescription>
        </DialogHeader>

        {loading && !detail ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
          </div>
        ) : detail ? (
          <WalkInProductView
            item={detail}
            currency={currencyCode}
            weightUnit={selectedWeightUnit}
          />
        ) : null}

        {sellableVariants.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium"><T>Size or variant</T></p>
            <Select value={variantId} onValueChange={setVariantId}>
              <SelectTrigger>
                <SelectValue placeholder={t("Choose a size or variant")} />
              </SelectTrigger>
              <SelectContent>
                {sellableVariants.map((variant) => (
                  <SelectItem key={variant.id} value={variant.id}>
                    {variant.sizeLabel || variant.size || t("Variant")} · {variant.stock} <T>in stock</T>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <T>Close</T>
          </Button>
          <Button onClick={addToPos} disabled={adding || outOfStock || !detail}>
            {adding ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ShoppingCart className="h-4 w-4 mr-2" />
            )}
            {outOfStock ? (
              <T>Out of stock</T>
            ) : hasActiveSession ? (
              <T>Add to POS basket</T>
            ) : (
              <T>Start POS and add</T>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
