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
import { useShopCurrency } from "@/hooks/useShopCurrency";
import { materialsApi } from "@/lib/api";
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
  const { symbol: currencySymbol, country: shopCountry } = useShopCurrency();
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
      const res = await materialsApi.getMarketRates({ country: shopCountry || "NP" });
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
      // Fallback rate
      setGoldRate24k(11500); // Approximate NPR rate
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
              <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/shop/tools")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <ArrowLeftRight className="h-6 w-6 text-amber-500" />
                  Old Gold Exchange Calculator
                </h1>
              <p className="text-muted-foreground">
                Calculate exchange value when customers trade old gold for new
                jewellery
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
              Refresh Rate
            </Button>
          </div>

          {/* Current Gold Rate */}
          <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Coins className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Live Gold Rate (24K)
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
            <Card className="border-red-200">
              <CardHeader className="bg-red-50/50 rounded-t-lg">
                <CardTitle className="text-red-700 flex items-center gap-2">
                  <Scale className="h-5 w-5" /> Customer's Old Gold
                </CardTitle>
                <CardDescription>Gold being exchanged/sold</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div>
                  <Label>Weight (grams)</Label>
                  <Input
                    type="number"
                    value={oldWeight}
                    onChange={(e) => setOldWeight(e.target.value)}
                    placeholder="e.g. 15.5"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label>Purity</Label>
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
                  <Label>Impurity Deduction ({impurityDeduct}%)</Label>
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
                  <Label>Melting Loss ({meltingLoss}%)</Label>
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
                    <span>Pure gold content</span>
                    <span>{pureGoldInOld.toFixed(3)}g</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>After impurity deduction</span>
                    <span>{afterImpurity.toFixed(3)}g</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>After melting loss</span>
                    <span>{afterMelting.toFixed(3)}g</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg text-red-600">
                    <span>Old Gold Value</span>
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
            <Card className="border-green-200">
              <CardHeader className="bg-green-50/50 rounded-t-lg">
                <CardTitle className="text-green-700 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" /> New Jewellery
                </CardTitle>
                <CardDescription>Item being purchased</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div>
                  <Label>Weight (grams)</Label>
                  <Input
                    type="number"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    placeholder="e.g. 12.0"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label>Purity</Label>
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
                  <Label>Making Charge ({makingCharge}%)</Label>
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
                    <span>Pure gold content</span>
                    <span>{pureGoldInNew.toFixed(3)}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gold cost</span>
                    <span>
                      {currencySymbol}{" "}
                      {newGoldCost.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Making charge</span>
                    <span>
                      {currencySymbol}{" "}
                      {makingCost.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg text-green-600">
                    <span>New Item Cost</span>
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
            <Card className="border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50">
              <CardHeader>
                <CardTitle className="text-center text-xl">
                  Exchange Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Old Gold Value
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
                      New Item Cost
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
                        Customer Pays Extra
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
                        Shop Refunds
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
                      <p className="text-sm text-muted-foreground">Result</p>
                      <p className="text-2xl font-bold text-green-600">
                        Even Exchange
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
