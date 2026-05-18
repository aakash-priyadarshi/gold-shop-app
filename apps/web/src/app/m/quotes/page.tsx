"use client";

import { MobileFeatureGate } from "@/components/mobile/MobileFeatureGate";
import { GemstoneEditorV2, type GemstoneEntry as GemstoneEntryV2 } from "@/components/pricing/GemstoneEditorV2";

import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { materialsApi, shopQuotesApi, shopsApi } from "@/lib/api";
import {
  convertCurrencyAmount,
  fetchFreeFxRates,
  type SupportedCurrencyCode,
} from "@/lib/currency";
import { getMobileMarketParams } from "@/lib/mobileCurrency";
import {
  Calculator,
  Gem,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const JEWELLERY_TYPES = [
  "RING",
  "NECKLACE",
  "BRACELET",
  "BANGLE",
  "EARRING",
  "PENDANT",
  "CHAIN",
  "ANKLET",
  "MANGALSUTRA",
  "OTHER",
];

const BUILD_METHODS = [
  { value: "METHOD_A", label: "New custom piece" },
  { value: "METHOD_B", label: "Repair or resize" },
  { value: "METHOD_C", label: "Remodel old item" },
  { value: "METHOD_D", label: "Customer material + shop work" },
];

const MATERIAL_OPTIONS = [
  { value: "CUSTOM", label: "Other / customer-provided material", category: "OTHER" },
  { value: "GOLD_24K", label: "Gold 24K", category: "GOLD", purity: 0.999 },
  { value: "GOLD_22K", label: "Gold 22K", category: "GOLD", purity: 0.916 },
  { value: "GOLD_18K", label: "Gold 18K", category: "GOLD", purity: 0.75 },
  { value: "SILVER_999", label: "Silver 999", category: "SILVER", purity: 0.999 },
  { value: "SILVER_925", label: "Silver 925", category: "SILVER", purity: 0.925 },
  { value: "PLATINUM_950", label: "Platinum 950", category: "PLATINUM", purity: 0.95 },
  { value: "BRASS", label: "Brass", category: "BASE_METAL" },
  { value: "BRONZE", label: "Bronze", category: "BASE_METAL" },
  { value: "COPPER", label: "Copper", category: "BASE_METAL" },
  { value: "STAINLESS_STEEL_316L", label: "Stainless steel 316L", category: "BASE_METAL" },
  { value: "TITANIUM", label: "Titanium", category: "BASE_METAL" },
  { value: "BASE_METAL", label: "Other base metal / plated", category: "BASE_METAL" },
];

const TOLA_TO_GRAMS = 11.6638038;
const SUPPORTED_CURRENCY_CODES = ["NPR", "INR", "AED", "USD", "GBP", "EUR", "AUD"] as const;
const RATE_ALIASES: Record<string, string[]> = {
  GOLD_24K: ["GOLD_24K", "XAU", "GOLD"],
  GOLD_22K: ["GOLD_22K", "GOLD_24K", "XAU", "GOLD"],
  GOLD_18K: ["GOLD_18K", "GOLD_24K", "XAU", "GOLD"],
  SILVER_999: ["SILVER_999", "XAG", "SILVER"],
  SILVER_925: ["SILVER_925", "SILVER_999", "XAG", "SILVER"],
  PLATINUM_950: ["PLATINUM_950", "PLATINUM_PT950", "XPT", "PLATINUM"],
  PLATINUM_900: ["PLATINUM_900", "PLATINUM_PT900", "XPT", "PLATINUM"],
};

type PricingMode = "auto" | "manual";
type WeightUnit = "GRAM" | "TOLA";

interface GemstoneRateOption {
  key: string;
  label: string;
  stoneType: string;
  origin: string;
  sizeCategory: string;
  qualityTier: string;
  effectivePriceNpr: number;
  shopPriceNpr?: number | null;
}

interface CustomerLookupResult {
  found?: boolean;
  customer?: {
    id?: string;
    name?: string;
    phone?: string;
    phoneCountryCode?: string;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
  };
}

function fmt(amount?: number | null, currency = "NPR") {
  return `${currency} ${Math.round(Number(amount ?? 0)).toLocaleString("en-IN")}`;
}

function readMetalRate(data: any, codes: string[]) {
  const metals = data?.metals;
  if (Array.isArray(metals)) {
    const match = metals.find((m: any) => codes.includes(m.code));
    return Number(match?.ratePerGram ?? match?.rate ?? 0);
  }
  if (metals && typeof metals === "object") {
    for (const code of codes) {
      const value = metals[code];
      if (typeof value === "number") return value;
      if (value && typeof value === "object") {
        const nested = Number(value.ratePerGram ?? value.rate ?? 0);
        if (nested > 0) return nested;
      }
    }
  }
  return 0;
}

function toSupportedCurrency(value?: string | null): SupportedCurrencyCode {
  const normalized = value?.toUpperCase();
  return SUPPORTED_CURRENCY_CODES.includes(normalized as SupportedCurrencyCode)
    ? (normalized as SupportedCurrencyCode)
    : "NPR";
}

function liveRateForMaterial(data: any, materialCode: string) {
  const rate = readMetalRate(data, RATE_ALIASES[materialCode] ?? [materialCode]);
  if (rate > 0 && (materialCode === "GOLD_22K" || materialCode === "GOLD_18K")) {
    const pureGoldRate = readMetalRate(data, ["GOLD_24K", "XAU", "GOLD"]);
    const purity = MATERIAL_OPTIONS.find((m) => m.value === materialCode)?.purity ?? 1;
    return readMetalRate(data, [materialCode]) || (pureGoldRate > 0 ? pureGoldRate * purity : rate);
  }
  if (rate > 0 && materialCode === "SILVER_925") {
    const pureSilverRate = readMetalRate(data, ["SILVER_999", "XAG", "SILVER"]);
    return readMetalRate(data, [materialCode]) || (pureSilverRate > 0 ? pureSilverRate * 0.925 : rate);
  }
  return rate;
}

function numberFromInput(value: string) {
  return Number.parseFloat(value) || 0;
}

export default function QuotesPage() {
  const { user } = useAuth();
  const initialParams = getMobileMarketParams(user?.shop ?? null);
  const [currency, setCurrency] = useState(initialParams.currency);
  const [isGemstoneDrawerOpen, setIsGemstoneDrawerOpen] = useState(false);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [goldRate, setGoldRate] = useState(0);
  const [silverRate, setSilverRate] = useState(0);
  const [marketRateData, setMarketRateData] = useState<any>(null);
  const [nprToDisplayCurrency, setNprToDisplayCurrency] = useState(1);
  const [shopMaterialRatesNpr, setShopMaterialRatesNpr] = useState<Record<string, number>>({});
  const [baseMetalPricesNpr, setBaseMetalPricesNpr] = useState<Record<string, number>>({});
  const [gemstoneRateOptions, setGemstoneRateOptions] = useState<GemstoneRateOption[]>([]);

  const [phoneCountryCode, setPhoneCountryCode] = useState("+977");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCity, setCustomerCity] = useState<string>((user?.shop as any)?.city ?? "");
  const [customerCountry, setCustomerCountry] = useState<string>((user?.shop as any)?.country ?? "Nepal");
  const [matchedCustomerId, setMatchedCustomerId] = useState<string | null>(null);
  const [lookingUpCustomer, setLookingUpCustomer] = useState(false);

  const [jewelleryType, setJewelleryType] = useState("RING");
  const [buildMethod, setBuildMethod] = useState("METHOD_A");
  const [materialCode, setMaterialCode] = useState("CUSTOM");
  const [quantity, setQuantity] = useState(1);
  const [targetTotalWeightG, setTargetTotalWeightG] = useState(0);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("GRAM");
  const [targetGoldWeightG, setTargetGoldWeightG] = useState(0);
  const [sizeOrLength, setSizeOrLength] = useState("");
  const [metalCostMode, setMetalCostMode] = useState<PricingMode>("auto");
  const [metalCostNpr, setMetalCostNpr] = useState(0);
  const [makingChargeNpr, setMakingChargeNpr] = useState(0);
  const [gemstoneCostMode, setGemstoneCostMode] = useState<PricingMode>("manual");
  const [gemstonesV2, setGemstonesV2] = useState<GemstoneEntryV2[]>([]);
  const [selectedGemstoneRateKey, setSelectedGemstoneRateKey] = useState("");
  const [gemstoneCount, setGemstoneCount] = useState(1);
  const [gemstoneCostNpr, setGemstoneCostNpr] = useState(0);
  const [finishCostNpr, setFinishCostNpr] = useState(0);
  const [estimatedDays, setEstimatedDays] = useState(7);
  const [gemstoneNotes, setGemstoneNotes] = useState("");
  const [finishNotes, setFinishNotes] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [shopNotes, setShopNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const selectedMaterial = useMemo(
    () => MATERIAL_OPTIONS.find((m) => m.value === materialCode) ?? MATERIAL_OPTIONS[0],
    [materialCode],
  );

  const resolvedWeightGrams = useMemo(
    () => targetTotalWeightG * (weightUnit === "TOLA" ? TOLA_TO_GRAMS : 1),
    [targetTotalWeightG, weightUnit],
  );

  const materialRateInfo = useMemo(() => {
    const shopRateNpr = shopMaterialRatesNpr[materialCode];
    if (shopRateNpr > 0) {
      return {
        ratePerGram: shopRateNpr * nprToDisplayCurrency,
        source: "Store inventory rate",
      };
    }

    const baseMetalRateNpr = baseMetalPricesNpr[materialCode];
    if (baseMetalRateNpr > 0) {
      return {
        ratePerGram: baseMetalRateNpr * nprToDisplayCurrency,
        source: "Store base metal rate",
      };
    }

    const liveRate = liveRateForMaterial(marketRateData, materialCode);
    if (liveRate > 0) {
      return {
        ratePerGram: liveRate,
        source: "Live market rate",
      };
    }

    return { ratePerGram: 0, source: "Manual rate" };
  }, [baseMetalPricesNpr, materialCode, marketRateData, nprToDisplayCurrency, shopMaterialRatesNpr]);

  const autoMetalCost = useMemo(() => {
    if (!materialRateInfo.ratePerGram || !resolvedWeightGrams) return 0;
    return Math.round(materialRateInfo.ratePerGram * resolvedWeightGrams * quantity);
  }, [materialRateInfo.ratePerGram, quantity, resolvedWeightGrams]);

  const selectedGemstoneRate = useMemo(
    () => gemstoneRateOptions.find((option) => option.key === selectedGemstoneRateKey) ?? null,
    [gemstoneRateOptions, selectedGemstoneRateKey],
  );

  const autoGemstoneCost = useMemo(() => {
    return Math.round(
      gemstonesV2.reduce((sum, gem) => sum + (gem.estimatedPrice || 0) * gem.count * nprToDisplayCurrency, 0)
    );
  }, [gemstonesV2, nprToDisplayCurrency]);

  const estimateTotal = metalCostNpr + makingChargeNpr + gemstoneCostNpr + finishCostNpr;
  const estimatedTax = Math.round(estimateTotal * 0.03);
  const estimatedTotalWithTax = estimateTotal + estimatedTax;

  const loadRates = useCallback(async () => {
    try {
      setRatesLoading(true);
      const params = getMobileMarketParams(user?.shop ?? null);
      const [res, shopMaterialsRes, gemstoneRes, componentRes] = await Promise.all([
        materialsApi.getMarketRates(params),
        shopsApi.getMaterials().catch(() => ({ data: { materials: [] } })),
        shopsApi.getGemstonePricing().catch(() => ({ data: { rates: [] } })),
        shopsApi.getComponentPricing().catch(() => ({ data: { baseMetalPrices: {} } })),
      ]);
      const data = res.data;
      const displayCurrency = toSupportedCurrency(data?.currency ?? params.currency);
      const fxRates = await fetchFreeFxRates().catch(() => null);

      setMarketRateData(data);
      setGoldRate(readMetalRate(data, ["GOLD_24K", "XAU", "GOLD"]));
      setSilverRate(readMetalRate(data, ["SILVER_999", "SILVER_925", "XAG", "SILVER"]));
      setCurrency(displayCurrency);
      setNprToDisplayCurrency(
        fxRates ? convertCurrencyAmount(1, "NPR", displayCurrency, fxRates) : 1,
      );

      const materialRates = (shopMaterialsRes.data?.materials ?? []).reduce(
        (acc: Record<string, number>, material: any) => {
          const rate = Number(material?.pricePerGramNpr ?? 0);
          if (material?.code && rate > 0) acc[material.code] = rate;
          return acc;
        },
        {},
      );
      setShopMaterialRatesNpr(materialRates);
      setBaseMetalPricesNpr(componentRes.data?.baseMetalPrices ?? {});

      const gemstoneOptions = (gemstoneRes.data?.rates ?? [])
        .map((rate: any): GemstoneRateOption | null => {
          const effectivePriceNpr = Number(rate?.effectivePrice ?? 0);
          if (!rate?.stoneType || !rate?.sizeCategory || !rate?.qualityTier || effectivePriceNpr <= 0) {
            return null;
          }
          const origin = rate.origin ?? "NATURAL";
          return {
            key: [rate.stoneType, origin, rate.sizeCategory, rate.qualityTier].join("|"),
            label: `${String(rate.stoneType).replace(/_/g, " ")} ${origin === "LAB_GROWN" ? "Lab" : "Natural"} ${rate.sizeCategory} ${rate.qualityTier}`,
            stoneType: rate.stoneType,
            origin,
            sizeCategory: rate.sizeCategory,
            qualityTier: rate.qualityTier,
            effectivePriceNpr,
            shopPriceNpr: rate.shopPrice,
          };
        })
        .filter(Boolean) as GemstoneRateOption[];
      setGemstoneRateOptions(gemstoneOptions);
    } catch {
      setGoldRate(0);
      setSilverRate(0);
      setMarketRateData(null);
    } finally {
      setRatesLoading(false);
    }
  }, [user?.shop]);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  useEffect(() => {
    if (metalCostMode === "auto") {
      setMetalCostNpr(autoMetalCost);
    }
  }, [autoMetalCost, metalCostMode]);

  useEffect(() => {
    if (gemstoneCostMode === "auto") {
      setGemstoneCostNpr(autoGemstoneCost);
    }
  }, [autoGemstoneCost, gemstoneCostMode]);

  useEffect(() => {
    setCustomerCity((prev: string) => prev || (user?.shop as any)?.city || "");
    setCustomerCountry((prev: string) => prev || (user?.shop as any)?.country || "Nepal");
    if (user?.shop) {
      setCurrency(toSupportedCurrency(getMobileMarketParams(user.shop).currency));
    }
  }, [user?.shop]);

  useEffect(() => {
    const digits = customerPhone.replace(/\D/g, "");
    if (digits.length < 7) {
      setMatchedCustomerId(null);
      return;
    }

    const handle = setTimeout(async () => {
      try {
        setLookingUpCustomer(true);
        const res = await shopQuotesApi.lookupCustomer({
          phoneCountryCode,
          phone: digits,
        });
        const result: CustomerLookupResult = res.data;
        const customer = result?.customer;
        if (result?.found && customer) {
          setMatchedCustomerId(customer.id ?? null);
          setCustomerName((prev) => prev || customer.name || "");
          setCustomerEmail((prev) => prev || customer.email || "");
          setCustomerAddress((prev) => prev || customer.address || "");
          setCustomerCity((prev) => prev || customer.city || "");
          setCustomerCountry((prev) => prev || customer.country || "Nepal");
        } else {
          setMatchedCustomerId(null);
        }
      } catch {
        setMatchedCustomerId(null);
      } finally {
        setLookingUpCustomer(false);
      }
    }, 450);

    return () => clearTimeout(handle);
  }, [customerPhone, phoneCountryCode]);

  const handleSubmit = async () => {
    const phoneDigits = customerPhone.replace(/\D/g, "");
    if (phoneDigits.length < 7) {
      toast({ title: "Enter the customer's phone first", variant: "destructive" });
      return;
    }
    if (!customerName.trim()) {
      toast({ title: "Customer name is required", variant: "destructive" });
      return;
    }
    if (!jewelleryType || !buildMethod) {
      toast({ title: "Select jewellery type and build method", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const composition = {
        materialCategory: selectedMaterial.category,
        materialCode: selectedMaterial.value,
        materialLabel: selectedMaterial.label,
        purity: selectedMaterial.purity,
        quantity,
        weightInput: targetTotalWeightG || undefined,
        weightUnit,
        resolvedWeightGrams: resolvedWeightGrams || undefined,
        sizeOrLength: sizeOrLength.trim() || undefined,
        gemstoneNotes: gemstoneNotes.trim() || undefined,
        gemstoneRate: selectedGemstoneRate
          ? {
              stoneType: selectedGemstoneRate.stoneType,
              origin: selectedGemstoneRate.origin,
              sizeCategory: selectedGemstoneRate.sizeCategory,
              qualityTier: selectedGemstoneRate.qualityTier,
              count: gemstoneCount,
              ratePerStone: selectedGemstoneRate.effectivePriceNpr * nprToDisplayCurrency,
              source: selectedGemstoneRate.shopPriceNpr ? "Store gemstone rate" : "Default gemstone rate",
            }
          : undefined,
        finishNotes: finishNotes.trim() || undefined,
        rateReference: {
          currency,
          gold24kRatePerGram: goldRate || undefined,
          silverRatePerGram: silverRate || undefined,
          materialRatePerGram: materialRateInfo.ratePerGram || undefined,
          materialRateSource: materialRateInfo.source,
        },
      };

      const notes = [
        matchedCustomerId ? `Matched customer ID: ${matchedCustomerId}` : "New walk-in customer from mobile quote.",
        `Displayed currency: ${currency}`,
        shopNotes.trim() ? `Shop notes: ${shopNotes.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const res = await shopQuotesApi.create({
        customer: {
          name: customerName.trim(),
          phoneCountryCode,
          phone: phoneDigits,
          email: customerEmail.trim() || undefined,
          address: customerAddress.trim() || "Not provided",
          city: customerCity.trim() || (user?.shop as any)?.city || "Not provided",
          country: customerCountry.trim() || (user?.shop as any)?.country || "Nepal",
        },
        jewelleryType,
        buildMethod,
        composition,
        targetTotalWeightG: resolvedWeightGrams || undefined,
        targetGoldWeightG:
          selectedMaterial.category === "GOLD" && targetGoldWeightG
            ? targetGoldWeightG
            : undefined,
        specialInstructions: specialInstructions.trim() || undefined,
        metalCostNpr: metalCostNpr || undefined,
        makingChargeNpr: makingChargeNpr || undefined,
        gemstoneCostNpr: gemstoneCostNpr || undefined,
        finishCostNpr: finishCostNpr || undefined,
        estimatedDays: estimatedDays || undefined,
        shopNotes: notes || undefined,
      });

      const quote = res.data ?? {};
      toast({ title: "Quote created", description: quote.quoteNumber ?? "Ready to share" });
      const payParams = new URLSearchParams({
        displayTotal: String(Math.round(estimatedTotalWithTax)),
        currency,
        nprRate: String(nprToDisplayCurrency),
        name: customerName.trim(),
        num: quote.quoteNumber ?? quote.id ?? "",
        phone: customerPhone.replace(/\D/g, ""),
      });
      router.push(`/m/quotes/${quote.id}/payment?${payParams.toString()}`);
    } catch (err: any) {
      toast({
        title: "Failed to create quote",
        description: err?.response?.data?.message ?? "Try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MobileFeatureGate feature="mobileQuotes" featureName="Quote Builder">
      <div className="space-y-4 px-4 py-5 pb-32">
        <div className="-mt-2 mb-1 flex items-start justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-gray-100"><T>Quote Builder</T></h1>
            <p className="text-[11px] text-gray-400"><T>Create a custom estimate from the seller quote flow</T></p>
          </div>

        </div>

        {!ratesLoading && (goldRate > 0 || silverRate > 0) && (
          <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2.5">
            <Calculator className="h-4 w-4 text-amber-600" />
            <p className="text-xs font-medium text-amber-700">
              <T>Market reference</T>: {goldRate > 0 ? `Gold ${fmt(goldRate, currency)}/g` : ""}
              {goldRate > 0 && silverRate > 0 ? " | " : ""}
              {silverRate > 0 ? `Silver ${fmt(silverRate, currency)}/g` : ""}
            </p>
          </div>
        )}

        <section data-tour="m-quote-customer" className="space-y-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400"><T>Customer</T></p>
            {matchedCustomerId && <span className="text-[11px] font-semibold text-emerald-600"><T>Matched</T></span>}
          </div>
          <div className="grid grid-cols-[100px_1fr] gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400"><T>Code</T></label>
              <div className="relative">
                <select
                  value={phoneCountryCode}
                  onChange={(event) => setPhoneCountryCode(event.target.value)}
                  className="w-full appearance-none rounded-xl border border-gray-200 dark:border-gray-800 py-2.5 pl-3 pr-7 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white dark:bg-gray-900"
                  aria-label="Phone country code"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 8px center",
                }}
              >
                <option value="+91">🇮🇳 +91</option>
                <option value="+977">🇳🇵 +977</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+971">🇦🇪 +971</option>
              </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400"><T>Phone First</T></label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                placeholder="Phone first"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 py-2.5 pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              {lookingUpCustomer && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-amber-500" />
              )}
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400"><T>Customer Name</T></label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Customer name"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-800 py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400"><T>Email</T> <span className="normal-case lowercase">(optional)</span></label>
            <input
              type="email"
            value={customerEmail}
            onChange={(event) => setCustomerEmail(event.target.value)}
            placeholder="Email (optional)"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400"><T>Address</T> <span className="normal-case lowercase">(optional)</span></label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <textarea
                value={customerAddress}
              onChange={(event) => setCustomerAddress(event.target.value)}
              placeholder="Address (optional)"
              rows={2}
              className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-800 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400"><T>City</T></label>
              <input
                value={customerCity}
              onChange={(event) => setCustomerCity(event.target.value)}
              placeholder="City"
              className="rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400"><T>Country</T></label>
              <input
                value={customerCountry}
              onChange={(event) => setCustomerCountry(event.target.value)}
              placeholder="Country"
              className="rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            </div>
          </div>
        </section>

        <section data-tour="m-quote-items" className="space-y-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400"><T>Item and Material</T></p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400"><T>Jewellery Type</T></label>
              <select
                value={jewelleryType}
              onChange={(event) => setJewelleryType(event.target.value)}
              className="rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {JEWELLERY_TYPES.map((type) => (
                <option key={type} value={type}>{type.replace(/_/g, " ")}</option>
              ))}
            </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400"><T>Quantity</T></label>
              <input
                type="number"
                min="1"
                inputMode="numeric"
                value={quantity || ""}
                onChange={(event) => setQuantity(Math.max(1, Number.parseInt(event.target.value) || 1))}
                placeholder="Qty"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400"><T>Build Method</T></label>
            <select
              value={buildMethod}
            onChange={(event) => setBuildMethod(event.target.value)}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {BUILD_METHODS.map((method) => (
              <option key={method.value} value={method.value}>{method.label}</option>
            ))}
          </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400"><T>Material</T></label>
            <select
              value={materialCode}
            onChange={(event) => {
              setMaterialCode(event.target.value);
              setMetalCostMode("auto");
            }}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {MATERIAL_OPTIONS.map((material) => (
              <option key={material.value} value={material.value}>{material.label}</option>
            ))}
          </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400"><T>Target Weight</T></label>
              <div className="grid grid-cols-[1fr_82px] gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={targetTotalWeightG || ""}
                  onChange={(event) => {
                  setTargetTotalWeightG(numberFromInput(event.target.value));
                  setMetalCostMode("auto");
                }}
                placeholder="Weight"
                className="min-w-0 rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <select
                value={weightUnit}
                onChange={(event) => {
                  setWeightUnit(event.target.value as WeightUnit);
                  setMetalCostMode("auto");
                }}
                className="rounded-xl border border-gray-200 dark:border-gray-800 px-2 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="GRAM">g</option>
                <option value="TOLA">tola</option>
              </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400"><T>Size / Length</T></label>
              <input
                value={sizeOrLength}
              onChange={(event) => setSizeOrLength(event.target.value)}
              placeholder="Size / length"
              className="rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            </div>
          </div>
          {selectedMaterial.category === "GOLD" && (
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400"><T>Gold weight</T> <span className="normal-case lowercase">(optional)</span></label>
              <input
                type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={targetGoldWeightG || ""}
              onChange={(event) => setTargetGoldWeightG(numberFromInput(event.target.value))}
              placeholder="Gold weight g (optional)"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            </div>
          )}
          {materialRateInfo.ratePerGram > 0 && resolvedWeightGrams > 0 && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700">
              <T>Estimated</T>: {resolvedWeightGrams.toFixed(2)}g × {fmt(materialRateInfo.ratePerGram, currency)} = {fmt(autoMetalCost, currency)}<br />
              <span className="text-[10px] opacity-80">(From {materialRateInfo.source})</span>
            </p>
          )}
        </section>

        <section className="space-y-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="flex items-center gap-2">
            <Gem className="h-4 w-4 text-amber-600" />
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400"><T>Pricing</T></p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400"><T>Material Cost</T></label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={metalCostNpr || ""}
                onChange={(event) => {
                setMetalCostMode("manual");
                setMetalCostNpr(numberFromInput(event.target.value));
              }}
              placeholder="Material cost"
              className="rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400"><T>Making Charge</T></label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={makingChargeNpr || ""}
                onChange={(event) => setMakingChargeNpr(numberFromInput(event.target.value))}
                placeholder="Making charge"
              className="rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400"><T>Gemstone Cost</T></label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={gemstoneCostNpr || ""}
                onChange={(event) => {
                setGemstoneCostMode("manual");
                setGemstoneCostNpr(numberFromInput(event.target.value));
              }}
              placeholder="Gemstone cost"
              className="rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400"><T>Finish Cost</T></label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={finishCostNpr || ""}
                onChange={(event) => setFinishCostNpr(numberFromInput(event.target.value))}
                placeholder="Finish cost"
              className="rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            </div>
          </div>
          {autoMetalCost > 0 && (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 dark:bg-gray-950 px-3 py-2 text-[11px] text-gray-600 dark:text-gray-400">
              <span>
                {metalCostMode === "auto" ? "Auto material" : "Suggested material"}: {fmt(autoMetalCost, currency)}
              </span>
              {metalCostMode === "manual" && (
                <button
                  type="button"
                  onClick={() => setMetalCostMode("auto")}
                  className="shrink-0 font-semibold text-amber-700"
                >
                  Use auto
                </button>
              )}
            </div>
          )}
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400"><T>Gemstone Selection</T></label>
            <button
              type="button"
              onClick={() => setIsGemstoneDrawerOpen(true)}
              className="w-full text-left flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-gray-50 dark:bg-gray-800"
            >
              <span className="truncate text-gray-700 dark:text-gray-300">
                {gemstonesV2.length > 0
                  ? `${gemstonesV2.length} Gemstone(s) = ${fmt(autoGemstoneCost, currency)}`
                  : "Configure Gemstone"}
              </span>
              <span className="text-xs font-semibold text-amber-600 ml-2 shrink-0"><T>Edit</T></span>
            </button>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400"><T>Estimated days</T></label>
            <input type="number" inputMode="numeric" min="1" value={estimatedDays || ""} onChange={(event) => setEstimatedDays(Math.max(1, Number.parseInt(event.target.value) || 1))} placeholder="Estimated days" className="w-full rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400"><T>Gemstone details</T> <span className="normal-case lowercase">(optional)</span></label>
            <textarea value={gemstoneNotes} onChange={(event) => setGemstoneNotes(event.target.value)} rows={2} placeholder="Gemstone details (optional)" className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400"><T>Finish / plating details</T></label>
            <textarea value={finishNotes} onChange={(event) => setFinishNotes(event.target.value)} rows={2} placeholder="Finish / plating / polish details" className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400"><T>Customer instructions</T></label>
            <textarea value={specialInstructions} onChange={(event) => setSpecialInstructions(event.target.value)} rows={3} placeholder="Customer instructions" className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400"><T>Internal shop notes</T></label>
            <textarea value={shopNotes} onChange={(event) => setShopNotes(event.target.value)} rows={2} placeholder="Internal shop notes" className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
        </section>

        {estimateTotal > 0 && (
          <section data-tour="m-quote-total" className="space-y-2 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400"><T>Subtotal</T></span><span>{fmt(estimateTotal, currency)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400"><T>Estimated tax (3%)</T></span><span>{fmt(estimatedTax, currency)}</span></div>
            <div className="flex justify-between border-t pt-2 font-bold"><span><T>Total estimate</T></span><span className="text-amber-700">{fmt(estimatedTotalWithTax, currency)}</span></div>
          </section>
        )}

        <div className="fixed bottom-16 left-0 right-0 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 pb-4 pt-2">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 py-4 text-base font-semibold text-white shadow-lg shadow-amber-500/25 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-5 w-5" />}
            <T>Create Quote</T> - {fmt(estimatedTotalWithTax, currency)}
          </button>
        </div>
      </div>

      {isGemstoneDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 transition-opacity">
          <div className="relative mt-24 flex h-auto max-h-[85vh] flex-col rounded-t-3xl bg-white dark:bg-gray-900 shadow-xl">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100"><T>Configure Gemstone</T></h2>
              <button
                onClick={() => setIsGemstoneDrawerOpen(false)}
                className="rounded-full bg-gray-100 dark:bg-gray-800 p-2 text-gray-500 dark:text-gray-400"
              >
                <T>Close</T>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <GemstoneEditorV2
                gemstones={gemstonesV2}
                onChange={(updated) => {
                  setGemstonesV2(updated);
                  setGemstoneCostMode("auto");
                }}
                currencySymbol={
                  currency === "NPR" ? "रु" : currency === "INR" ? "₹" : currency === "USD" ? "$" : currency
                }
                selectedCurrency={currency}
                exchangeRate={nprToDisplayCurrency * 144}
              />
            </div>
            <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 p-4">
              <button
                onClick={() => setIsGemstoneDrawerOpen(false)}
                className="w-full rounded-2xl bg-gray-900 dark:bg-amber-600 py-3.5 text-sm font-semibold text-white shadow"
              >
                <T>Save & Close</T>
              </button>
            </div>
          </div>
        </div>
      )}
    </MobileFeatureGate>
  );
}
