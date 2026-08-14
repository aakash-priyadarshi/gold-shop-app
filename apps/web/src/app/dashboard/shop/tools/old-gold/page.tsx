"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { T } from "@/components/ui/T";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import { toast } from "@/hooks/use-toast";
import { materialsApi } from "@/lib/api";
import { saveTradeInPayload } from "@/lib/oldGoldTradeIn";
import { cn } from "@/lib/utils";
import { useT } from "@/providers/translation-provider";
import {
  ArrowLeft,
  ArrowLeftRight,
  Coins,
  FileText,
  Loader2,
  RefreshCw,
  Scale,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type ExchangeMetal = "GOLD" | "SILVER";

type PurityOption = { key: string; label: string; purity: number };

const GOLD_PURITIES: PurityOption[] = [
  { key: "24k", label: "24K (999)", purity: 0.999 },
  { key: "22k", label: "22K (916)", purity: 0.916 },
  { key: "21k", label: "21K (875)", purity: 0.875 },
  { key: "18k", label: "18K (750)", purity: 0.75 },
  { key: "14k", label: "14K (585)", purity: 0.585 },
  { key: "10k", label: "10K (417)", purity: 0.417 },
  { key: "9k", label: "9K (375)", purity: 0.375 },
];

const SILVER_PURITIES: PurityOption[] = [
  { key: "999", label: "Fine 999", purity: 0.999 },
  { key: "925", label: "Sterling 925", purity: 0.925 },
  { key: "900", label: "Coin 900", purity: 0.9 },
  { key: "835", label: "Continental 835", purity: 0.835 },
  { key: "800", label: "800", purity: 0.8 },
];

const GOLD_DEFAULT_PURITY = 0.916;
const SILVER_DEFAULT_PURITY = 0.925;

const GOLD_RATE_FALLBACKS: Record<string, number> = {
  NP: 11500,
  IN: 7200,
  AE: 230,
  US: 85,
  GB: 68,
  EU: 78,
  LK: 65000,
};

const SILVER_RATE_FALLBACKS: Record<string, number> = {
  NP: 150,
  IN: 90,
  AE: 3,
  US: 1,
  GB: 0.8,
  EU: 0.9,
  LK: 280,
};

function asPositiveRate(...values: unknown[]): number {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function readMetalRate(data: unknown, codes: string[]): number {
  const payload = data as Record<string, unknown> | null;
  const metals = payload?.metals ?? payload?.rates ?? data;
  if (Array.isArray(metals)) {
    const match = metals.find((m: Record<string, unknown>) => {
      const code = String(m.code ?? m.metalCode ?? "");
      const name = String(m.name ?? "");
      return codes.includes(code) || codes.includes(name);
    });
    if (!match) return 0;
    return asPositiveRate(
      match.ratePerGram,
      match.pricePerGram,
      match.rate,
      match.price,
    );
  }
  if (metals && typeof metals === "object") {
    const map = metals as Record<string, unknown>;
    for (const code of codes) {
      const value = map[code];
      if (typeof value === "number") {
        const n = asPositiveRate(value);
        if (n) return n;
        continue;
      }
      if (value && typeof value === "object") {
        const nested = value as Record<string, unknown>;
        const n = asPositiveRate(
          nested.ratePerGram,
          nested.pricePerGram,
          nested.rate,
          nested.price,
        );
        if (n) return n;
      }
    }
  }
  return 0;
}

export default function OldGoldExchangePage() {
  const router = useRouter();
  const {
    symbol: currencySymbol,
    country: shopCountry,
    currencyCode,
  } = useShopCurrency();
  const t = useT();
  const [metal, setMetal] = useState<ExchangeMetal>("GOLD");
  const [goldRate24k, setGoldRate24k] = useState<number>(0);
  const [silverRate999, setSilverRate999] = useState<number>(0);
  const [rateLoading, setRateLoading] = useState(true);

  const [oldWeight, setOldWeight] = useState("");
  const [oldPurity, setOldPurity] = useState(GOLD_DEFAULT_PURITY);
  const [impurityDeduct, setImpurityDeduct] = useState("2");
  const [meltingLoss, setMeltingLoss] = useState("0.5");

  const [newWeight, setNewWeight] = useState("");
  const [newPurity, setNewPurity] = useState(GOLD_DEFAULT_PURITY);
  const [makingCharge, setMakingCharge] = useState("12");
  const [finalOldCredit, setFinalOldCredit] = useState("");
  const [finalNewCost, setFinalNewCost] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  const isSilver = metal === "SILVER";
  const purities = isSilver ? SILVER_PURITIES : GOLD_PURITIES;
  const liveRate = isSilver ? silverRate999 : goldRate24k;

  const loadRates = useCallback(async () => {
    setRateLoading(true);
    const country = shopCountry || "NP";
    try {
      const res = await materialsApi.getMarketRates({
        currency: currencyCode,
        country,
      });
      const data = res.data;
      const gold =
        readMetalRate(data, ["GOLD_24K", "XAU", "GOLD"]) ||
        Number(data?.rate24k ?? data?.goldRate24k ?? 0);
      const silverFine =
        readMetalRate(data, ["SILVER_999", "XAG", "SILVER"]) ||
        Number(data?.silver ?? data?.silverRate ?? 0);
      const silver925 = readMetalRate(data, ["SILVER_925"]);
      setGoldRate24k(gold || GOLD_RATE_FALLBACKS[country] || 7200);
      setSilverRate999(
        silverFine ||
          (silver925 > 0 ? silver925 / 0.925 : 0) ||
          SILVER_RATE_FALLBACKS[country] ||
          90,
      );
    } catch {
      setGoldRate24k(GOLD_RATE_FALLBACKS[country] || 7200);
      setSilverRate999(SILVER_RATE_FALLBACKS[country] || 90);
    } finally {
      setRateLoading(false);
    }
  }, [currencyCode, shopCountry]);

  useEffect(() => {
    void loadRates();
  }, [loadRates]);

  const selectMetal = (next: ExchangeMetal) => {
    if (next === metal) return;
    const defaultPurity =
      next === "SILVER" ? SILVER_DEFAULT_PURITY : GOLD_DEFAULT_PURITY;
    setMetal(next);
    setOldPurity(defaultPurity);
    setNewPurity(defaultPurity);
    setFinalOldCredit("");
    setFinalNewCost("");
  };

  const oldWeightG = parseFloat(oldWeight) || 0;
  const impurityPct = parseFloat(impurityDeduct) || 0;
  const meltLossPct = parseFloat(meltingLoss) || 0;
  const pureMetalInOld = oldWeightG * oldPurity;
  const afterImpurity = pureMetalInOld * (1 - impurityPct / 100);
  const afterMelting = afterImpurity * (1 - meltLossPct / 100);
  const oldMetalValue = afterMelting * liveRate;

  const newWeightG = parseFloat(newWeight) || 0;
  const pureMetalInNew = newWeightG * newPurity;
  const newMetalCost = pureMetalInNew * liveRate;
  const makingPct = parseFloat(makingCharge) || 0;
  const makingCost = newMetalCost * (makingPct / 100);
  const newTotalCost = newMetalCost + makingCost;

  const effectiveOldCredit =
    finalOldCredit !== "" && Number.isFinite(parseFloat(finalOldCredit))
      ? parseFloat(finalOldCredit)
      : oldMetalValue;
  const effectiveNewCost =
    finalNewCost !== "" && Number.isFinite(parseFloat(finalNewCost))
      ? parseFloat(finalNewCost)
      : newTotalCost;
  const difference = effectiveNewCost - effectiveOldCredit;
  const customerPays = difference > 0 ? difference : 0;
  const shopPays = difference < 0 ? Math.abs(difference) : 0;

  const applyTradeIn = (target: "invoice" | "pos") => {
    if (effectiveOldCredit <= 0) {
      toast({
        variant: "destructive",
        title: isSilver
          ? t("Enter old silver details first")
          : t("Enter old gold details first"),
      });
      return;
    }
    saveTradeInPayload({
      calculatedCredit: Math.round(oldMetalValue),
      finalCredit: Math.round(effectiveOldCredit),
      overrideReason: overrideReason || undefined,
      currency: currencyCode,
      items: [
        {
          metal,
          karatOrPurity: oldPurity,
          weightG: oldWeightG,
          calculatedCredit: Math.round(effectiveOldCredit),
        },
      ],
      rateSnapshot: isSilver
        ? { silver999: silverRate999, fetchedAt: new Date().toISOString() }
        : { rate24k: goldRate24k, fetchedAt: new Date().toISOString() },
    });
    toast({
      title: t("Trade-in credit ready"),
      description: `${currencySymbol} ${Math.round(effectiveOldCredit).toLocaleString()}`,
    });
    if (target === "invoice") {
      router.push(
        `/dashboard/shop/invoices/create?tradeInCredit=${Math.round(effectiveOldCredit)}`,
      );
    } else {
      router.push(
        `/dashboard/shop/pos?tradeInCredit=${Math.round(effectiveOldCredit)}`,
      );
    }
  };

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/dashboard/shop/tools")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <ArrowLeftRight
                    className={cn(
                      "h-6 w-6",
                      isSilver ? "text-slate-500" : "text-amber-500",
                    )}
                  />
                  <T>Old Gold / Silver Exchange</T>
                </h1>
                <p className="text-muted-foreground">
                  <T>
                    Calculate exchange value when customers trade old gold or
                    silver for new jewellery
                  </T>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="inline-flex h-10 items-center rounded-md bg-muted p-1"
                data-tour="exchange-metal"
              >
                <button
                  type="button"
                  className={cn(
                    "rounded-sm px-4 py-1.5 text-sm font-medium transition-all",
                    metal === "GOLD"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground",
                  )}
                  onClick={() => selectMetal("GOLD")}
                >
                  <T>Gold</T>
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-sm px-4 py-1.5 text-sm font-medium transition-all",
                    metal === "SILVER"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground",
                  )}
                  onClick={() => selectMetal("SILVER")}
                >
                  <T>Silver</T>
                </button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadRates()}
                disabled={rateLoading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${rateLoading ? "animate-spin" : ""}`}
                />
                <T>Refresh Rate</T>
              </Button>
            </div>
          </div>

          <Card
            data-tour="exchange-rate"
            className={cn(
              "bg-gradient-to-r",
              isSilver
                ? "from-slate-50 to-zinc-100 border-slate-300 dark:from-slate-950/40 dark:to-zinc-950/40 dark:border-slate-700"
                : "from-amber-50 to-yellow-50 border-amber-200 dark:from-amber-950/30 dark:to-yellow-950/30 dark:border-amber-800/50",
            )}
          >
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Coins
                  className={cn(
                    "h-8 w-8",
                    isSilver ? "text-slate-500" : "text-amber-500",
                  )}
                />
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isSilver ? (
                      <T>Live Silver Rate (999)</T>
                    ) : (
                      <T>Live Gold Rate (24K)</T>
                    )}
                  </p>
                  <p
                    className={cn(
                      "text-2xl font-bold",
                      isSilver ? "text-slate-600 dark:text-slate-300" : "text-amber-600",
                    )}
                  >
                    {rateLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin inline" />
                    ) : (
                      `${currencySymbol} ${liveRate.toLocaleString()}/g`
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card
              data-tour="exchange-old"
              className="border-red-200 dark:border-red-800/50"
            >
              <CardHeader className="bg-red-50/50 dark:bg-red-950/30 rounded-t-lg">
                <CardTitle className="text-red-700 dark:text-red-300 flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  {isSilver ? (
                    <T>Customer&apos;s Old Silver</T>
                  ) : (
                    <T>Customer&apos;s Old Gold</T>
                  )}
                </CardTitle>
                <CardDescription>
                  {isSilver ? (
                    <T>Silver being exchanged/sold</T>
                  ) : (
                    <T>Gold being exchanged/sold</T>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div>
                  <Label>
                    <T>Weight (grams)</T>
                  </Label>
                  <Input
                    type="number"
                    value={oldWeight}
                    onChange={(e) => setOldWeight(e.target.value)}
                    placeholder="e.g. 15.5"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label>
                    <T>Purity</T>
                  </Label>
                  <select
                    value={oldPurity}
                    onChange={(e) => setOldPurity(parseFloat(e.target.value))}
                    className="w-full h-10 px-3 border rounded-md bg-background"
                  >
                    {purities.map((p) => (
                      <option key={p.key} value={p.purity}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>{t(`Impurity Deduction (${impurityDeduct}%)`)}</Label>
                  <Input
                    type="number"
                    value={impurityDeduct}
                    onChange={(e) => setImpurityDeduct(e.target.value)}
                    step="0.5"
                    min="0"
                    max="20"
                  />
                </div>
                <div>
                  <Label>{t(`Melting Loss (${meltingLoss}%)`)}</Label>
                  <Input
                    type="number"
                    value={meltingLoss}
                    onChange={(e) => setMeltingLoss(e.target.value)}
                    step="0.1"
                    min="0"
                    max="5"
                  />
                </div>
                <Separator />
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>
                      {isSilver ? (
                        <T>Pure silver content</T>
                      ) : (
                        <T>Pure gold content</T>
                      )}
                    </span>
                    <span>{pureMetalInOld.toFixed(3)}g</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>
                      <T>After impurity deduction</T>
                    </span>
                    <span>{afterImpurity.toFixed(3)}g</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>
                      <T>After melting loss</T>
                    </span>
                    <span>{afterMelting.toFixed(3)}g</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg text-red-600">
                    <span>
                      {isSilver ? (
                        <T>Old Silver Value</T>
                      ) : (
                        <T>Old Gold Value</T>
                      )}
                    </span>
                    <span>
                      {currencySymbol}{" "}
                      {oldMetalValue.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 dark:border-green-800/50">
              <CardHeader className="bg-green-50/50 dark:bg-green-950/30 rounded-t-lg">
                <CardTitle className="text-green-700 dark:text-green-300 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" /> <T>New Jewellery</T>
                </CardTitle>
                <CardDescription>
                  <T>Item being purchased</T>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div>
                  <Label>
                    <T>Weight (grams)</T>
                  </Label>
                  <Input
                    type="number"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    placeholder="e.g. 12.0"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label>
                    <T>Purity</T>
                  </Label>
                  <select
                    value={newPurity}
                    onChange={(e) => setNewPurity(parseFloat(e.target.value))}
                    className="w-full h-10 px-3 border rounded-md bg-background"
                  >
                    {purities.map((p) => (
                      <option key={p.key} value={p.purity}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>{t(`Making Charge (${makingCharge}%)`)}</Label>
                  <Input
                    type="number"
                    value={makingCharge}
                    onChange={(e) => setMakingCharge(e.target.value)}
                    step="0.5"
                    min="0"
                    max="50"
                  />
                </div>
                <Separator />
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>
                      {isSilver ? (
                        <T>Pure silver content</T>
                      ) : (
                        <T>Pure gold content</T>
                      )}
                    </span>
                    <span>{pureMetalInNew.toFixed(3)}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      {isSilver ? <T>Silver cost</T> : <T>Gold cost</T>}
                    </span>
                    <span>
                      {currencySymbol}{" "}
                      {newMetalCost.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>
                      <T>Making charge</T>
                    </span>
                    <span>
                      {currencySymbol}{" "}
                      {makingCost.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg text-green-600">
                    <span>
                      <T>New Item Cost</T>
                    </span>
                    <span>
                      {currencySymbol}{" "}
                      {newTotalCost.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {(oldWeightG > 0 || newWeightG > 0) && (
            <Card
              data-tour="exchange-summary"
              className={cn(
                "border-2 bg-gradient-to-r",
                isSilver
                  ? "border-slate-300 dark:border-slate-600 from-slate-50 to-zinc-50 dark:from-slate-950/30 dark:to-zinc-950/30"
                  : "border-amber-300 dark:border-amber-600 from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30",
              )}
            >
              <CardHeader>
                <CardTitle className="text-center text-xl">
                  <T>Exchange Summary</T>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {isSilver ? (
                        <T>Old Silver Value</T>
                      ) : (
                        <T>Old Gold Value</T>
                      )}
                    </p>
                    <p className="text-xl font-bold text-red-600">
                      {currencySymbol}{" "}
                      {oldMetalValue.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                  <div className="flex items-center justify-center">
                    <ArrowLeftRight
                      className={cn(
                        "h-8 w-8",
                        isSilver ? "text-slate-500" : "text-amber-500",
                      )}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      <T>New Item Cost</T>
                    </p>
                    <p className="text-xl font-bold text-green-600">
                      {currencySymbol}{" "}
                      {newTotalCost.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="text-center space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                    <div>
                      <Label>
                        {isSilver ? (
                          <T>Final old silver credit</T>
                        ) : (
                          <T>Final old gold credit</T>
                        )}{" "}
                        ({currencySymbol})
                      </Label>
                      <Input
                        type="number"
                        value={finalOldCredit}
                        onChange={(e) => setFinalOldCredit(e.target.value)}
                        placeholder={String(Math.round(oldMetalValue))}
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        <T>Calculated</T>: {currencySymbol}{" "}
                        {Math.round(oldMetalValue).toLocaleString()} —{" "}
                        <T>edit to negotiate</T>
                      </p>
                    </div>
                    <div>
                      <Label>
                        <T>Final new item price</T> ({currencySymbol})
                      </Label>
                      <Input
                        type="number"
                        value={finalNewCost}
                        onChange={(e) => setFinalNewCost(e.target.value)}
                        placeholder={String(Math.round(newTotalCost))}
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        <T>Calculated</T>: {currencySymbol}{" "}
                        {Math.round(newTotalCost).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label>
                      <T>Override reason (optional)</T>
                    </Label>
                    <Input
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder={t("e.g. Loyalty discount on buyback")}
                    />
                  </div>
                  {customerPays > 0 ? (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        <T>Customer Pays Extra</T>
                      </p>
                      <p className="text-3xl font-bold text-amber-600">
                        {currencySymbol}{" "}
                        {customerPays.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                  ) : shopPays > 0 ? (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        <T>Shop Refunds</T>
                      </p>
                      <p className="text-3xl font-bold text-blue-600">
                        {currencySymbol}{" "}
                        {shopPays.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        <T>Result</T>
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        <T>Even Exchange</T>
                      </p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 justify-center pt-2">
                    <Button onClick={() => applyTradeIn("invoice")}>
                      <FileText className="h-4 w-4 mr-2" />
                      <T>Apply to Invoice</T>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => applyTradeIn("pos")}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      <T>Apply to POS</T>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
