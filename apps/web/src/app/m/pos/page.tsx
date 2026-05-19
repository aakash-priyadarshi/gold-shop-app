"use client";

import { MobileFeatureGate } from "@/components/mobile/MobileFeatureGate";

import { BarcodeScannerSheet } from "@/components/mobile/BarcodeScannerSheet";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import {
  formatCurrencyAmount,
  getCurrencyForCountry,
  type SupportedCurrencyCode,
} from "@/lib/currency";
import { loadHardwareConfig, printReceipt } from "@/lib/posHardware";
import { useHaptics } from "@/hooks/useHaptics";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { inventoryApi, posApi, shopQuotesApi } from "@/lib/api";
import { fetchTaxRules, lookupTaxRate } from "@/hooks/useTaxRules";
import { useT } from "@/providers/translation-provider";
import {
    Check,
    Loader2,
    MessageCircle,
    Minus,
    Package,
    Plus,
    ScanLine,
    Search,
    Share2,
    ShoppingCart,
    Trash2,
    X,
} from "lucide-react";
import Image from "next/image";
  import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

interface InventoryItem {
  id: string;
  nameEn: string;
  sku: string;
  images: string[];
  totalPriceNpr: number;
  stockQuantity: number;
  weightGrams?: number;
  totalWeightGrams?: number;
  metalPurity?: string;
  jewelleryType?: string;
  descriptionEn?: string;
  descriptionNe?: string;
}

interface CartItem {
  item: InventoryItem;
  qty: number;
  unitPrice: number;
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI / QR" },
  { value: "CARD", label: "Card" },
  { value: "ESEWA", label: "eSewa" },
  { value: "KHALTI", label: "Khalti" },
  { value: "BANK", label: "Bank Transfer" },
];

function formatMoney(amount: number, currency: SupportedCurrencyCode) {
  return formatCurrencyAmount(amount, currency);
}

const JEWELLERY_TYPES = [
  "RING", "NECKLACE", "PENDANT", "EARRING", "BRACELET",
  "BANGLE", "CHAIN", "ANKLET", "BROOCH", "NOSE_PIN",
  "MAANG_TIKKA", "OTHER",
];

const COUNTRY_PHONE_CODES: Record<string, string> = {
  NP: "+977",
  IN: "+91",
  AE: "+971",
  US: "+1",
  GB: "+44",
  AU: "+61",
  SG: "+65",
  CA: "+1",
};

