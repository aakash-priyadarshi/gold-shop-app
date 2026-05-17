"use client";

import { MobileFeatureGate } from "@/components/mobile/MobileFeatureGate";
import { MobileHelpButton } from "@/components/mobile/MobileHelpButton";
import { BarcodeScannerSheet } from "@/components/mobile/BarcodeScannerSheet";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { loadHardwareConfig, printReceipt } from "@/lib/posHardware";
import { useHaptics } from "@/hooks/useHaptics";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { inventoryApi, posApi, shopQuotesApi } from "@/lib/api";
import { useT } from "@/providers/translation-provider";
import {
    Check,
    Loader2,
    MessageCircle,
    Minus,
    Plus,
    ScanLine,
    Search,
    Share2,
    Trash2,
    X,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

interface InventoryItem {
  id: string;
  nameEn: string;
  sku: string;
  images: string[];
  totalPriceNpr: number;
  stockQuantity: number;
  weightGrams?: number;
  metalPurity?: string;
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

function formatNPR(amount: number) {
  return `NPR ${amount.toLocaleString("en-IN")}`;
}

function CartDrawer({
  cart,
  onQtyChange,
  onRemove,
  onCheckout,
  onClose,
}: {
  cart: CartItem[];
  onQtyChange: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onCheckout: (
    method: string,
    customerName: string,
    customerPhone?: string,
    extras?: { taxRate?: number; makingPct?: number },
  ) => Promise<void> | void;
  onClose: () => void;
}) {
  const t = useT();
  const [method, setMethod] = useState("CASH");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [makingPct, setMakingPct] = useState(0); // making charge %

  // Auto-fill customer name when phone matches an existing customer.
  // Same pattern as the PC quote builder (shopQuotesApi.lookupCustomer).
  useEffect(() => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7) return;
    const handle = setTimeout(async () => {
      try {
        setLookingUp(true);
        const res = await shopQuotesApi.lookupCustomer({
          phoneCountryCode: "+977",
          phone: digits,
        });
        const found = res.data;
        if (found?.name && !name) setName(found.name);
      } catch {
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
  const tax = Math.round(total * 0.03); // 3% GST / VAT placeholder

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
              <p className="text-xs text-gray-500">{formatNPR(c.unitPrice)} <T>each</T></p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onQtyChange(c.item.id, c.qty - 1)}
                className="h-8 w-8 rounded-full border border-gray-200 flex items-center justify-center active:bg-gray-100"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-5 text-center text-sm font-semibold">
                {c.qty}
              </span>
              <button
                onClick={() => onQtyChange(c.item.id, c.qty + 1)}
                className="h-8 w-8 rounded-full border border-gray-200 flex items-center justify-center active:bg-gray-100"
              >
                <Plus className="h-3 w-3" />
              </button>
              <button
                onClick={() => onRemove(c.item.id)}
                className="h-8 w-8 rounded-full text-red-400 flex items-center justify-center active:bg-red-50 ml-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
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
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="mt-3 pt-3 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500"><T>Subtotal</T></span>
            <span>{formatNPR(subtotal)}</span>
          </div>
          {making > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500"><T>Making Charge</T> ({makingPct}%)</span>
              <span>{formatNPR(making)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500"><T>Tax (3%)</T></span>
            <span>{formatNPR(tax)}</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t pt-2">
            <span><T>Total</T></span>
            <span className="text-amber-700">{formatNPR(total + tax)}</span>
          </div>
        </div>

        {/* Customer name + phone (phone triggers auto-fill) */}
        <div className="pt-2 space-y-2">
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
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">
              <T>Customer Phone (optional — for WhatsApp bill)</T>
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
              placeholder={t("+977 98XXXXXXXX")}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        {/* Payment method */}
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-2">
            <T>Payment Method</T>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_METHODS.map((pm) => (
              <button
                key={pm.value}
                onClick={() => setMethod(pm.value)}
                className={`py-2 rounded-xl text-xs font-medium border transition-colors ${
                  method === pm.value
                    ? "bg-amber-500 border-amber-500 text-white"
                    : "border-gray-200 text-gray-600 bg-white"
                }`}
              >
                {pm.label}
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
              { taxRate: 3, makingPct },
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
          {t("Confirm Bill")} — {formatNPR(total + tax)}
        </button>
      </div>
    </div>
  );
}

function BillSuccess({
  quoteId,
  total,
  customerPhone,
  onNew,
}: {
  quoteId: string;
  total: number;
  customerPhone?: string;
  onNew: () => void;
}) {
  const trackUrl = `${typeof window !== "undefined" ? window.location.origin : "https://orivraa.com"}/track/${quoteId}`;
  const whatsappMsg = encodeURIComponent(
    `Thank you for your purchase at our store!\n\nBill Amount: NPR ${total.toLocaleString()}\nView/Download Bill: ${trackUrl}`,
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
          {formatNPR(total)} — <T>Payment recorded</T>
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

export default function MobilePOSPage() {
  const { user } = useAuth();
  const t = useT();
  const haptic = useHaptics();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [billResult, setBillResult] = useState<{
    quoteId: string;
    total: number;
    customerPhone?: string;
  } | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const shopId = user?.shop?.id;

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
  useBarcodeScanner(handleScannedCode, { ignoreEditable: true });  const updateQty = (itemId: string, qty: number) => {
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
    extras?: { taxRate?: number; makingPct?: number },
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
      const sessionRes = await posApi.createSession({});
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
        notes: `Payment: ${method}${extras?.makingPct ? ` • Making ${extras.makingPct}%` : ""}`,
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
      toast({ title: "Bill created", description: `${formatNPR(total)}` });

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
            <p className="text-[11px] text-gray-400">{cart.length > 0 ? `${cart.length} item${cart.length === 1 ? "" : "s"} in cart` : t("Tap items to add to bill")}</p>
          </div>
          <MobileHelpButton
            title="Quick Bill"
            description="The fastest way to create a jewelry bill on your phone — search, tap, weigh, share."
            tips={[
              "Search a product by name or SKU, then tap to add to cart",
              "Adjust weight, purity (24K/22K/18K) and making charge per item",
              "GST/VAT and gold rate are calculated automatically",
              "Tap the cart bar at the bottom to checkout and share invoice on WhatsApp",
            ]}
          />
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
            <button
              onClick={() => setScannerOpen(true)}
              aria-label="Scan barcode"
              className="flex items-center justify-center h-10 w-10 rounded-xl bg-amber-100 text-amber-700 active:bg-amber-200"
            >
              <ScanLine className="h-5 w-5" />
            </button>
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
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className={`relative flex flex-col rounded-2xl border overflow-hidden text-left active:scale-95 transition-transform ${
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
                    </div>

                    {/* Info */}
                    <div className="p-2.5">
                      <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-tight">
                        {item.nameEn}
                      </p>
                      <p className="text-xs text-amber-700 font-semibold mt-1">
                        {formatNPR(item.totalPriceNpr ?? 0)}
                      </p>
                      {item.metalPurity && (
                        <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                          {item.metalPurity}
                        </span>
                      )}
                    </div>
                  </button>
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
              <span>{formatNPR(cartTotal)}</span>
            </button>
          </div>
        )}
      </div>

      {showCart && (
        <CartDrawer
          cart={cart}
          onQtyChange={updateQty}
          onRemove={removeFromCart}
          onCheckout={handleCheckout}
          onClose={() => setShowCart(false)}
        />
      )}

      <BarcodeScannerSheet
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScannedCode}
        hint="Scan with the camera or type the SKU. A connected USB / Bluetooth scanner works anywhere on this screen."
      />
    </MobileFeatureGate>
  );
}
