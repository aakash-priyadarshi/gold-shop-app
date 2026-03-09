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
import { materialsApi } from "@/lib/api";
import { useT } from "@/providers/translation-provider";
import {
  ArrowLeft,
  ArrowLeftRight,
  Coins,
  Loader2,
  RefreshCw,
  Scale,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Purity multipliers for gold
const GOLD_PURITIES: { label: string; karat: number; purity: number }[] = [
  { label: "24K (999)", karat: 24, purity: 0.999 },
  { label: "22K (916)", karat: 22, purity: 0.916 },
  { label: "21K (875)", karat: 21, purity: 0.875 },
  { label: "18K (750)", karat: 18, purity: 0.75 },
  { label: "14K (585)", karat: 14, purity: 0.585 },
  { label: "10K (417)", karat: 10, purity: 0.417 },
  { label: "9K (375)", karat: 9, purity: 0.375 },
];

export default function OldGoldExchangePage() {
  const router = useRouter();
  const {
    symbol: currencySymbol,
    country: shopCountry,
    currencyCode,
  } = useShopCurrency();
  const t = useT();
  const [goldRate24k, setGoldRate24k] = useState<number>(0);
  const [rateLoading, setRateLoading] = useState(true);

  // Old gold inputs
  const [oldWeight, setOldWeight] = useState("");
  const [oldPurity, setOldPurity] = useState(0.916); // Default 22K
  const [impurityDeduct, setImpurityDeduct] = useState("2"); // % deducted
  const [meltingLoss, setMeltingLoss] = useState("0.5"); // % melting loss (typical)

  // New item inputs
  const [newWeight, setNewWeight] = useState("");
  const [newPurity, setNewPurity] = useState(0.916);
  const [makingCharge, setMakingCharge] = useState("12"); // % making charge

  useEffect(() => {
    loadGoldRate();
  }, []);

  const loadGoldRate = async () => {
    setRateLoading(true);
    try {
      const res = await materialsApi.getMarketRates({
        currency: currencyCode,
        country: shopCountry || "NP",
      });
      // Find gold 24k rate
      const rates = res.data?.metals || res.data?.rates || res.data;
      if (Array.isArray(rates)) {
        const gold = rates.find(
          (r: any) => r.metalCode === "GOLD_24K" || r.name === "Gold 24K",
        );
        if (gold) setGoldRate24k(gold.pricePerGram || gold.price || 0);
      } else if (rates?.GOLD_24K) {
        setGoldRate24k(rates.GOLD_24K);
      }
    } catch {
      // Dynamic fallback rate based on shop country
      const fallbacks: Record<string, number> = {
        NP: 11500,
        IN: 7200,
        AE: 230,
        US: 85,
        GB: 68,
        EU: 78,
      };
      setGoldRate24k(fallbacks[shopCountry] || 7200);
    } finally {
      setRateLoading(false);
    }
  };

  // Calculate old gold value
  const oldWeightG = parseFloat(oldWeight) || 0;
  const impurityPct = parseFloat(impurityDeduct) || 0;
  const meltLossPct = parseFloat(meltingLoss) || 0;
  const pureGoldInOld = oldWeightG * oldPurity;
  const afterImpurity = pureGoldInOld * (1 - impurityPct / 100);
  const afterMelting = afterImpurity * (1 - meltLossPct / 100);
  const oldGoldValue = afterMelting * goldRate24k;

  // Calculate new item cost
  const newWeightG = parseFloat(newWeight) || 0;
  const pureGoldInNew = newWeightG * newPurity;
  const newGoldCost = pureGoldInNew * goldRate24k;
  const makingPct = parseFloat(makingCharge) || 0;
  const makingCost = newGoldCost * (makingPct / 100);
  const newTotalCost = newGoldCost + makingCost;

  // Exchange result
  const difference = newTotalCost - oldGoldValue;
  const customerPays = difference > 0 ? difference : 0;
  const shopPays = difference < 0 ? Math.abs(difference) : 0;

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
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
                  <ArrowLeftRight className="h-6 w-6 text-amber-500" />
                  <T>Old Gold Exchange Calculator</T>
                </h1>
                <p className="text-muted-foreground">
                  <T>
                    Calculate exchange value when customers trade old gold for
                    new jewellery
                  </T>
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadGoldRate}
              disabled={rateLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${rateLoading ? "animate-spin" : ""}`}
              />
              <T>Refresh Rate</T>
            </Button>
          </div>

          {/* Current Gold Rate */}
          <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 dark:from-amber-950/30 dark:to-yellow-950/30 dark:border-amber-800/50">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Coins className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    <T>Live Gold Rate (24K)</T>
                  </p>
                  <p className="text-2xl font-bold text-amber-600">
                    {rateLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin inline" />
                    ) : (
                      `${currencySymbol} ${goldRate24k.toLocaleString()}/g`
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Old Gold Section */}
            <Card className="border-red-200 dark:border-red-800/50">
              <CardHeader className="bg-red-50/50 dark:bg-red-950/30 rounded-t-lg">
                <CardTitle className="text-red-700 dark:text-red-300 flex items-center gap-2">
                  <Scale className="h-5 w-5" /> <T>Customer&apos;s Old Gold</T>
                </CardTitle>
                <CardDescription>
                  <T>Gold being exchanged/sold</T>
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
                    {GOLD_PURITIES.map((p) => (
                      <option key={p.karat} value={p.purity}>
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
                      <T>Pure gold content</T>
                    </span>
                    <span>{pureGoldInOld.toFixed(3)}g</span>
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
                      <T>Old Gold Value</T>
                    </span>
                    <span>
                      {currencySymbol}{" "}
                      {oldGoldValue.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* New Item Section */}
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
                    {GOLD_PURITIES.map((p) => (
                      <option key={p.karat} value={p.purity}>
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
                    max="30"
                  />
                </div>
                <Separator />
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>
                      <T>Pure gold content</T>
                    </span>
                    <span>{pureGoldInNew.toFixed(3)}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      <T>Gold cost</T>
                    </span>
                    <span>
                      {currencySymbol}{" "}
                      {newGoldCost.toLocaleString(undefined, {
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

          {/* Exchange Summary */}
          {(oldWeightG > 0 || newWeightG > 0) && (
            <Card className="border-2 border-amber-300 dark:border-amber-600 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30">
              <CardHeader>
                <CardTitle className="text-center text-xl">
                  <T>Exchange Summary</T>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      <T>Old Gold Value</T>
                    </p>
                    <p className="text-xl font-bold text-red-600">
                      {currencySymbol}{" "}
                      {oldGoldValue.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                  <div className="flex items-center justify-center">
                    <ArrowLeftRight className="h-8 w-8 text-amber-500" />
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
                <div className="text-center">
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
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
