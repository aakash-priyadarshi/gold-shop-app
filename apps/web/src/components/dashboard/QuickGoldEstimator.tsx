"use client";

import { useState, useEffect, useRef } from "react";
import { Calculator, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import { materialsApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { getMobileMarketParams } from "@/lib/mobileCurrency";
import { T } from "@/components/ui/T";
import { usePreferencesStore } from "@/store/preferences";

export function QuickGoldEstimator() {
  const [isOpen, setIsOpen] = useState(false);
  const [weight, setWeight] = useState("");
  const [purity, setPurity] = useState("22K");
  const [makingChargeType, setMakingChargeType] = useState("per_gram");
  const [makingChargeValue, setMakingChargeValue] = useState("");
  
  const [goldRates, setGoldRates] = useState<Record<string, number>>({
    "24K": 0, "22K": 0, "18K": 0, "14K": 0
  });
  
  const { user } = useAuth();
  const { symbol: currencySymbol } = useShopCurrency();
  const dashboardMode = usePreferencesStore((s) => s.dashboardMode);
  const [isDismissed, setIsDismissed] = useState(false);

  // Read rates
  useEffect(() => {
    async function fetchRates() {
      try {
        const params = getMobileMarketParams(user?.shop ?? null);
        const res = await materialsApi.getMarketRates(params);
        const data = res.data;
        const metals = data?.metals;
        
        let rate24k = 0;
        if (Array.isArray(metals)) {
          const m24 = metals.find((m: any) => ["GOLD_24K", "XAU", "GOLD"].includes(m.code));
          rate24k = Number(m24?.ratePerGram ?? m24?.rate ?? 0);
        } else if (metals && typeof metals === "object") {
          rate24k = Number(metals["GOLD_24K"]?.ratePerGram ?? metals["GOLD_24K"]?.rate ?? 0);
        }
        
        if (rate24k) {
          setGoldRates({
            "24K": rate24k,
            "22K": rate24k * (22/24),
            "18K": rate24k * (18/24),
            "14K": rate24k * (14/24),
          });
        }
      } catch (err) {}
    }
    
    if (isOpen) {
      fetchRates();
    }
  }, [isOpen, user?.shop]);

  useEffect(() => {
    if (dashboardMode !== "ADVANCED") return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const activeElement = document.activeElement;
      const isInput = activeElement?.tagName === "INPUT" || activeElement?.tagName === "TEXTAREA" || (activeElement as HTMLElement)?.isContentEditable;
      
      if (isInput) return;

      if (e.altKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dashboardMode]);

  // Only show in advanced mode
  if (dashboardMode !== "ADVANCED") {
    return null;
  }

  const w = parseFloat(weight) || 0;
  const rate = goldRates[purity] || 0;
  const goldValue = w * rate;
  
  let mc = 0;
  const mcVal = parseFloat(makingChargeValue) || 0;
  if (makingChargeType === "per_gram") {
    mc = mcVal * w;
  } else if (makingChargeType === "percent") {
    mc = goldValue * (mcVal / 100);
  } else {
    mc = mcVal;
  }
  
  const subtotal = goldValue + mc;
  // standard 3% gold + 5% making (simplified)
  const gst = (goldValue * 0.03) + (mc * 0.05);
  const total = subtotal + gst;

  if (isDismissed) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <Card className="w-80 mb-4 shadow-xl border-amber-200 dark:border-amber-800 animate-in slide-in-from-bottom-4">
          <CardHeader className="py-3 px-4 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900/50 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-900 dark:text-amber-100">
              <Calculator className="w-4 h-4" />
              Quick Estimator
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Weight (g)</Label>
                <Input 
                  type="number" 
                  className="h-8 text-sm" 
                  value={weight} 
                  onChange={(e) => setWeight(e.target.value)} 
                  placeholder="0.00" 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Purity</Label>
                <Select value={purity} onValueChange={setPurity}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24K">24K</SelectItem>
                    <SelectItem value="22K">22K</SelectItem>
                    <SelectItem value="18K">18K</SelectItem>
                    <SelectItem value="14K">14K</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-5 gap-2">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Making Type</Label>
                <Select value={makingChargeType} onValueChange={setMakingChargeType}>
                  <SelectTrigger className="h-8 text-sm px-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_gram">Per g</SelectItem>
                    <SelectItem value="percent">%</SelectItem>
                    <SelectItem value="fixed">Fixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3 space-y-1">
                <Label className="text-xs">Making Charge</Label>
                <Input 
                  type="number" 
                  className="h-8 text-sm" 
                  value={makingChargeValue} 
                  onChange={(e) => setMakingChargeValue(e.target.value)} 
                  placeholder="0" 
                />
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>Gold Value</span>
                <span>{currencySymbol}{goldValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>Making</span>
                <span>{currencySymbol}{mc.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>GST Est.</span>
                <span>{currencySymbol}{gst.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between font-bold text-amber-900 dark:text-amber-100 pt-1">
                <span>Total Est.</span>
                <span>{currencySymbol}{total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isOpen && (
        <div className="relative group">
          <Button
            data-tour="quick-estimator"
            onClick={() => setIsOpen(true)}
            className="rounded-full shadow-lg h-12 w-12 bg-white text-amber-600 border border-amber-200 hover:bg-amber-50 dark:bg-gray-900 dark:border-amber-800 dark:hover:bg-gray-800"
            title="Quick Estimator (Alt+E)"
          >
            <Calculator className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); setIsDismissed(true); }}
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/80 dark:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity p-0 border border-red-200 dark:border-red-800 scale-75"
            title="Dismiss Estimator"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
