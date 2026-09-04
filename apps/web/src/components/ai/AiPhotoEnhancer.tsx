"use client";

import { AiCreditCostHint, AiCreditsDepletedNotice } from "@/components/ai/AiCreditsDepletedNotice";
import { AiImageModelPicker } from "@/components/ai/AiImageModelPicker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { useFeatures } from "@/hooks/useFeatures";
import { aiCreditsApi, inventoryApi } from "@/lib/api";
import { isInsufficientAiCreditsError } from "@/lib/aiCredits";
import { useT } from "@/providers/translation-provider";
import {
  AI_IMAGE_MODELS,
  DEFAULT_ENHANCEMENT_MODEL,
  enhancementCreditCost,
  hasEnoughAiCredits,
  toCreditNumber,
  type AiEnhancementModelId,
} from "@gold-shop/shared";
import {
  CircleAlert,
  Crown,
  ImageOff,
  Loader2,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type EnhancementResult = {
  sourceUrl: string;
  status: "success" | "failed";
  enhancedUrl?: string;
  error?: string;
};

type Props = {
  shopId: string;
  images: string[];
  onChange: (images: string[]) => void;
  targetIndex?: number;
  context?: {
    name?: string;
    jewelleryType?: string;
    metal?: string;
    purity?: string;
  };
  trigger?: "icon" | "button";
  className?: string;
};

export function AiPhotoEnhancer({
  shopId,
  images,
  onChange,
  targetIndex,
  context,
  trigger = "button",
  className,
}: Props) {
  const t = useT();
  const { hasFeature, loading: featuresLoading } = useFeatures();
  const canEnhance = hasFeature("aiImageEnhancement");
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState<AiEnhancementModelId>(
    DEFAULT_ENHANCEMENT_MODEL,
  );
  const [balance, setBalance] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [creditsDepleted, setCreditsDepleted] = useState(false);
  const [results, setResults] = useState<EnhancementResult[]>([]);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());

  const targets = useMemo(
    () =>
      typeof targetIndex === "number" && images[targetIndex]
        ? [images[targetIndex]]
        : images,
    [images, targetIndex],
  );
  const cost = enhancementCreditCost(AI_IMAGE_MODELS[model], targets.length);

  useEffect(() => {
    if (!open || !canEnhance) return;
    aiCreditsApi
      .getBalance()
      .then((response) => setBalance(toCreditNumber(response.data?.balance)))
      .catch(() => undefined);
  }, [open, canEnhance]);

  const requestEnhancement = async (requestedTargets: string[]) => {
    const requestedCost = enhancementCreditCost(
      AI_IMAGE_MODELS[model],
      requestedTargets.length,
    );
    if (balance !== null && !hasEnoughAiCredits(balance, requestedCost)) {
      setCreditsDepleted(true);
      return;
    }
    setBusy(true);
    setCreditsDepleted(false);
    try {
      const response = await inventoryApi.enhanceImages(shopId, {
        imageUrls: requestedTargets,
        referenceImageUrls:
          requestedTargets.length === 1
            ? images.filter((url) => url !== requestedTargets[0])
            : undefined,
        model,
        context,
      });
      const nextResults = (response.data?.results || []) as EnhancementResult[];
      setResults((current) => {
        const requested = new Set(requestedTargets);
        return [
          ...current.filter((item) => !requested.has(item.sourceUrl)),
          ...nextResults,
        ];
      });
      if (typeof response.data?.balanceAfter === "number") {
        setBalance(toCreditNumber(response.data.balanceAfter));
      } else {
        setBalance((current) =>
          current == null
            ? current
            : toCreditNumber(
                current -
                  Number(response.data?.creditsCharged || 0) +
                  Number(response.data?.creditsRefunded || 0),
              ),
        );
      }
      const failures = nextResults.filter((item) => item.status === "failed").length;
      if (failures) {
        toast({
          title: t("Some photos could not be enhanced"),
          description: t("Failed photos were refunded and can be retried."),
        });
      }
    } catch (error: unknown) {
      if (isInsufficientAiCreditsError(error)) {
        setCreditsDepleted(true);
        return;
      }
      const message = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      toast({
        variant: "destructive",
        title: t("Photo enhancement failed"),
        description: message || t("Check the photo and try again."),
      });
    } finally {
      setBusy(false);
    }
  };

  const acceptEnhanced = (result: EnhancementResult) => {
    if (!result.enhancedUrl) return;
    onChange(
      images.map((url) =>
        url === result.sourceUrl ? result.enhancedUrl! : url,
      ),
    );
    setAccepted((current) => new Set(current).add(result.sourceUrl));
  };

  const useAllEnhanced = () => {
    const replacements = new Map(
      results
        .filter((result) => result.status === "success" && result.enhancedUrl)
        .map((result) => [result.sourceUrl, result.enhancedUrl!]),
    );
    onChange(images.map((url) => replacements.get(url) || url));
    setAccepted(new Set(replacements.keys()));
  };

  const resetDialog = () => {
    setResults([]);
    setAccepted(new Set());
    setCreditsDepleted(false);
  };

  if (!images.length) return null;

  const locked = !featuresLoading && !canEnhance;
  const iconTrigger = trigger === "icon";
  const triggerAction =
    targets.length > 1 ? t("Enhance all") : t("Enhance");

  return (
    <>
      <Button
        type="button"
        size={iconTrigger ? "icon" : "sm"}
        variant="outline"
        className={
          className ||
          (iconTrigger
            ? "h-7 w-7 border-amber-300 bg-white/95 text-amber-700 shadow-sm hover:bg-amber-50 dark:bg-gray-950/95"
            : "h-8 gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-50 dark:text-amber-200")
        }
        disabled={featuresLoading}
        title={locked ? t("Available on Pro+ and Enterprise") : t("Enhance with AI")}
        aria-label={locked ? t("AI photo enhancement requires Pro+") : triggerAction}
        onClick={() => setOpen(true)}
        data-tour={typeof targetIndex === "number" ? "product-image-enhance" : "product-images-enhance-all"}
      >
        {locked ? <Crown className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
        {!iconTrigger ? <T>{targets.length > 1 ? "Enhance all" : "Enhance"}</T> : null}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) window.setTimeout(resetDialog, 200);
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-600" />
              <T>Studio photo enhancement</T>
            </DialogTitle>
            <DialogDescription>
              <T>Improve lighting, background, sharpness, and shadow while preserving the jewellery exactly.</T>
            </DialogDescription>
          </DialogHeader>

          {locked ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-center dark:border-amber-900/50 dark:bg-amber-950/30">
              <Crown className="mx-auto h-8 w-8 text-amber-600" />
              <p className="mt-2 font-semibold"><T>Available on Pro+ and Enterprise</T></p>
              <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-100/80">
                <T>Upgrade to enhance catalog photos with AI.</T>
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="space-y-4">
              <AiImageModelPicker
                capability="enhancement"
                value={model}
                onChange={setModel}
                imageCount={targets.length}
              />
              <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <T>All photos of this product are shared with the AI as reference so it understands the jewellery piece better.</T>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {targets.map((url, index) => (
                  <div key={url} className="relative aspect-square overflow-hidden rounded-md border bg-muted">
                    <Image src={url} alt={t(`Product photo ${index + 1}`)} fill className="object-cover" unoptimized />
                  </div>
                ))}
              </div>
              <AiCreditCostHint action="Enhance with AI" cost={cost} balance={balance} />
              {creditsDepleted ? (
                <AiCreditsDepletedNotice action="Enhance photos" required={cost} balance={balance} />
              ) : null}
              <Button className="w-full" disabled={busy} onClick={() => requestEnhancement(targets)}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {busy ? <T>Enhancing photos…</T> : <T>Enhance and review</T>}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {results.map((result, index) => {
                  const used = accepted.has(result.sourceUrl);
                  return (
                    <div key={result.sourceUrl} className="overflow-hidden rounded-lg border">
                      <div className="grid grid-cols-2 border-b">
                        <figure className="border-r">
                          <figcaption className="border-b bg-muted/40 px-2 py-1 text-xs text-muted-foreground"><T>Before</T></figcaption>
                          <div className="relative aspect-square bg-muted">
                            <Image src={result.sourceUrl} alt={t(`Original photo ${index + 1}`)} fill className="object-contain" unoptimized />
                          </div>
                        </figure>
                        <figure>
                          <figcaption className="border-b bg-muted/40 px-2 py-1 text-xs text-muted-foreground"><T>After</T></figcaption>
                          <div className="relative flex aspect-square items-center justify-center bg-muted">
                            {result.enhancedUrl ? (
                              <Image src={result.enhancedUrl} alt={t(`Enhanced photo ${index + 1}`)} fill className="object-contain" unoptimized />
                            ) : (
                              <ImageOff className="h-7 w-7 text-muted-foreground" />
                            )}
                          </div>
                        </figure>
                      </div>
                      <div className="flex items-center justify-between gap-2 p-2">
                        {result.status === "failed" ? (
                          <p className="text-xs text-destructive"><T>{result.error || "Enhancement failed"}</T></p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {used ? <T>Enhanced photo selected</T> : <T>Original remains until you accept</T>}
                          </p>
                        )}
                        {result.status === "failed" ? (
                          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => requestEnhancement([result.sourceUrl])}>
                            <RotateCcw className="mr-1 h-3.5 w-3.5" /><T>Retry</T>
                          </Button>
                        ) : used ? (
                          <Button type="button" size="sm" variant="ghost" disabled><T>Used</T></Button>
                        ) : (
                          <Button type="button" size="sm" onClick={() => acceptEnhanced(result)}><T>Use enhanced</T></Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {results.some((result) => result.status === "success" && !accepted.has(result.sourceUrl)) ? (
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    <X className="mr-1 h-4 w-4" /><T>Keep originals</T>
                  </Button>
                  {results.filter((result) => result.status === "success").length > 1 ? (
                    <Button type="button" onClick={useAllEnhanced}><T>Use all enhanced</T></Button>
                  ) : null}
                </DialogFooter>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
