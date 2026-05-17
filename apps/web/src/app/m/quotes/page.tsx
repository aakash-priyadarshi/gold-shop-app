"use client";

import { MobileFeatureGate } from "@/components/mobile/MobileFeatureGate";
import { MobileHelpButton } from "@/components/mobile/MobileHelpButton";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { materialsApi, shopQuotesApi } from "@/lib/api";
import { getMobileMarketParams } from "@/lib/mobileCurrency";
import {
  Calculator,
  Check,
  FileDown,
  Gem,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  User,
} from "lucide-react";
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
  { value: "BASE_METAL", label: "Base metal / plated", category: "BASE_METAL" },
];

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

interface CreatedQuote {
  id: string;
  quoteNumber?: string;
  trackingToken?: string;
  total: number;
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

function numberFromInput(value: string) {
  return Number.parseFloat(value) || 0;
}

export default function QuotesPage() {
  const { user } = useAuth();
  const initialParams = getMobileMarketParams(user?.shop ?? null);
  const [currency, setCurrency] = useState(initialParams.currency);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [goldRate, setGoldRate] = useState(0);
  const [silverRate, setSilverRate] = useState(0);

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
  const [targetGoldWeightG, setTargetGoldWeightG] = useState(0);
  const [sizeOrLength, setSizeOrLength] = useState("");
  const [metalCostNpr, setMetalCostNpr] = useState(0);
  const [makingChargeNpr, setMakingChargeNpr] = useState(0);
  const [gemstoneCostNpr, setGemstoneCostNpr] = useState(0);
  const [finishCostNpr, setFinishCostNpr] = useState(0);
  const [estimatedDays, setEstimatedDays] = useState(7);
  const [gemstoneNotes, setGemstoneNotes] = useState("");
  const [finishNotes, setFinishNotes] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [shopNotes, setShopNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [quoteResult, setQuoteResult] = useState<CreatedQuote | null>(null);

  const selectedMaterial = useMemo(
    () => MATERIAL_OPTIONS.find((m) => m.value === materialCode) ?? MATERIAL_OPTIONS[0],
    [materialCode],
  );

  const estimateTotal = metalCostNpr + makingChargeNpr + gemstoneCostNpr + finishCostNpr;
  const estimatedTax = Math.round(estimateTotal * 0.03);
  const estimatedTotalWithTax = estimateTotal + estimatedTax;

  const loadRates = useCallback(async () => {
    try {
      const params = getMobileMarketParams(user?.shop ?? null);
      const res = await materialsApi.getMarketRates(params);
      const data = res.data;
      setGoldRate(readMetalRate(data, ["GOLD_24K", "XAU", "GOLD"]));
      setSilverRate(readMetalRate(data, ["SILVER_999", "SILVER_925", "XAG", "SILVER"]));
      setCurrency(data?.currency ?? params.currency);
    } catch {
      setGoldRate(0);
      setSilverRate(0);
    } finally {
      setRatesLoading(false);
    }
  }, [user?.shop]);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  useEffect(() => {
    setCustomerCity((prev: string) => prev || (user?.shop as any)?.city || "");
    setCustomerCountry((prev: string) => prev || (user?.shop as any)?.country || "Nepal");
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
        sizeOrLength: sizeOrLength.trim() || undefined,
        gemstoneNotes: gemstoneNotes.trim() || undefined,
        finishNotes: finishNotes.trim() || undefined,
        rateReference: {
          currency,
          gold24kRatePerGram: goldRate || undefined,
          silverRatePerGram: silverRate || undefined,
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
        targetTotalWeightG: targetTotalWeightG || undefined,
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
      setQuoteResult({
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        trackingToken: quote.trackingToken,
        total: Number(quote.totalPriceNpr ?? estimatedTotalWithTax),
      });
      toast({ title: "Quote created", description: quote.quoteNumber ?? "Ready to share" });
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

  if (quoteResult) {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://orivraa.com";
    const trackingUrl = quoteResult.trackingToken
      ? `${baseUrl}/track/${quoteResult.trackingToken}`
      : "";
    const message = encodeURIComponent(
      `Hello ${customerName.trim()},\n\n` +
        `Your quote from ${user?.shop?.shopName ?? "our store"} is ready.\n` +
        `Quote: ${quoteResult.quoteNumber ?? quoteResult.id}\n` +
        `Item: ${jewelleryType.replace(/_/g, " ")}\n` +
        `Material: ${selectedMaterial.label}\n` +
        `Estimate: ${fmt(quoteResult.total, currency)}\n` +
        (trackingUrl ? `\nView quote: ${trackingUrl}` : ""),
    );
    const whatsappUrl = customerPhone
      ? `https://wa.me/${customerPhone.replace(/\D/g, "")}?text=${message}`
      : `https://wa.me/?text=${message}`;

    const exportPdf = () => {
      const printWindow = window.open("", "_blank", "width=720,height=900");
      if (!printWindow) {
        toast({ title: "Pop-ups are blocked", variant: "destructive" });
        return;
      }
      const safe = (value: string) => value.replace(/</g, "&lt;");
      printWindow.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>${safe(quoteResult.quoteNumber ?? "Quote")}</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f2937;padding:32px;max-width:760px;margin:0 auto}
h1{color:#b45309;margin:0 0 4px}.muted{color:#6b7280;font-size:12px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:24px 0}
.box{border:1px solid #e5e7eb;border-radius:12px;padding:14px;margin-top:14px}.row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f3f4f6}.row:last-child{border-bottom:0}.total{font-size:18px;font-weight:700;color:#b45309}.notes{white-space:pre-wrap;font-size:12px;color:#374151}
@media print{button{display:none}}
</style></head><body>
<button onclick="window.print()" style="position:fixed;top:16px;right:16px;padding:8px 16px;background:#b45309;color:#fff;border:0;border-radius:8px;font-weight:600">Print / Save as PDF</button>
<h1>${safe(user?.shop?.shopName ?? "Quote")}</h1>
<div class="muted">${safe((user?.shop as any)?.address ?? "")}</div>
<div class="grid"><div><div class="muted">QUOTE FOR</div><strong>${safe(customerName)}</strong><div class="muted">${safe(phoneCountryCode)} ${safe(customerPhone)}</div></div><div style="text-align:right"><div class="muted">QUOTE</div><strong>${safe(quoteResult.quoteNumber ?? quoteResult.id)}</strong><div class="muted">${new Date().toLocaleDateString("en-IN")}</div></div></div>
<div class="box"><div class="row"><span>Jewellery type</span><strong>${safe(jewelleryType.replace(/_/g, " "))}</strong></div><div class="row"><span>Build method</span><strong>${safe(BUILD_METHODS.find((m) => m.value === buildMethod)?.label ?? buildMethod)}</strong></div><div class="row"><span>Material</span><strong>${safe(selectedMaterial.label)}</strong></div><div class="row"><span>Weight</span><strong>${targetTotalWeightG || 0} g</strong></div></div>
<div class="box"><div class="row"><span>Metal/material</span><span>${fmt(metalCostNpr, currency)}</span></div><div class="row"><span>Making</span><span>${fmt(makingChargeNpr, currency)}</span></div><div class="row"><span>Gemstone</span><span>${fmt(gemstoneCostNpr, currency)}</span></div><div class="row"><span>Finish</span><span>${fmt(finishCostNpr, currency)}</span></div><div class="row total"><span>Total estimate</span><span>${fmt(quoteResult.total, currency)}</span></div></div>
${specialInstructions.trim() ? `<div class="box notes"><strong>Instructions</strong>\n${safe(specialInstructions.trim())}</div>` : ""}
${trackingUrl ? `<div class="muted" style="margin-top:20px">Track: ${trackingUrl}</div>` : ""}
<script>setTimeout(function(){window.print();},400);</script></body></html>`);
      printWindow.document.close();
    };

    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <Check className="h-10 w-10 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold"><T>Quote Created</T></h2>
          <p className="mt-1 text-sm text-gray-500">
            {quoteResult.quoteNumber ?? quoteResult.id} - {fmt(quoteResult.total, currency)}
          </p>
        </div>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-4 text-base font-semibold text-white shadow-lg"
        >
          <MessageCircle className="h-5 w-5" />
          <T>Send via WhatsApp</T>
        </a>
        <button
          onClick={exportPdf}
          className="flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl border border-amber-300 py-3 text-sm font-semibold text-amber-700"
        >
          <FileDown className="h-4 w-4" />
          <T>Export as PDF</T>
        </button>
        <button
          onClick={() => {
            setQuoteResult(null);
            setCustomerPhone("");
            setCustomerName("");
            setCustomerEmail("");
            setCustomerAddress("");
            setMatchedCustomerId(null);
            setMetalCostNpr(0);
            setMakingChargeNpr(0);
            setGemstoneCostNpr(0);
            setFinishCostNpr(0);
            setSpecialInstructions("");
          }}
          className="text-sm font-medium text-amber-600 underline underline-offset-2"
        >
          <T>New Quote</T>
        </button>
      </div>
    );
  }

  return (
    <MobileFeatureGate feature="mobileQuotes" featureName="Quote Builder">
      <div className="space-y-4 px-4 py-5 pb-32">
        <div className="-mt-2 mb-1 flex items-start justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-900"><T>Quote Builder</T></h1>
            <p className="text-[11px] text-gray-400"><T>Create a custom estimate from the seller quote flow</T></p>
          </div>
          <MobileHelpButton
            title="Quote Builder"
            description="Create a seller quote with customer lookup, material details, pricing, and WhatsApp sharing."
            tips={[
              "Enter phone first to fetch an existing customer before editing details",
              "Choose the actual material or select other/customer-provided material",
              "Use pricing fields to mirror the PC seller quote totals",
              "The created quote keeps the same walk-in customer identity used on desktop",
            ]}
          />
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

        <section data-tour="m-quote-customer" className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400"><T>Customer</T></p>
            {matchedCustomerId && <span className="text-[11px] font-semibold text-emerald-600"><T>Matched</T></span>}
          </div>
          <div className="grid grid-cols-[88px_1fr] gap-2">
            <input
              value={phoneCountryCode}
              onChange={(event) => setPhoneCountryCode(event.target.value)}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              aria-label="Phone country code"
            />
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                placeholder="Phone first"
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              {lookingUpCustomer && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-amber-500" />
              )}
            </div>
          </div>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Customer name"
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <input
            type="email"
            value={customerEmail}
            onChange={(event) => setCustomerEmail(event.target.value)}
            placeholder="Email (optional)"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <textarea
              value={customerAddress}
              onChange={(event) => setCustomerAddress(event.target.value)}
              placeholder="Address (optional)"
              rows={2}
              className="w-full resize-none rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={customerCity}
              onChange={(event) => setCustomerCity(event.target.value)}
              placeholder="City"
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <input
              value={customerCountry}
              onChange={(event) => setCustomerCountry(event.target.value)}
              placeholder="Country"
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </section>

        <section data-tour="m-quote-items" className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400"><T>Item and Material</T></p>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={jewelleryType}
              onChange={(event) => setJewelleryType(event.target.value)}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {JEWELLERY_TYPES.map((type) => (
                <option key={type} value={type}>{type.replace(/_/g, " ")}</option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              inputMode="numeric"
              value={quantity || ""}
              onChange={(event) => setQuantity(Math.max(1, Number.parseInt(event.target.value) || 1))}
              placeholder="Qty"
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <select
            value={buildMethod}
            onChange={(event) => setBuildMethod(event.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {BUILD_METHODS.map((method) => (
              <option key={method.value} value={method.value}>{method.label}</option>
            ))}
          </select>
          <select
            value={materialCode}
            onChange={(event) => setMaterialCode(event.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {MATERIAL_OPTIONS.map((material) => (
              <option key={material.value} value={material.value}>{material.label}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={targetTotalWeightG || ""}
              onChange={(event) => setTargetTotalWeightG(numberFromInput(event.target.value))}
              placeholder="Total weight g"
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <input
              value={sizeOrLength}
              onChange={(event) => setSizeOrLength(event.target.value)}
              placeholder="Size / length"
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          {selectedMaterial.category === "GOLD" && (
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={targetGoldWeightG || ""}
              onChange={(event) => setTargetGoldWeightG(numberFromInput(event.target.value))}
              placeholder="Gold weight g (optional)"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          )}
        </section>

        <section className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2">
            <Gem className="h-4 w-4 text-amber-600" />
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400"><T>Pricing</T></p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" inputMode="decimal" min="0" value={metalCostNpr || ""} onChange={(event) => setMetalCostNpr(numberFromInput(event.target.value))} placeholder="Material cost" className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            <input type="number" inputMode="decimal" min="0" value={makingChargeNpr || ""} onChange={(event) => setMakingChargeNpr(numberFromInput(event.target.value))} placeholder="Making charge" className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            <input type="number" inputMode="decimal" min="0" value={gemstoneCostNpr || ""} onChange={(event) => setGemstoneCostNpr(numberFromInput(event.target.value))} placeholder="Gemstone cost" className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            <input type="number" inputMode="decimal" min="0" value={finishCostNpr || ""} onChange={(event) => setFinishCostNpr(numberFromInput(event.target.value))} placeholder="Finish cost" className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <input type="number" inputMode="numeric" min="1" value={estimatedDays || ""} onChange={(event) => setEstimatedDays(Math.max(1, Number.parseInt(event.target.value) || 1))} placeholder="Estimated days" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          <textarea value={gemstoneNotes} onChange={(event) => setGemstoneNotes(event.target.value)} rows={2} placeholder="Gemstone details (optional)" className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          <textarea value={finishNotes} onChange={(event) => setFinishNotes(event.target.value)} rows={2} placeholder="Finish / plating / polish details" className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          <textarea value={specialInstructions} onChange={(event) => setSpecialInstructions(event.target.value)} rows={3} placeholder="Customer instructions" className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          <textarea value={shopNotes} onChange={(event) => setShopNotes(event.target.value)} rows={2} placeholder="Internal shop notes" className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </section>

        {estimateTotal > 0 && (
          <section data-tour="m-quote-total" className="space-y-2 rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex justify-between text-sm"><span className="text-gray-500"><T>Subtotal</T></span><span>{fmt(estimateTotal, currency)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500"><T>Estimated tax</T></span><span>{fmt(estimatedTax, currency)}</span></div>
            <div className="flex justify-between border-t pt-2 font-bold"><span><T>Total estimate</T></span><span className="text-amber-700">{fmt(estimatedTotalWithTax, currency)}</span></div>
          </section>
        )}

        <div className="fixed bottom-16 left-0 right-0 border-t border-gray-100 bg-white px-4 pb-4 pt-2">
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
    </MobileFeatureGate>
  );
}
