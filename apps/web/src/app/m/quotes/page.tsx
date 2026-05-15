"use client";

import { MobileFeatureGate } from "@/components/mobile/MobileFeatureGate";
import { MobileHelpButton } from "@/components/mobile/MobileHelpButton";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { materialsApi, shopQuotesApi } from "@/lib/api";
import {
    Calculator,
    Check,
    Loader2,
    MessageCircle,
    Trash2,
    User
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const PURITY_OPTIONS = [
  { label: "24K (99.9%)", purity: 0.999 },
  { label: "22K (91.6%)", purity: 0.916 },
  { label: "18K (75%)", purity: 0.75 },
  { label: "14K (58.3%)", purity: 0.583 },
];

interface QuoteLineItem {
  id: string;
  description: string;
  weightGrams: number;
  purity: number;
  makingCharges: number;
  goldRatePerGram: number;
  lineTotal: number;
}

function fmt(n: number, cur = "NPR") {
  return `${cur} ${Math.round(n).toLocaleString("en-IN")}`;
}

function LineItemRow({
  item,
  goldRate,
  currency,
  onUpdate,
  onRemove,
}: {
  item: QuoteLineItem;
  goldRate: number;
  currency: string;
  onUpdate: (updated: QuoteLineItem) => void;
  onRemove: () => void;
}) {
  const basePrice = item.weightGrams * goldRate * item.purity;
  const total = basePrice + item.makingCharges;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <input
          type="text"
          value={item.description}
          onChange={(e) =>
            onUpdate({ ...item, description: e.target.value, lineTotal: total })
          }
          placeholder="Item description (e.g. Gold ring 22K)"
          className="flex-1 text-sm font-medium bg-transparent focus:outline-none text-gray-800"
        />
        <button onClick={onRemove} className="p-1 text-red-400 hover:text-red-600 ml-2">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Purity selector */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none">
        {PURITY_OPTIONS.map((p) => (
          <button
            key={p.label}
            onClick={() => onUpdate({ ...item, purity: p.purity, lineTotal: total })}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              item.purity === p.purity
                ? "bg-amber-500 text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Weight + Making charges */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-gray-400 font-medium uppercase">
            <T>Weight (g)</T>
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={item.weightGrams || ""}
            onChange={(e) =>
              onUpdate({
                ...item,
                weightGrams: parseFloat(e.target.value) || 0,
                lineTotal: total,
              })
            }
            className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 font-medium uppercase">
            <T>Making Charges</T>
          </label>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={item.makingCharges || ""}
            onChange={(e) =>
              onUpdate({
                ...item,
                makingCharges: parseFloat(e.target.value) || 0,
                lineTotal: total,
              })
            }
            className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="0"
          />
        </div>
      </div>

      {/* Line total */}
      <div className="flex items-center justify-between pt-1 border-t border-dashed border-gray-100">
        <p className="text-xs text-gray-400">
          {item.weightGrams}g × {fmt(goldRate * item.purity, currency)}/g + making
        </p>
        <p className="text-sm font-bold text-amber-700">{fmt(total, currency)}</p>
      </div>
    </div>
  );
}

let nextId = 1;
function makeItem(): QuoteLineItem {
  return {
    id: String(nextId++),
    description: "",
    weightGrams: 0,
    purity: 0.916,
    makingCharges: 0,
    goldRatePerGram: 0,
    lineTotal: 0,
  };
}

export default function QuotesPage() {
  const { user } = useAuth();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [items, setItems] = useState<QuoteLineItem[]>([makeItem()]);
  const [goldRate, setGoldRate] = useState<number>(0);
  const [currency, setCurrency] = useState("NPR");
  const [ratesLoading, setRatesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quoteResult, setQuoteResult] = useState<{ id: string; total: number } | null>(null);

  const loadRates = useCallback(async () => {
    try {
      const res = await materialsApi.getMarketRates();
      const d = res.data;
      const gold = d?.metals?.find?.((m: any) => m.code === "XAU" || m.code === "GOLD");
      setGoldRate(gold?.ratePerGram ?? gold?.rate ?? 7200);
      setCurrency(d?.currency ?? "NPR");
    } catch {
      setGoldRate(7200); // fallback
    } finally {
      setRatesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  const recalcItems = (rawItems: QuoteLineItem[]) =>
    rawItems.map((i) => ({
      ...i,
      lineTotal: i.weightGrams * goldRate * i.purity + i.makingCharges,
    }));

  const updateItem = (id: string, updated: QuoteLineItem) =>
    setItems((prev) => recalcItems(prev.map((i) => (i.id === id ? updated : i))));

  const removeItem = (id: string) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.id !== id) : prev));

  const addItem = () => setItems((prev) => [...prev, makeItem()]);

  const subtotal = items.reduce(
    (s, i) => s + i.weightGrams * goldRate * i.purity + i.makingCharges,
    0,
  );
  const tax = Math.round(subtotal * 0.03);
  const total = subtotal + tax;

  const handleSubmit = async () => {
    if (items.every((i) => i.weightGrams === 0)) {
      toast({ title: "Please add at least one item with weight", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await shopQuotesApi.create({
        customerName: customerName || "Walk-in Customer",
        customerPhone: customerPhone || undefined,
        items: items.map((i) => ({
          description: i.description || "Gold item",
          weightGrams: i.weightGrams,
          metalPurity: i.purity,
          makingCharges: i.makingCharges,
          goldRatePerGram: goldRate,
          lineTotalNpr: i.weightGrams * goldRate * i.purity + i.makingCharges,
        })),
        goldRatePerGram: goldRate,
        subtotalNpr: subtotal,
        taxNpr: tax,
        totalNpr: total,
        currency,
        source: "MOBILE_QUOTE",
      });
      setQuoteResult({ id: res.data?.id ?? res.data?.quoteId, total });
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
    const trackUrl = `${baseUrl}/track/${quoteResult.id}`;
    const msg = encodeURIComponent(
      `Hello${customerName ? ` ${customerName}` : ""},\n\nHere is your jewellery quote from *${user?.shop?.shopName ?? "our store"}*.\n\n` +
        items
          .filter((i) => i.weightGrams > 0)
          .map(
            (i) =>
              `• ${i.description || "Gold item"} (${i.weightGrams}g, ${PURITY_OPTIONS.find((p) => p.purity === i.purity)?.label ?? ""}): ${fmt(i.weightGrams * goldRate * i.purity + i.makingCharges, currency)}`,
          )
          .join("\n") +
        `\n\n*Total: ${fmt(total, currency)}* (incl. 3% tax)\n\nView full quote: ${trackUrl}`,
    );
    const waUrl = customerPhone
      ? `https://wa.me/${customerPhone.replace(/\D/g, "")}?text=${msg}`
      : `https://wa.me/?text=${msg}`;

    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-6">
        <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
          <Check className="h-10 w-10 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold"><T>Quote Created!</T></h2>
          <p className="text-sm text-gray-500 mt-1">{fmt(total, currency)}</p>
        </div>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full max-w-xs py-4 bg-[#25D366] text-white text-base font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-lg"
        >
          <MessageCircle className="h-5 w-5" />
          <T>Send Quote via WhatsApp</T>
        </a>
        <button
          onClick={() => {
            setQuoteResult(null);
            setItems([makeItem()]);
            setCustomerName("");
            setCustomerPhone("");
          }}
          className="text-sm text-amber-600 font-medium underline underline-offset-2"
        >
          <T>New Quote</T>
        </button>
      </div>
    );
  }

  return (
    <MobileFeatureGate feature="mobileQuotes" featureName="Quote Builder">
      <div className="px-4 py-5 space-y-4 pb-32">
      {/* Page header */}
      <div className="flex items-start justify-between -mt-2 mb-1">
        <div>
          <h1 className="text-base font-bold text-gray-900"><T>Quote Builder</T></h1>
          <p className="text-[11px] text-gray-400"><T>Build and share a custom estimate</T></p>
        </div>
        <MobileHelpButton
          title="Quote Builder"
          description="Create a multi-item estimate for jewelry, share it on WhatsApp, and convert to a bill when the customer agrees."
          tips={[
            "Add the customer's name & phone for direct WhatsApp sharing",
            "Add as many line items as you need — weight, purity, making %",
            "All prices use today's live gold rate; lock the rate per quote if needed",
            "Share PDF or WhatsApp link directly; convert to bill from the Quote screen",
          ]}
        />
      </div>
      {/* Gold rate indicator */}
      {!ratesLoading && goldRate > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 rounded-2xl">
          <Calculator className="h-4 w-4 text-amber-600" />
          <p className="text-sm text-amber-700 font-medium">
            Using 24K rate: {fmt(goldRate, currency)}/g
          </p>
        </div>
      )}

      {/* Customer info */}
      <div data-tour="m-quote-customer" className="space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          <T>Customer (Optional)</T>
        </p>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Customer name"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <input
          type="tel"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          placeholder="Phone (for WhatsApp)"
          className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>

      {/* Line items */}
      <div data-tour="m-quote-items" className="space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          <T>Items</T>
        </p>
        {items.map((item) => (
          <LineItemRow
            key={item.id}
            item={item}
            goldRate={goldRate}
            currency={currency}
            onUpdate={(u) => updateItem(item.id, u)}
            onRemove={() => removeItem(item.id)}
          />
        ))}
        <button
          onClick={addItem}
          className="w-full py-3 border border-dashed border-amber-300 rounded-2xl text-amber-600 text-sm font-medium hover:bg-amber-50 active:bg-amber-100"
        >
          <T>+ Add Item</T>
        </button>
      </div>

      {/* Totals */}
      {subtotal > 0 && (
        <div data-tour="m-quote-total" className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500"><T>Subtotal</T></span>
            <span>{fmt(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500"><T>Tax (3%)</T></span>
            <span>{fmt(tax, currency)}</span>
          </div>
          <div className="flex justify-between font-bold border-t pt-2">
            <span><T>Total</T></span>
            <span className="text-amber-700">{fmt(total, currency)}</span>
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="fixed bottom-16 left-0 right-0 px-4 pb-4 pt-2 bg-white border-t border-gray-100">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-base font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <MessageCircle className="h-5 w-5" />
          )}
          Create Quote — {fmt(total, currency)}
        </button>
      </div>
    </div>
    </MobileFeatureGate>
  );
}
