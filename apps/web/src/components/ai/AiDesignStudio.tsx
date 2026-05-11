"use client";

/**
 * AI Design Studio
 *
 * Pro+ plan feature. Customer / shopkeeper enters a natural-language
 * description + budget, and the backend (POST /designs/variations) returns
 * 5 distinct AI-generated jewellery design variations with full specs and
 * preview images. Selecting a variation returns the full spec to the parent
 * via `onSelect`, which can then auto-fill an RFQ / quote form.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/api";
import {
  AlertCircle,
  Check,
  Coins,
  Crown,
  Gem,
  ImageOff,
  Loader2,
  Scale,
  Sparkles,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const API_URL = getApiUrl();

export interface AiDesignVariation {
  id: string;
  title: string;
  styleSummary: string;
  description: string;
  jewelryType: string;
  buildMethod: "METHOD_A" | "METHOD_B" | "METHOD_C" | "METHOD_D";
  metalType: string;
  metalColor?: string;
  weightCategory?: "LIGHT" | "MEDIUM" | "HEAVY";
  estimatedWeight: number;
  surfaceFinish?: string;
  hasGemstones: boolean;
  primaryStone?: string;
  stoneCount?: number;
  stoneCarat?: number;
  stoneColor?: string;
  stoneCut?: string;
  settingStyle?: string;
  alloyDetails?: {
    baseMetal?: string;
    karat?: string;
    alloyFamily?: string;
  };
  platingDetails?: {
    baseMetal?: string;
    platingType?: string;
    platingTier?: string;
  };
  italianMachineDetails?: {
    purity?: string;
    chainStyle?: string;
  };
  gemstones?: Array<{
    stoneType?: string;
    shape?: string;
    color?: string;
    clarity?: string;
    cut?: string;
    settingStyle?: string;
    count?: number;
    sizeValue?: number;
    sizeUnit?: string;
  }>;
  estimatedCost: {
    metal: number;
    making: number;
    gemstones: number;
    finish: number;
    total: number;
    currency: string;
  };
  highlights: string[];
  imageUrl?: string;
  designId?: string;
}

interface Props {
  /** Currency code shown to the user (defaults to INR). */
  currency?: string;
  /** Pre-fill the jewellery type if the user already picked one. */
  defaultJewelryType?: string;
  /** Called when the user selects a variation. */
  onSelect: (variation: AiDesignVariation) => void;
  /** Optional: override the trigger button label. */
  triggerLabel?: string;
  /** Optional: render as compact pill (icon-only) instead of full card. */
  compact?: boolean;
}