function CartDrawer({
  cart,
  currency,
  shopCountry,
  onQtyChange,
  onRemove,
  onCheckout,
  onClose,
}: {
  cart: CartItem[];
  currency: SupportedCurrencyCode;
  shopCountry: string;
  onQtyChange: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onCheckout: (
    method: string,
    customerName: string,
    customerPhone?: string,
    extras?: { taxRate?: number; makingPct?: number; customerId?: string },
  ) => Promise<void> | void;
  onClose: () => void;
}) {
  const t = useT();
  const [method, setMethod] = useState("CASH");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [makingPct, setMakingPct] = useState(0); // making charge %
  const [taxRate, setTaxRate] = useState(0.13);
  const [taxLabel, setTaxLabel] = useState("VAT (13%)");

  // Load country-specific tax rate
  useEffect(() => {
    if (!shopCountry) return;
    fetchTaxRules(shopCountry).then((data) => {
      if (!data) return;
      const r = lookupTaxRate(data.rules, "ALL");
      setTaxRate(r.rate);
      setTaxLabel(`${r.name} (${Math.round(r.rate * 100)}%)`);
    }).catch(() => { /* keep defaults */ });
  }, [shopCountry]);

  const phoneCode = COUNTRY_PHONE_CODES[shopCountry] ?? "+977";

  // Auto-fill customer name when phone matches an existing customer.
  // Same pattern as the PC quote builder (shopQuotesApi.lookupCustomer).
  useEffect(() => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7) {
      setCustomerId(null);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        setLookingUp(true);
        const res = await shopQuotesApi.lookupCustomer({
          phoneCountryCode: phoneCode,
          phone: digits,
        });
        const result = res.data;
        const customer = result?.customer;
        if (result?.found && customer) {
          setCustomerId(customer.id ?? null);
          if (customer.name && !name) setName(customer.name);
        } else {
          setCustomerId(null);
        }
      } catch {
        setCustomerId(null);
        // no existing customer — ignore
      } finally {
        setLookingUp(false);
      }
    }, 450);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

  // Presets stored per-device so the shopkeeper doesn't re-type every bill
  const MAKING_PRESETS = [
    { label: "None", pct: 0 },
    { label: "8%", pct: 8 },
    { label: "12%", pct: 12 },
    { label: "14%", pct: 14 },
    { label: "18%", pct: 18 },
  ];

  const subtotal = cart.reduce((s, c) => s + c.unitPrice * c.qty, 0);
  const making = Math.round(subtotal * (makingPct / 100));
  const total = subtotal + making;
  const tax = Math.round(total * taxRate);

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-base font-semibold"><T>Bill Summary</T></h2>
        <button
          onClick={onClose}
          className="p-2 rounded-full text-gray-400 hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {cart.map((c) => (
          <div key={c.item.id} className="flex items-center gap-3">
            {c.item.images[0] ? (
              <Image
                src={c.item.images[0]}
                alt={c.item.nameEn}
                width={48}
                height={48}
                className="rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                <ScanLine className="h-5 w-5 text-amber-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {c.item.nameEn}
              </p>
              <p className="text-xs text-gray-500">{formatMoney(c.unitPrice, currency)} <T>each</T></p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onQtyChange(c.item.id, c.qty - 1)}
                className="h-10 w-10 rounded-full border border-gray-200 flex items-center justify-center active:bg-gray-100"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-6 text-center text-base font-semibold">
                {c.qty}
              </span>
              <button
                onClick={() => onQtyChange(c.item.id, c.qty + 1)}
                className="h-10 w-10 rounded-full border border-gray-200 flex items-center justify-center active:bg-gray-100"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={() => onRemove(c.item.id)}
                className="h-10 w-10 rounded-full text-red-500 bg-red-50 flex items-center justify-center active:bg-red-100 ml-2"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {/* Making Charge Presets */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500"><T>Making Charge</T></span>
            <span className="text-xs text-amber-700 font-semibold">{makingPct > 0 ? `${makingPct}%` : <T>None</T>}</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {MAKING_PRESETS.map((p) => (
              <button
                key={p.pct}
                onClick={() => setMakingPct(p.pct)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  makingPct === p.pct
                    ? "bg-amber-500 border-amber-500 text-white"
                    : "border-gray-200 text-gray-600 bg-white"
                }`}
              >
                <T>{p.label}</T>
              </button>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="mt-4 pt-4 border-t space-y-3">
          <div className="flex justify-between text-base">
            <span className="text-gray-500"><T>Subtotal</T></span>
            <span className="font-medium">{formatMoney(subtotal, currency)}</span>
          </div>
          {making > 0 && (
            <div className="flex justify-between text-base">
              <span className="text-gray-500"><T>Making Charge</T> ({makingPct}%)</span>
              <span className="font-medium">{formatMoney(making, currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-base">
            <span className="text-gray-500">{taxLabel}</span>
            <span className="font-medium">{formatMoney(tax, currency)}</span>
          </div>
          <div className="flex justify-between text-xl font-black border-t pt-3 pb-2">
            <span><T>Final Total</T></span>
            <span className="text-amber-700">{formatMoney(total + tax, currency)}</span>
          </div>
        </div>

        {/* Customer name + phone (phone triggers auto-fill) */}
        <div className="pt-2 space-y-2">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">
              <T>Customer Phone (optional — for lookup and WhatsApp bill)</T>
              {lookingUp && (
                <span className="ml-2 text-amber-500">
                  <Loader2 className="inline h-3 w-3 animate-spin" />
                </span>
              )}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={`${phoneCode} …`}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            {customerId && (
              <p className="mt-1 text-[11px] font-medium text-emerald-600">
                <T>Customer matched</T>
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">
              <T>Customer Name</T>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("Walk-in customer")}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        {/* Payment method */}
        <div className="pb-6">
          <label className="text-sm font-semibold text-gray-700 block mb-3">
            <T>Select Payment Method</T>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {PAYMENT_METHODS.map((pm) => (
              <button
                key={pm.value}
                onClick={() => setMethod(pm.value)}
                className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                  method === pm.value
                    ? "bg-amber-50 border-amber-500 text-amber-700 shadow-sm"
                    : "border-gray-100 text-gray-600 bg-white hover:border-gray-200"
                }`}
              >
                <T>{pm.label}</T>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Confirm button */}
      <div className="p-4 border-t bg-white">
        <button
          disabled={loading || cart.length === 0}
          onClick={async () => {
            setLoading(true);
            await onCheckout(
              method,
              name.trim() || "Walk-in Customer",
              phone || undefined,
              { taxRate: Math.round(taxRate * 100), makingPct, customerId: customerId || undefined },
            );
            setLoading(false);
          }}
          className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-base font-semibold rounded-2xl flex items-center justify-center gap-2 active:opacity-90 disabled:opacity-50 shadow-lg shadow-amber-500/25"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Check className="h-5 w-5" />
          )}
          {t("Confirm Bill")} — {formatMoney(total + tax, currency)}
        </button>
      </div>
    </div>
  );
}

