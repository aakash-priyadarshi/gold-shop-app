"use client";

import {
  AiCreditCostHint,
  AiCreditsDepletedNotice,
} from "@/components/ai/AiCreditsDepletedNotice";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { T } from "@/components/ui/T";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useFeatures } from "@/hooks/useFeatures";
import { useT } from "@/providers/translation-provider";
import { inventoryApi, aiCreditsApi } from "@/lib/api";
import { isInsufficientAiCreditsError } from "@/lib/aiCredits";
import { specsLockMessage } from "@/lib/productDescriptionUi";
import {
  AI_CREDIT_COSTS,
  buildHardcodedProductDescription,
  hasEnoughAiCredits,
  missingProductDescriptionLabels,
  productDescriptionSpecsReady,
  toCreditNumber,
  type ProductDescriptionSpecs,
} from "@gold-shop/shared";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

type Props = {
  shopId?: string;
  value: string;
  onChange: (next: string) => void;
  specs: ProductDescriptionSpecs;
};

function LockedButton({
  locked,
  reason,
  children,
}: {
  locked: boolean;
  reason: string;
  children: ReactNode;
}) {
  if (!locked) return <>{children}</>;
  return (
    <span className="inline-flex" title={reason}>
      {children}
    </span>
  );
}

export function ProductDescriptionGenerator({
  shopId,
  value,
  onChange,
  specs,
}: Props) {
  const t = useT();
  const { hasFeature, loading: featuresLoading } = useFeatures();
  const canUseAi = hasFeature("aiDesignGeneration");
  const specsReady = productDescriptionSpecsReady(specs);
  const missing = useMemo(
    () => missingProductDescriptionLabels(specs),
    [specs],
  );
  const lockReason = t(specsLockMessage(missing, canUseAi));
  const [balance, setBalance] = useState<number | null>(null);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [creditsDepleted, setCreditsDepleted] = useState(false);

  useEffect(() => {
    if (!canUseAi) return;
    aiCreditsApi
      .getBalance()
      .then((res) => {
        setBalance(toCreditNumber(res.data?.balance));
      })
      .catch(() => undefined);
  }, [canUseAi]);

  const enoughCredits = hasEnoughAiCredits(
    balance ?? 0,
    AI_CREDIT_COSTS.PRODUCT_DESCRIPTION,
  );

  const fillFromSpecs = () => {
    if (!specsReady) return;
    setTemplateBusy(true);
    try {
      onChange(buildHardcodedProductDescription(specs));
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("Could not generate description"),
        description:
          error instanceof Error ? error.message : t("Check the product specs"),
      });
    } finally {
      setTemplateBusy(false);
    }
  };

  const generateWithAi = async () => {
    if (!shopId || !specsReady || !canUseAi) return;
    if (balance !== null && !enoughCredits) {
      setCreditsDepleted(true);
      return;
    }
    setAiBusy(true);
    setCreditsDepleted(false);
    try {
      const res = await inventoryApi.generateDescription(shopId, {
        jewelleryType: specs.jewelleryType,
        metalType: specs.metalType,
        purity: specs.purity,
        weightGrams: specs.weightGrams,
        weightUnit: specs.weightUnit,
        gemstones: specs.gemstones,
        idempotencyKey:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `desc-${Date.now()}`,
      });
      const description = res.data?.description || res.data?.data?.description;
      if (!description) {
        throw new Error(t("Empty AI response"));
      }
      onChange(description);
      if (typeof res.data?.balanceAfter === "number") {
        setBalance(toCreditNumber(res.data.balanceAfter));
      } else {
        setBalance((prev) =>
          prev == null
            ? prev
            : toCreditNumber(prev - AI_CREDIT_COSTS.PRODUCT_DESCRIPTION),
        );
      }
    } catch (error: unknown) {
      if (isInsufficientAiCreditsError(error)) {
        setCreditsDepleted(true);
        const payload = (
          error as { response?: { data?: { balance?: number } } }
        )?.response?.data;
        if (typeof payload?.balance === "number") {
          setBalance(toCreditNumber(payload.balance));
        }
        return;
      }
      const payload = (error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast({
        variant: "destructive",
        title: t("AI generation failed"),
        description: payload || t("Try the template and edit it yourself."),
      });
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="col-span-2 space-y-2" data-tour="product-desc-generate">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="description">
          <T>Description</T>
        </Label>
        <div className="flex flex-wrap justify-end gap-1.5">
          <LockedButton locked={!specsReady} reason={lockReason}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={!specsReady || templateBusy}
              onClick={fillFromSpecs}
            >
              {templateBusy ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Wand2 className="mr-1 h-3 w-3" />
              )}
              <T>Fill from specs</T>
            </Button>
          </LockedButton>
          {canUseAi && (
            <LockedButton locked={!specsReady} reason={lockReason}>
              <Button
                type="button"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={!specsReady || aiBusy || featuresLoading}
                onClick={generateWithAi}
              >
                {aiBusy ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 h-3 w-3" />
                )}
                <T>Generate with AI</T>
              </Button>
            </LockedButton>
          )}
        </div>
      </div>
      <Textarea
        id="description"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("Describe your product...")}
        rows={3}
      />
      {!specsReady ? (
        <p className="text-[11px] text-muted-foreground">{lockReason}</p>
      ) : canUseAi ? (
        <AiCreditCostHint
          cost={AI_CREDIT_COSTS.PRODUCT_DESCRIPTION}
          balance={balance}
        />
      ) : (
        <p className="text-[11px] text-muted-foreground">
          <T>Fill from specs is free on every plan. Pro+ can also Generate with AI.</T>
        </p>
      )}
      {creditsDepleted && !enoughCredits && (
        <AiCreditsDepletedNotice
          action="Generate with AI"
          required={AI_CREDIT_COSTS.PRODUCT_DESCRIPTION}
          balance={balance}
        />
      )}
    </div>
  );
}