export function AiDesignStudio({
  currency = "INR",
  defaultJewelryType,
  onSelect,
  triggerLabel = "Design with AI",
  compact = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [occasion, setOccasion] = useState("");
  const [loading, setLoading] = useState(false);
  const [variations, setVariations] = useState<AiDesignVariation[]>([]);
  const [planLocked, setPlanLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setVariations([]);
    setError(null);
    setPlanLocked(false);
  };

  const handleGenerate = async () => {
    if (!prompt || prompt.trim().length < 5) {
      toast({
        title: "Tell us a bit more",
        description: "Describe the jewellery you want in a few words.",
        variant: "destructive",
      });
      return;
    }
    const token =
      typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) {
      toast({
        title: "Sign in required",
        description: "Please log in to use the AI Design Studio.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setError(null);
    setPlanLocked(false);
    try {
      const res = await fetch(`${API_URL}/designs/variations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          budgetMin: budgetMin ? Number(budgetMin) : undefined,
          budgetMax: budgetMax ? Number(budgetMax) : undefined,
          currency,
          jewelryType: defaultJewelryType,
          occasion: occasion || undefined,
        }),
      });

      if (res.status === 403) {
        const body = await res.json().catch(() => ({}));
        if (
          body?.error === "FEATURE_NOT_ENABLED" ||
          /plan|pro\+|upgrade/i.test(body?.message || "")
        ) {
          setPlanLocked(true);
          return;
        }
        throw new Error(body?.message || "Access denied");
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `Request failed (${res.status})`);
      }
      const data = await res.json();
      const list: AiDesignVariation[] = Array.isArray(data?.variations)
        ? data.variations
        : [];
      if (!list.length) throw new Error("AI returned no variations. Try again.");
      setVariations(list);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      setError(msg);
      toast({
        title: "AI generation failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePick = (v: AiDesignVariation) => {
    onSelect(v);
    toast({
      title: "Design applied",
      description: `"${v.title}" details have been filled into the form.`,
    });
    setOpen(false);
    setTimeout(reset, 300);
  };

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <>
      {compact ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-2 border-amber-300 bg-gradient-to-r from-amber-50 to-rose-50 text-amber-900 hover:from-amber-100 hover:to-rose-100 dark:from-amber-950/40 dark:to-rose-950/40 dark:text-amber-100"
          onClick={() => setOpen(true)}
        >
          <Wand2 className="h-4 w-4" />
          {triggerLabel}
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative w-full overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-rose-50 to-fuchsia-50 p-5 text-left shadow-sm transition hover:shadow-md dark:border-amber-900/40 dark:from-amber-950/30 dark:via-rose-950/30 dark:to-fuchsia-950/20"
        >
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-amber-300/40 to-fuchsia-300/40 blur-2xl transition group-hover:scale-125" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 text-white shadow-lg">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  AI Design Studio
                </h3>
                <Badge className="border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-100">
                  <Crown className="mr-1 h-3 w-3" /> Pro+
                </Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tell us your budget &amp; vision — get 5 ready-to-order designs
                in seconds.
              </p>
            </div>
            <div className="rounded-lg bg-white/70 px-3 py-2 text-xs font-medium text-amber-900 shadow-sm backdrop-blur dark:bg-gray-900/40 dark:text-amber-200">
              Try it →
            </div>
          </div>
        </button>
      )}

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setTimeout(reset, 300);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              AI Design Studio
              <Badge className="ml-2 border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-100">
                <Crown className="mr-1 h-3 w-3" /> Pro+
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Describe what you want and we&apos;ll generate 5 unique design
              variations matched to your budget. Pick one to auto-fill your
              request.
            </DialogDescription>
          </DialogHeader>

          {planLocked ? (
            <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-rose-50 p-6 text-center dark:border-amber-900/40 dark:from-amber-950/30 dark:to-rose-950/30">
              <Crown className="mx-auto mb-3 h-10 w-10 text-amber-500" />
              <h3 className="text-lg font-semibold">Unlock AI Design Studio</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-gray-600 dark:text-gray-400">
                Generating 5 design variations from a single prompt is part of
                the <strong>Pro+</strong> plan. Upgrade to design faster, win
                more orders, and delight your customers.
              </p>
              <div className="mt-4 flex justify-center gap-3">
                <Link href="/pricing">
                  <Button className="bg-gradient-to-r from-amber-500 to-rose-500 text-white hover:from-amber-600 hover:to-rose-600">
                    See Pro+ plans
                  </Button>
                </Link>
                <Button variant="outline" onClick={() => setPlanLocked(false)}>
                  Close
                </Button>
              </div>
            </div>
          ) : variations.length === 0 ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="ai-prompt">What jewellery do you want?</Label>
                <Textarea
                  id="ai-prompt"
                  placeholder='e.g. "A diamond engagement ring in rose gold around 3 grams" or "Heavy traditional bridal necklace in 22K yellow gold"'
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="ai-budget-min">
                    Budget min ({currency})
                  </Label>
                  <Input
                    id="ai-budget-min"
                    type="number"
                    placeholder="50000"
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="ai-budget-max">
                    Budget max ({currency})
                  </Label>
                  <Input
                    id="ai-budget-max"
                    type="number"
                    placeholder="200000"
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="ai-occasion">Occasion (optional)</Label>
                  <Input
                    id="ai-occasion"
                    placeholder="Engagement, wedding, gift…"
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 to-rose-500 text-white hover:from-amber-600 hover:to-rose-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Designing
                    5 variations… (~30s)
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" /> Generate 5 designs
                  </>
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                AI generations are powered by Gemini. Each generation creates
                fresh, unique designs tailored to your budget.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing <strong>{variations.length}</strong> AI-designed
                  variations for &ldquo;{prompt}&rdquo;
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setVariations([]);
                    setError(null);
                  }}
                >
                  Refine prompt
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {variations.map((v) => (
                  <VariationCard
                    key={v.id}
                    variation={v}
                    fmtMoney={fmtMoney}
                    onPick={handlePick}
                  />
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function VariationCard({
  variation: v,
  fmtMoney,
  onPick,
}: {
  variation: AiDesignVariation;
  fmtMoney: (n: number) => string;
  onPick: (v: AiDesignVariation) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <div className="relative aspect-square w-full bg-gradient-to-br from-amber-50 to-rose-50 dark:from-gray-800 dark:to-gray-900">
        {v.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={v.imageUrl}
            alt={v.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center text-muted-foreground">
            <ImageOff className="mb-2 h-8 w-8" />
            <span className="text-xs">Preview unavailable</span>
          </div>
        )}
        <div className="absolute right-2 top-2">
          <Badge className="bg-black/70 text-white hover:bg-black/70">
            {fmtMoney(v.estimatedCost.total)}
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">
            {v.title}
          </h4>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {v.styleSummary || v.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 text-xs">
          <Badge variant="secondary" className="font-normal">
            {v.jewelryType.replace(/_/g, " ")}
          </Badge>
          <Badge variant="secondary" className="font-normal">
            {v.metalType.replace(/_/g, " ")}
          </Badge>
          {v.estimatedWeight > 0 && (
            <Badge variant="secondary" className="gap-1 font-normal">
              <Scale className="h-3 w-3" />
              {v.estimatedWeight}g
            </Badge>
          )}
          {v.hasGemstones && v.primaryStone && (
            <Badge variant="secondary" className="gap-1 font-normal">
              <Gem className="h-3 w-3" />
              {v.primaryStone.replace(/_/g, " ")}
              {v.stoneCount ? ` ×${v.stoneCount}` : ""}
            </Badge>
          )}
        </div>

        {v.highlights.length > 0 && (
          <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            {v.highlights.slice(0, 3).map((h, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          className="text-left text-xs font-medium text-amber-700 hover:text-amber-900 dark:text-amber-300"
          onClick={() => setShowDetails((s) => !s)}
        >
          {showDetails ? "Hide full details ▴" : "View full details ▾"}
        </button>

        {showDetails && (
          <div className="space-y-2 rounded-lg bg-gray-50 p-3 text-xs dark:bg-gray-800/50">
            <p className="text-gray-700 dark:text-gray-300">{v.description}</p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-gray-600 dark:text-gray-400">
              <span>Build method:</span>
              <span className="font-medium text-gray-900 dark:text-gray-200">
                {v.buildMethod}
              </span>
              {v.surfaceFinish && (
                <>
                  <span>Surface finish:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-200">
                    {v.surfaceFinish.replace(/_/g, " ")}
                  </span>
                </>
              )}
              {v.metalColor && (
                <>
                  <span>Metal colour:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-200">
                    {v.metalColor}
                  </span>
                </>
              )}
              {v.alloyDetails?.karat && (
                <>
                  <span>Karat:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-200">
                    {v.alloyDetails.karat} {v.alloyDetails.alloyFamily}
                  </span>
                </>
              )}
              {v.platingDetails?.platingType && (
                <>
                  <span>Plating:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-200">
                    {v.platingDetails.platingType}{" "}
                    {v.platingDetails.platingTier}
                  </span>
                </>
              )}
              {v.italianMachineDetails?.chainStyle && (
                <>
                  <span>Chain style:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-200">
                    {v.italianMachineDetails.chainStyle}
                  </span>
                </>
              )}
              {v.settingStyle && (
                <>
                  <span>Setting:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-200">
                    {v.settingStyle}
                  </span>
                </>
              )}
            </div>
            <div className="space-y-1 border-t border-gray-200 pt-2 dark:border-gray-700">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                <Coins className="h-3 w-3" /> Cost breakdown
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-gray-600 dark:text-gray-400">
                <span>Metal:</span>
                <span className="text-right font-medium text-gray-900 dark:text-gray-200">
                  {fmtMoney(v.estimatedCost.metal)}
                </span>
                <span>Making:</span>
                <span className="text-right font-medium text-gray-900 dark:text-gray-200">
                  {fmtMoney(v.estimatedCost.making)}
                </span>
                <span>Gemstones:</span>
                <span className="text-right font-medium text-gray-900 dark:text-gray-200">
                  {fmtMoney(v.estimatedCost.gemstones)}
                </span>
                <span>Finish:</span>
                <span className="text-right font-medium text-gray-900 dark:text-gray-200">
                  {fmtMoney(v.estimatedCost.finish)}
                </span>
                <span className="text-gray-900 dark:text-gray-100">Total:</span>
                <span className="text-right text-base font-bold text-amber-600 dark:text-amber-400">
                  {fmtMoney(v.estimatedCost.total)}
                </span>
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={() => onPick(v)}
          className="mt-auto w-full bg-gradient-to-r from-amber-500 to-rose-500 text-white hover:from-amber-600 hover:to-rose-600"
        >
          <Check className="mr-2 h-4 w-4" /> Select &amp; auto-fill
        </Button>
      </div>
    </div>
  );
}