function BillSuccess({
  quoteId,
  total,
  currency,
  customerPhone,
  onNew,
}: {
  quoteId: string;
  total: number;
  currency: SupportedCurrencyCode;
  customerPhone?: string;
  onNew: () => void;
}) {
  const trackUrl = `${typeof window !== "undefined" ? window.location.origin : "https://orivraa.com"}/track/${quoteId}`;
  const whatsappMsg = encodeURIComponent(
    `Thank you for your purchase at our store!\n\nBill Amount: ${formatMoney(total, currency)}\nView/Download Bill: ${trackUrl}`,
  );
  const whatsappUrl = customerPhone
    ? `https://wa.me/${customerPhone.replace(/\D/g, "")}?text=${whatsappMsg}`
    : `https://wa.me/?text=${whatsappMsg}`;

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-6">
      <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
        <Check className="h-10 w-10 text-green-600" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900"><T>Bill Created!</T></h2>
        <p className="text-sm text-gray-500 mt-1">
          {formatMoney(total, currency)} — <T>Payment recorded</T>
        </p>
      </div>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full max-w-xs py-4 bg-[#25D366] text-white text-base font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-lg"
      >
        <MessageCircle className="h-5 w-5" />
        <T>Send Bill via WhatsApp</T>
      </a>

      <a
        href={trackUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full max-w-xs py-4 border border-gray-200 text-gray-700 text-base font-medium rounded-2xl flex items-center justify-center gap-2"
      >
        <Share2 className="h-5 w-5" />
        <T>Copy Bill Link</T>
      </a>

      <button
        onClick={onNew}
        className="text-sm text-amber-600 font-medium underline underline-offset-2"
      >
        <T>New Bill</T>
      </button>
    </div>
  );
}

function ProductDetailSheet({
  item,
  currency,
  inCartQty,
  loading,
  onAdd,
  onQtyChange,
  onRemove,
  onClose,
}: {
  item: InventoryItem;
  currency: SupportedCurrencyCode;
  inCartQty: number;
  loading: boolean;
  onAdd: () => void;
  onQtyChange: (qty: number) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const image = item.images?.[0];
  const weight = item.totalWeightGrams ?? item.weightGrams;

  return (
    <div className="fixed inset-0 z-30 bg-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <div>
          <p className="text-xs text-gray-400"><T>Product details</T></p>
          <h2 className="text-base font-semibold text-gray-900 line-clamp-1">
            {item.nameEn}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full text-gray-400 hover:bg-gray-100"
          aria-label="Close product details"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="aspect-square w-full rounded-2xl bg-gray-100 relative overflow-hidden">
          {image ? (
            <Image
              src={image}
              alt={item.nameEn}
              fill
              className="object-cover"
              sizes="100vw"
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <ScanLine className="h-12 w-12 text-gray-300" />
            </div>
          )}
          {loading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{item.nameEn}</h3>
              <p className="text-xs text-gray-400">SKU {item.sku || item.id}</p>
            </div>
            <p className="text-base font-bold text-amber-700 whitespace-nowrap">
              {formatMoney(item.totalPriceNpr ?? 0, currency)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {item.jewelleryType && (
              <span className="px-2 py-1 rounded-full bg-gray-100 text-xs text-gray-600">
                {item.jewelleryType.replace(/_/g, " ")}
              </span>
            )}
            {item.metalPurity && (
              <span className="px-2 py-1 rounded-full bg-amber-100 text-xs text-amber-700">
                {item.metalPurity}
              </span>
            )}
            {weight ? (
              <span className="px-2 py-1 rounded-full bg-gray-100 text-xs text-gray-600">
                {weight}g
              </span>
            ) : null}
            <span className="px-2 py-1 rounded-full bg-gray-100 text-xs text-gray-600">
              {item.stockQuantity} in stock
            </span>
          </div>
        </div>

        {(item.descriptionEn || item.descriptionNe) && (
          <div className="rounded-2xl bg-gray-50 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">
              <T>Description</T>
            </p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {item.descriptionEn || item.descriptionNe}
            </p>
          </div>
        )}

        <Link
          href={`/shop/${item.id}`}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-700"
        >
          <Share2 className="h-4 w-4" />
          <T>Open full product page</T>
        </Link>
      </div>

      <div className="p-4 border-t bg-white space-y-2">
        {inCartQty > 0 ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onQtyChange(inCartQty - 1)}
              className="h-12 w-12 rounded-2xl border border-gray-200 flex items-center justify-center"
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </button>
            <div className="flex-1 h-12 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center text-sm font-bold">
              {inCartQty} <T>in bill</T>
            </div>
            <button
              onClick={() => onQtyChange(inCartQty + 1)}
              className="h-12 w-12 rounded-2xl border border-gray-200 flex items-center justify-center"
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={onRemove}
              className="h-12 w-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center"
              aria-label="Remove from bill"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onAdd}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-base font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25"
          >
            <ShoppingCart className="h-5 w-5" />
            <T>Add to Bill</T>
          </button>
        )}
      </div>
    </div>
  );
}

function AddProductSheet({
  shopId,
  onClose,
  onCreated,
}: {
  shopId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const t = useT();
  const [name, setName] = useState("");
  const [sku, setSku] = useState(`SKU-${Date.now().toString(36).toUpperCase()}`);
  const [jewelleryType, setJewelleryType] = useState("OTHER");
  const [metalType, setMetalType] = useState("GOLD");
  const [purity, setPurity] = useState("22K");
  const [weightGrams, setWeightGrams] = useState("");
  const [metalValue, setMetalValue] = useState("");
  const [makingCharge, setMakingCharge] = useState("");
  const [stockQty, setStockQty] = useState("1");
  const [saving, setSaving] = useState(false);
  const [skuScanOpen, setSkuScanOpen] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !weightGrams) {
      toast({ title: t("Fill in name and weight"), variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await inventoryApi.create(shopId, {
        nameEn: name.trim(),
        sku: sku.trim() || `SKU-${Date.now().toString(36).toUpperCase()}`,
        jewelleryType,
        buildMethod: "METHOD_B",
        composition: { baseAlloy: { metal: metalType, purity } },
        totalWeightGrams: parseFloat(weightGrams),
        metalValueNpr: parseFloat(metalValue) || 0,
        makingChargeNpr: parseFloat(makingCharge) || 0,
        gemstoneValueNpr: 0,
        stockQuantity: parseInt(stockQty) || 1,
        images: [],
      });
      toast({ title: t("Product added!") });
      onCreated();
      onClose();
    } catch (err: any) {
      toast({
        title: t("Failed to create product"),
        description: err?.response?.data?.message ?? t("Please try again"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-30 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <div>
          <p className="text-xs text-gray-400"><T>New inventory item</T></p>
          <h2 className="text-base font-semibold text-gray-900"><T>Add Product</T></h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full text-gray-400 hover:bg-gray-100"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* SKU with scan button */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
            <T>SKU / Barcode</T>
          </label>
          <div className="flex gap-2">
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              type="button"
              onClick={() => setSkuScanOpen(true)}
              className="h-11 w-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0"
              aria-label="Scan barcode"
            >
              <ScanLine className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
            <T>Product Name</T> *
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("e.g. Gold Necklace 22K")}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Jewellery type */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
            <T>Jewellery Type</T>
          </label>
          <div className="flex flex-wrap gap-2">
            {JEWELLERY_TYPES.map((jt) => (
              <button
                key={jt}
                type="button"
                onClick={() => setJewelleryType(jt)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  jewelleryType === jt
                    ? "bg-amber-500 border-amber-500 text-white"
                    : "border-gray-200 text-gray-600 bg-white"
                }`}
              >
                {jt.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Metal + Purity */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
              <T>Metal</T>
            </label>
            <select
              value={metalType}
              onChange={(e) => setMetalType(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {["GOLD", "SILVER", "PLATINUM", "PALLADIUM"].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
              <T>Purity</T>
            </label>
            <select
              value={purity}
              onChange={(e) => setPurity(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {["24K", "22K", "18K", "14K", "10K", "925", "999"].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Weight */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
            <T>Weight (g)</T> *
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={weightGrams}
            onChange={(e) => setWeightGrams(e.target.value)}
            placeholder={t("e.g. 12.50")}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Prices */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
              <T>Metal Value</T>
            </label>
            <input
              type="number"
              min="0"
              value={metalValue}
              onChange={(e) => setMetalValue(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
              <T>Making Charge</T>
            </label>
            <input
              type="number"
              min="0"
              value={makingCharge}
              onChange={(e) => setMakingCharge(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        {/* Stock */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
            <T>Stock Quantity</T>
          </label>
          <input
            type="number"
            min="1"
            value={stockQty}
            onChange={(e) => setStockQty(e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="p-4 border-t bg-white">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-base font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 disabled:opacity-50 active:opacity-90"
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Package className="h-5 w-5" />
          )}
          {saving ? <T>Adding…</T> : <T>Add to Inventory</T>}
        </button>
      </div>

      <BarcodeScannerSheet
        open={skuScanOpen}
        onClose={() => setSkuScanOpen(false)}
        onScan={(code) => { setSku(code); setSkuScanOpen(false); }}
        hint="Scan the product barcode/QR to auto-fill the SKU"
      />
    </div>
  );
}

export default function MobilePOSPage() {
  const { user } = useAuth();
  const t = useT();
  const haptic = useHaptics();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>(() => {
    // ── Offline cart restore: load from localStorage on mount ──
    if (typeof window === "undefined") return [];
    try {
      const userId = user?.id;
      if (!userId) return [];
      const saved = localStorage.getItem(`orivraa_cart_${userId}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [billResult, setBillResult] = useState<{
    quoteId: string;
    total: number;
    customerPhone?: string;
  } | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const shopId = user?.shop?.id;
  const shopCurrency: SupportedCurrencyCode =
    (user?.shop?.currency as SupportedCurrencyCode | undefined) ??
    getCurrencyForCountry(user?.shop?.country, "NPR");

  const loadInventory = useCallback(
    async (q?: string) => {
      if (!shopId) return;
      setLoading(true);
      try {
        const res = await inventoryApi.getShopInventory(shopId, {
          search: q ?? "",
          limit: 40,
          page: 1,
        });
        setItems(res.data?.items ?? res.data ?? []);
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    },
    [shopId],
  );

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // ── Persist cart to localStorage on every change (offline resilience) ──
  useEffect(() => {
    if (typeof window === "undefined" || !user?.id) return;
    try {
      localStorage.setItem(`orivraa_cart_${user.id}`, JSON.stringify(cart));
    } catch { /* quota exceeded — ignore */ }
  }, [cart, user?.id]);

  useEffect(() => {
    const t = setTimeout(() => loadInventory(search), 350);
    return () => clearTimeout(t);
  }, [search, loadInventory]);

  const addToCart = useCallback((item: InventoryItem) => {
    haptic("light");
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c,
        );
      }
      return [...prev, { item, qty: 1, unitPrice: item.totalPriceNpr ?? 0 }];
    });
  }, [haptic]);

  const openProductDetails = useCallback(async (item: InventoryItem) => {
    setSelectedItem(item);
    setDetailLoading(true);
    try {
      const res = await inventoryApi.getById(item.id);
      setSelectedItem({ ...item, ...(res.data ?? {}) });
    } catch {
      setSelectedItem(item);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleScannedCode = useCallback(
    async (code: string) => {
      if (!shopId) return;
      try {
        const res = await inventoryApi.lookupByCode(shopId, code);
        const found = res.data?.item ?? null;
        if (!found) {
          haptic("error");
          toast({
            title: "Not found",
            description: `No item with SKU "${code}" in this shop`,
            variant: "destructive",
          });
          return;
        }
        const cfg = loadHardwareConfig().scanner;
        if (cfg.autoAdd) {
          addToCart(found as InventoryItem);
          haptic("success");
          toast({
            title: "Added to cart",
            description: found.nameEn,
          });
        } else {
          setItems((prev) => {
            const exists = prev.some((p) => p.id === found.id);
            return exists ? prev : [found as InventoryItem, ...prev];
          });
          setSearch(found.sku ?? "");
        }
        setScannerOpen(false);
      } catch {
        haptic("error");
        toast({
          title: "Lookup failed",
          description: "Could not reach the server",
          variant: "destructive",
        });
      }
    },
    [shopId, haptic, addToCart],
  );

  // Global keyboard-wedge scanner – fires anywhere on the POS page when an
  // attached HID scanner sends a burst of keystrokes ending in Enter.
  useBarcodeScanner(handleScannedCode, { ignoreEditable: true });

  const updateQty = (itemId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((c) => c.item.id !== itemId));
    } else {
      setCart((prev) =>
        prev.map((c) => (c.item.id === itemId ? { ...c, qty } : c)),
      );
    }
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((c) => c.item.id !== itemId));
  };

  const cartTotal = cart.reduce((s, c) => s + c.unitPrice * c.qty, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  const handleCheckout = async (
    method: string,
    customerName: string,
    customerPhone?: string,
    extras?: { taxRate?: number; makingPct?: number; customerId?: string },
  ) => {
    if (!cart.length) return;
    try {
      // The desktop billing flow is a 3-step process exposed by posApi:
      //   1. POST /pos/session             → create a draft session
      //   2. POST /pos/session/:id/items   → attach inventory line items
      //   3. POST /pos/session/:id/checkout → finalise + create invoice
      // The earlier implementation tried to POST to shopQuotesApi.create which
      // does NOT accept an `items` field, so class-validator rejected the body
      // with "property item should not exist". Mirroring the PC flow fixes it.
      const sessionRes = await posApi.createSession({
        customerId: extras?.customerId,
      });
      const sessionId =
        sessionRes.data?.id ?? sessionRes.data?.sessionId;
      if (!sessionId) throw new Error("Could not start POS session");

      await posApi.addItems(
        sessionId,
        cart.map((c) => ({
          inventoryItemId: c.item.id,
          qty: c.qty,
        })),
      );

      const taxRate = extras?.taxRate ?? 3;
      const checkoutRes = await posApi.checkout(sessionId, {
        customerName,
        customerPhone: customerPhone || undefined,
        taxRate,
        paymentMethod: method,
        makingChargeRate: extras?.makingPct || undefined,
        notes: undefined,
      });

      const data = checkoutRes.data ?? {};
      const billId =
        data.invoiceId ?? data.orderId ?? data.id ?? data.sessionId;
      const total =
        data.totalAmount ??
        data.total ??
        cartTotal + Math.round(cartTotal * (taxRate / 100));

      setShowCart(false);
      setBillResult({ quoteId: billId, total, customerPhone });
      setCart([]);
      haptic("success");
      toast({ title: "Bill created", description: `${formatMoney(total, shopCurrency)}` });

      // Auto-print receipt if a printer is configured
      const hw = loadHardwareConfig();
      if (hw.printer.enabled && hw.printer.autoPrint) {
        try {
          await printReceipt(
            {
              shopName: user?.shop?.shopName,
              shopPhone: user?.shop?.contactPhone,
              invoiceNumber: String(billId ?? "-"),
              issuedAt: new Date(),
              customerName,
              customerPhone,
              currency: user?.shop?.currency ?? "NPR",
              lines: cart.map((c) => ({
                label: c.item.nameEn,
                qty: c.qty,
                amount: c.unitPrice * c.qty,
              })),
              subtotal: cartTotal,
              taxAmount: Math.round(cartTotal * (taxRate / 100)),
              taxLabel: `Tax ${taxRate}%`,
              total,
              paid: total,
              balance: 0,
            },
            { kickDrawer: hw.printer.kickCashDrawer && method === "CASH" },
          );
        } catch (e: any) {
          toast({
            title: "Bill created – print failed",
            description: e?.message ?? "Check printer connection",
            variant: "destructive",
          });
        }
      }
    } catch (err: any) {
      haptic("error");
      toast({
        title: "Failed to create bill",
        description: err?.response?.data?.message ?? "Please try again",
        variant: "destructive",
      });
    }
  };

  if (billResult) {
    return (
      <BillSuccess
        quoteId={billResult.quoteId}
        total={billResult.total}
        currency={shopCurrency}
        customerPhone={billResult.customerPhone}
        onNew={() => setBillResult(null)}
      />
    );
  }

  return (
    <MobileFeatureGate feature="mobilePOS" featureName="Mobile POS">
      <div className="flex flex-col h-full">
        {/* Page header with help */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1 bg-white">
          <div>
            <h1 className="text-base font-bold text-gray-900"><T>Quick Bill</T></h1>
            <p className="text-[11px] text-gray-400">{cart.length > 0 ? `${cart.length} item${cart.length === 1 ? "" : "s"} in cart` : t("Tap products to view, use cart buttons to add")}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setScannerOpen(true)}
              className="h-9 px-3 rounded-xl bg-amber-100 text-amber-700 text-xs font-semibold flex items-center gap-1.5 active:bg-amber-200"
            >
              <ScanLine className="h-4 w-4" />
              <T>Scan</T>
            </button>
            <button
              onClick={() => setAddProductOpen(true)}
              className="h-9 px-3 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold flex items-center gap-1.5 active:bg-gray-200"
              aria-label="Add product"
            >
              <Package className="h-4 w-4" />
              <T>Add</T>
            </button>
          </div>
        </div>
        {/* Search bar */}
        <div data-tour="m-pos-search" className="px-4 pt-1 pb-2 bg-white border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Search products by name or SKU…")}
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>
        </div>

        {/* Product grid */}
        <div data-tour="m-pos-grid" className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
              <ScanLine className="h-8 w-8" />
              <p className="text-sm"><T>No products found</T></p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {items.map((item) => {
                const inCart = cart.find((c) => c.item.id === item.id);
                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openProductDetails(item)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") openProductDetails(item);
                    }}
                    className={`relative flex flex-col rounded-2xl border overflow-hidden text-left active:scale-95 transition-transform cursor-pointer ${
                      inCart
                        ? "border-amber-400 bg-amber-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    {/* Product image */}
                    <div className="aspect-square w-full bg-gray-100 relative">
                      {item.images[0] ? (
                        <Image
                          src={item.images[0]}
                          alt={item.nameEn}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw"
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <ScanLine className="h-8 w-8 text-gray-300" />
                        </div>
                      )}
                      {inCart && (
                        <span className="absolute top-2 right-2 h-6 w-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center shadow">
                          {inCart.qty}
                        </span>
                      )}
                      <span className="absolute bottom-2 left-2 rounded-full bg-black/55 text-white text-[10px] font-medium px-2 py-1">
                        <T>View details</T>
                      </span>
                    </div>

                    {/* Info */}
                    <div className="p-2.5">
                      <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-tight">
                        {item.nameEn}
                      </p>
                      <p className="text-xs text-amber-700 font-semibold mt-1">
                        {formatMoney(item.totalPriceNpr ?? 0, shopCurrency)}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-1.5">
                        {item.metalPurity ? (
                          <span className="text-[11px] px-2 py-1 bg-amber-100 text-amber-800 rounded-full font-bold truncate">
                            {item.metalPurity}
                          </span>
                        ) : (
                          <span />
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(item);
                          }}
                          className="h-10 w-10 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md active:bg-amber-600 transition-colors"
                          aria-label={`Add ${item.nameEn} to bill`}
                        >
                          <Plus className="h-5 w-5" />
                        </button>
                      </div>
                      {inCart && (
                        <div className="mt-3 flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200 p-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateQty(item.id, inCart.qty - 1);
                            }}
                            className="h-8 w-8 rounded-lg flex items-center justify-center bg-white text-gray-700 shadow-sm active:bg-gray-100"
                            aria-label={`Decrease ${item.nameEn}`}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="text-sm font-black text-amber-800">{inCart.qty}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromCart(item.id);
                            }}
                            className="h-8 w-8 rounded-lg flex items-center justify-center bg-red-100 text-red-600 shadow-sm active:bg-red-200"
                            aria-label={`Remove ${item.nameEn}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart FAB */}
        {cartCount > 0 && (
          <div className="px-4 pb-3 pt-2 bg-white border-t border-gray-100">
            <button
              data-tour="m-pos-bill-btn"
              onClick={() => setShowCart(true)}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-base font-semibold rounded-2xl flex items-center justify-between px-5 shadow-lg shadow-amber-500/25"
            >
              <span className="h-6 w-6 rounded-full bg-white/25 text-sm font-bold flex items-center justify-center">
                {cartCount}
              </span>
              <span><T>View Bill</T></span>
              <span>{formatMoney(cartTotal, shopCurrency)}</span>
            </button>
          </div>
        )}
      </div>

      {showCart && (
        <CartDrawer
          cart={cart}
          currency={shopCurrency}
          shopCountry={user?.shop?.country ?? "NP"}
          onQtyChange={updateQty}
          onRemove={removeFromCart}
          onCheckout={handleCheckout}
          onClose={() => setShowCart(false)}
        />
      )}

      {selectedItem && (
        <ProductDetailSheet
          item={selectedItem}
          currency={shopCurrency}
          inCartQty={cart.find((c) => c.item.id === selectedItem.id)?.qty ?? 0}
          loading={detailLoading}
          onAdd={() => addToCart(selectedItem)}
          onQtyChange={(qty) => updateQty(selectedItem.id, qty)}
          onRemove={() => removeFromCart(selectedItem.id)}
          onClose={() => setSelectedItem(null)}
        />
      )}

      <BarcodeScannerSheet
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScannedCode}
        hint="Scan with the camera or type the SKU. A connected USB / Bluetooth scanner works anywhere on this screen."
      />

      {addProductOpen && shopId && (
        <AddProductSheet
          shopId={shopId}
          onClose={() => setAddProductOpen(false)}
          onCreated={loadInventory}
        />
      )}
    </MobileFeatureGate>
  );
}
