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
    ChevronDown,
    FileDown,
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
  const [lookingUpCustomer, setLookingUpCustomer] = useState(false);
  const [items, setItems] = useState<QuoteLineItem[]>([makeItem()]);
  const [goldRate, setGoldRate] = useState<number>(0);
  // Initial currency comes from the shop's country (geo cookie as fallback);
  // updated when market rates arrive so the displayed currency always matches
  // the rates that are actually loaded.
  const initialParams = getMobileMarketParams(user?.shop ?? null);
  const [currency, setCurrency] = useState(initialParams.currency);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quoteResult, setQuoteResult] = useState<{ id: string; total: number } | null>(null);

  // Optional / advanced quote fields (parity with PC quote form).
  const [discountPct, setDiscountPct] = useState<number>(0);
  const [validityDays, setValidityDays] = useState<number>(7);
  const [terms, setTerms] = useState<string>(
    "• Rates are subject to change at time of billing.\n• 50% advance required to lock making charges.\n• Quote is valid for the period stated above.",
  );
  const [notes, setNotes] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const loadRates = useCallback(async () => {
    try {
      const params = getMobileMarketParams(user?.shop ?? null);
      const res = await materialsApi.getMarketRates(params);
      const d = res.data;
      const gold = d?.metals?.find?.((m: any) => m.code === "XAU" || m.code === "GOLD");
      setGoldRate(gold?.ratePerGram ?? gold?.rate ?? 7200);
      setCurrency(d?.currency ?? params.currency);
    } catch {
      setGoldRate(7200); // fallback
    } finally {
      setRatesLoading(false);
    }
  }, [user?.shop]);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  // Auto-fill customer name from phone (debounced) — same pattern as PC RFQ.
  useEffect(() => {
    const digits = customerPhone.replace(/\D/g, "");
    if (digits.length < 7) return;
    const handle = setTimeout(async () => {
      try {
        setLookingUpCustomer(true);
        const res = await shopQuotesApi.lookupCustomer({
          phoneCountryCode: "+977",
          phone: digits,
        });
        const found = res.data;
        if (found?.name && !customerName) setCustomerName(found.name);
      } catch {
        // no existing customer — ignore
      } finally {
        setLookingUpCustomer(false);
      }
    }, 450);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerPhone]);

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
  const discount = Math.round((subtotal * (discountPct || 0)) / 100);
  const taxable = Math.max(0, subtotal - discount);
  const tax = Math.round(taxable * 0.03);
  const total = taxable + tax;

  const validUntilDate = new Date(Date.now() + (validityDays || 0) * 86400000);
  const formattedValidUntil = validUntilDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const handleSubmit = async () => {
    if (items.every((i) => i.weightGrams === 0)) {
      toast({ title: "Please add at least one item with weight", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const shopNotesParts: string[] = [];
      if (validityDays) shopNotesParts.push(`Valid until: ${formattedValidUntil} (${validityDays} days).`);
      if (discountPct) shopNotesParts.push(`Discount applied: ${discountPct}%.`);
      if (terms.trim()) shopNotesParts.push(`Terms:\n${terms.trim()}`);
      if (notes.trim()) shopNotesParts.push(`Notes:\n${notes.trim()}`);
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
        discountNpr: discount,
        discountPercent: discountPct,
        taxNpr: tax,
        totalNpr: total,
        currency,
        validityDays,
        validUntil: validUntilDate.toISOString(),
        terms: terms.trim() || undefined,
        shopNotes: shopNotesParts.join("\n\n") || undefined,
        customerNotes: notes.trim() || undefined,
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
    const itemLines = items
      .filter((i) => i.weightGrams > 0)
      .map(
        (i) =>
          `• ${i.description || "Gold item"} (${i.weightGrams}g, ${PURITY_OPTIONS.find((p) => p.purity === i.purity)?.label ?? ""}): ${fmt(i.weightGrams * goldRate * i.purity + i.makingCharges, currency)}`,
      )
      .join("\n");
    const totalsBlock = [
      `Subtotal: ${fmt(subtotal, currency)}`,
      discount > 0 ? `Discount (${discountPct}%): -${fmt(discount, currency)}` : "",
      `Tax (3%): ${fmt(tax, currency)}`,
      `*Total: ${fmt(total, currency)}*`,
    ]
      .filter(Boolean)
      .join("\n");
    const msg = encodeURIComponent(
      `Hello${customerName ? ` ${customerName}` : ""},\n\nHere is your jewellery quote from *${user?.shop?.shopName ?? "our store"}*.\n\n` +
        itemLines +
        `\n\n${totalsBlock}\n\n` +
        `Valid until: ${formattedValidUntil}\n` +
        (terms.trim() ? `\nTerms:\n${terms.trim()}\n` : "") +
        (notes.trim() ? `\nNotes:\n${notes.trim()}\n` : "") +
        `\nView full quote: ${trackUrl}`,
    );

    const exportPdf = () => {
      const w = window.open("", "_blank", "width=720,height=900");
      if (!w) {
        toast({ title: "Pop-ups are blocked", description: "Allow pop-ups and try again.", variant: "destructive" });
        return;
      }
      const shopName = user?.shop?.shopName ?? "Our Store";
      const shopAddress = user?.shop?.address ?? "";
      const shopPhone = (user?.shop as { contactPhone?: string; phone?: string } | undefined)?.contactPhone ?? (user?.shop as { phone?: string } | undefined)?.phone ?? "";
      const rows = items
        .filter((i) => i.weightGrams > 0)
        .map(
          (i, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${(i.description || "Gold item").replace(/</g, "&lt;")}</td>
              <td style="text-align:right">${i.weightGrams} g</td>
              <td>${PURITY_OPTIONS.find((p) => p.purity === i.purity)?.label ?? ""}</td>
              <td style="text-align:right">${fmt(i.makingCharges, currency)}</td>
              <td style="text-align:right"><strong>${fmt(i.weightGrams * goldRate * i.purity + i.makingCharges, currency)}</strong></td>
            </tr>`,
        )
        .join("");
      const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Quote ${quoteResult.id}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f2937;padding:32px;max-width:780px;margin:0 auto}
  h1{color:#b45309;margin:0 0 4px}
  .muted{color:#6b7280;font-size:12px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:24px 0}
  table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
  th,td{padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:left}
  th{background:#fef3c7;color:#92400e;font-weight:600;font-size:11px;text-transform:uppercase}
  .totals{margin-top:16px;float:right;width:280px}
  .totals .row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px}
  .totals .total{border-top:2px solid #b45309;color:#b45309;font-weight:700;font-size:16px;padding-top:8px;margin-top:8px}
  .terms{clear:both;margin-top:32px;padding:14px;background:#fef9c3;border-left:3px solid #eab308;font-size:12px;white-space:pre-wrap}
  .footer{margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#6b7280;text-align:center}
  @media print{button{display:none}}
</style></head>
<body>
  <button onclick="window.print()" style="position:fixed;top:16px;right:16px;padding:8px 16px;background:#b45309;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:600">Print / Save as PDF</button>
  <h1>${shopName.replace(/</g, "&lt;")}</h1>
  <div class="muted">${shopAddress} ${shopPhone ? "&middot; " + shopPhone : ""}</div>
  <div class="grid">
    <div>
      <div class="muted" style="text-transform:uppercase;font-size:10px;font-weight:600">Quote For</div>
      <div style="font-weight:600;margin-top:4px">${(customerName || "Walk-in Customer").replace(/</g, "&lt;")}</div>
      ${customerPhone ? `<div class="muted">${customerPhone}</div>` : ""}
    </div>
    <div style="text-align:right">
      <div class="muted" style="text-transform:uppercase;font-size:10px;font-weight:600">Quote #</div>
      <div style="font-weight:600;margin-top:4px">${quoteResult.id}</div>
      <div class="muted">Issued: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
      <div class="muted">Valid until: ${formattedValidUntil}</div>
      <div class="muted">Gold rate: ${fmt(goldRate, currency)}/g</div>
    </div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Item</th><th style="text-align:right">Weight</th><th>Purity</th><th style="text-align:right">Making</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${fmt(subtotal, currency)}</span></div>
    ${discount > 0 ? `<div class="row"><span>Discount (${discountPct}%)</span><span>-${fmt(discount, currency)}</span></div>` : ""}
    <div class="row"><span>Tax (3%)</span><span>${fmt(tax, currency)}</span></div>
    <div class="row total"><span>Total</span><span>${fmt(total, currency)}</span></div>
  </div>
  ${terms.trim() ? `<div class="terms"><strong>Terms &amp; Conditions</strong>\n${terms.replace(/</g, "&lt;")}</div>` : ""}
  ${notes.trim() ? `<div class="terms" style="background:#dbeafe;border-color:#3b82f6"><strong>Notes</strong>\n${notes.replace(/</g, "&lt;")}</div>` : ""}
  <div class="footer">Track this quote: ${trackUrl}</div>
  <script>setTimeout(function(){window.print();},400);</script>
</body></html>`;
      w.document.write(html);
      w.document.close();
    };

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
          onClick={exportPdf}
          className="w-full max-w-xs py-3 border border-amber-300 text-amber-700 text-sm font-semibold rounded-2xl flex items-center justify-center gap-2"
        >
          <FileDown className="h-4 w-4" />
          <T>Export as PDF</T>
        </button>
        <button
          onClick={() => {
            setQuoteResult(null);
            setItems([makeItem()]);
            setCustomerName("");
            setCustomerPhone("");
            setDiscountPct(0);
            setNotes("");
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
        <div className="relative">
          <input
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="Phone (for WhatsApp) — auto-fills existing customers"
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {lookingUpCustomer && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-amber-500" />
          )}
        </div>
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

      {/* Advanced options — discount, validity, T&C, notes (PC quote parity) */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-2xl border border-gray-100"
        >
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900">
              <T>Discount, validity & terms</T>
            </p>
            <p className="text-[11px] text-gray-400">
              {discountPct > 0
                ? `${discountPct}% off · `
                : ""}
              Valid {validityDays} days
              {terms.trim() ? " · T&C included" : ""}
            </p>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform ${
              showAdvanced ? "rotate-180" : ""
            }`}
          />
        </button>

        {showAdvanced && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-400 font-medium uppercase">
                  <T>Discount %</T>
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  step="0.5"
                  value={discountPct || ""}
                  onChange={(e) =>
                    setDiscountPct(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))
                  }
                  placeholder="0"
                  className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 font-medium uppercase">
                  <T>Valid for (days)</T>
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="365"
                  value={validityDays || ""}
                  onChange={(e) =>
                    setValidityDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 1)))
                  }
                  placeholder="7"
                  className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>
            <p className="text-[11px] text-gray-400 -mt-2">
              <T>Quote valid until</T> {formattedValidUntil}
            </p>
            <div>
              <label className="text-[10px] text-gray-400 font-medium uppercase">
                <T>Terms & Conditions</T>
              </label>
              <textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                rows={4}
                className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                placeholder="Bullet points; one per line"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-medium uppercase">
                <T>Customer notes</T>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                placeholder="Any special message for the customer"
              />
            </div>
          </div>
        )}
      </div>

      {/* Totals */}
      {subtotal > 0 && (
        <div data-tour="m-quote-total" className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500"><T>Subtotal</T></span>
            <span>{fmt(subtotal, currency)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500"><T>Discount</T> ({discountPct}%)</span>
              <span className="text-green-600">-{fmt(discount, currency)}</span>
            </div>
          )}
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
