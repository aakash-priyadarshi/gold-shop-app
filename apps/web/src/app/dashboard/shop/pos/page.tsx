"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { BarcodeScannerSheet } from "@/components/mobile/BarcodeScannerSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { T } from "@/components/ui/T";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import { inventoryApi, invoicesApi, posApi, shopsApi } from "@/lib/api";
import { ManagerPinDialog } from "@/components/shop/ManagerPinDialog";
import { printBill, type BillSettings } from "@/lib/billPrint";
import { unwrapInvoiceSettingsResponse } from "@/lib/invoiceBranding";
import {
  getCounterPaymentMethods,
  buildQrImageUrl,
  buildUpiPayUri,
  formatBankAccountDetails,
  formatPaymentSummary,
  hasBankTransferDetails,
  isDigitalWalletMethod,
  isUpiAmountAllowed,
  UPI_MAX_AMOUNT_INR,
  type CounterPaymentMethod,
  type ShopBankAccountDetails,
} from "@/lib/counterPayments";
import { loadTradeInPayload } from "@/lib/oldGoldTradeIn";
import { normalizeScanCode } from "@/lib/scan-code";
import { usePreferencesStore } from "@/store/preferences";
import Image from "next/image";
import { useT } from "@/providers/translation-provider";
import {
    Heart,
    Loader2,
    Maximize2,
    Minus,
    Package,
    Plus,
    ScanLine,
    Search,
    ShoppingCart,
    Split,
    Trash2,
    X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

interface PosSessionItem {
  id: string;
  inventoryItemId: string;
  variantId?: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  inventoryItem: {
    id: string;
    nameEn: string;
    sku: string;
    images: string[];
    totalPriceNpr?: number;
    stockQuantity?: number;
  };
  variant?: {
    id: string;
    sizeLabel: string;
    sku: string;
    stock?: number;
    priceOverride?: number;
  } | null;
}

interface PosSession {
  id: string;
  shopId: string;
  customerId?: string;
  conversationId?: string;
  status: string;
  expiresAt: string;
  items: PosSessionItem[];
}

interface WishlistItem {
  id: string;
  inventoryItemId: string;
  inventoryItem: {
    id: string;
    nameEn: string;
    sku: string;
    images: string[];
    totalPriceNpr: number;
    stockQuantity: number;
    variants: Array<{
      id: string;
      sizeLabel: string;
      stock: number;
      priceOverride?: number;
      isActive: boolean;
    }>;
  };
}

export default function PosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <PosPageInner />
    </Suspense>
  );
}

function PosPageInner() {
  const { user } = useAuth();
  const { symbol: currencySymbol } = useShopCurrency();
  const searchParams = useSearchParams();
  const t = useT();

  // URL params from chat integration
  const urlCustomerId = searchParams.get("customerId");
  const urlConversationId = searchParams.get("conversationId");

  const [session, setSession] = useState<PosSession | null>(null);
  const [customerPicks, setCustomerPicks] = useState<WishlistItem[]>([]);
  const [customerId, setCustomerId] = useState(urlCustomerId || "");
  const [loading, setLoading] = useState(false);
  const [picksLoading, setPicksLoading] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // ── Counter Mode ──
  const dashboardMode = usePreferencesStore((s) => s.dashboardMode);
  const isCounterMode = dashboardMode === "EASY";
  
  const [counterSearch, setCounterSearch] = useState("");
  const [counterItems, setCounterItems] = useState<any[]>([]);
  const [counterLoading, setCounterLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Checkout form
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [pinOpen, setPinOpen] = useState(false);
  const [discountThreshold, setDiscountThreshold] = useState(0);
  const [hasManagerPin, setHasManagerPin] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [makingChargeRate, setMakingChargeRate] = useState(0);
  const [checkoutSuccess, setCheckoutSuccess] = useState<{
    invoiceNumber: string;
    total: number;
    paymentMethod?: string;
    paymentSummary?: string;
    customerName?: string;
    customerPhone?: string;
    verificationToken?: string;
    usedBankTransfer?: boolean;
  } | null>(null);
  const [billSettings, setBillSettings] = useState<BillSettings | null>(null);
  const [shopUpiId, setShopUpiId] = useState("");
  const [shopBankDetails, setShopBankDetails] =
    useState<ShopBankAccountDetails | null>(null);
  const [splitMode, setSplitMode] = useState(false);
  const [splitLegs, setSplitLegs] = useState<
    Array<{ id: string; method: CounterPaymentMethod; amount: string }>
  >([]);

  const shopCountry = user?.shop?.country || "NP";
  const PAYMENT_METHODS = getCounterPaymentMethods(shopCountry);
  const TAX_PRESETS = shopCountry === "IN"
    ? [{ label: "GST 3%", value: 0.03 }, { label: "GST 5%", value: 0.05 }, { label: "Exempt", value: 0 }]
    : shopCountry === "NP"
      ? [{ label: "VAT 13%", value: 0.13 }, { label: "Exempt", value: 0 }]
      : [{ label: "VAT 5%", value: 0.05 }, { label: "Exempt", value: 0 }];
  const MAKING_PRESETS = [0, 8, 12, 14, 18];

  // Load active session on mount
  const loadActiveSession = useCallback(async () => {
    try {
      const res = await posApi.getActiveSession();
      if (res.data) {
        setSession(res.data);
      }
    } catch {
      // No active session - that's ok
    }
  }, []);

  useEffect(() => {
    loadActiveSession();
  }, [loadActiveSession]);

  useEffect(() => {
    invoicesApi
      .getSettings()
      .then((res) =>
        setBillSettings(unwrapInvoiceSettingsResponse(res.data)),
      )
      .catch(() => setBillSettings(null));
    shopsApi
      .getSettings()
      .then((res) => {
        const shop = res.data?.shop || res.data;
        const bank = (shop?.bankAccountDetails ||
          null) as ShopBankAccountDetails | null;
        setShopBankDetails(bank);
        const upi = bank?.upiId || "";
        setShopUpiId(typeof upi === "string" ? upi : "");
      })
      .catch(() => {
        setShopUpiId("");
        setShopBankDetails(null);
      });
  }, []);

  const bankDetailLines = useMemo(
    () => formatBankAccountDetails(shopBankDetails),
    [shopBankDetails],
  );

  useEffect(() => {
    const fromQuery = searchParams.get("tradeInCredit");
    let credit = fromQuery ? Number(fromQuery) : NaN;
    const payload = loadTradeInPayload();
    if (payload?.finalCredit && (!Number.isFinite(credit) || credit <= 0)) {
      credit = payload.finalCredit;
    }
    if (Number.isFinite(credit) && credit > 0) {
      setDiscountAmount(Math.round(credit));
    }
  }, [searchParams]);

  // Auto-create session if coming from chat with customer
  useEffect(() => {
    if (urlCustomerId && urlConversationId && !session) {
      handleCreateSession(urlCustomerId, urlConversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlCustomerId, urlConversationId]);

  // ── Counter Mode: debounced product search ──
  useEffect(() => {
    const shopId = user?.shop?.id;
    if (!isCounterMode || !shopId) return;
    const timer = setTimeout(async () => {
      setCounterLoading(true);
      try {
        const res = await inventoryApi.getShopInventory(shopId, {
          search: counterSearch,
          limit: 30,
          page: 1,
          inStock: true,
          excludeSetComponents: true,
        });
        setCounterItems(res.data?.items ?? res.data ?? []);
      } catch { setCounterItems([]); }
      finally { setCounterLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [counterSearch, isCounterMode, user?.shop?.id]);

  // ─── Create Session ───

  const handleCreateSession = async (cId?: string, convId?: string) => {
    setLoading(true);
    try {
      const res = await posApi.createSession({
        customerId: cId || customerId || undefined,
        conversationId: convId || urlConversationId || undefined,
      });
      setSession(res.data);
      toast({ title: t("POS session started (30 min)") });

      // Auto-load picks if we have a customer
      if (cId || customerId) {
        await loadCustomerPicks(cId || customerId);
      }
    } catch (err: any) {
      toast({
        title: t("Failed to create session"),
        description: err?.response?.data?.message || t("Unknown error"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ─── Load Customer Picks ───

  const loadCustomerPicks = async (cId?: string) => {
    const id = cId || customerId;
    if (!id) return;
    setPicksLoading(true);
    try {
      const res = await posApi.getCustomerPicks(id);
      setCustomerPicks(res.data);
    } catch (err: any) {
      toast({
        title: t("Cannot load picks"),
        description:
          err?.response?.data?.message || t("No relationship with customer"),
        variant: "destructive",
      });
      setCustomerPicks([]);
    } finally {
      setPicksLoading(false);
    }
  };

  // ─── Add Item to Basket ───

  const handleAddItem = useCallback(async (
    inventoryItemId: string,
    variantId?: string,
    qty = 1,
  ) => {
    if (!session) return;
    try {
      const res = await posApi.addItems(session.id, [
        { inventoryItemId, variantId, qty },
      ]);
      setSession(res.data);
      toast({ title: t("Item added to basket") });
    } catch (err: any) {
      toast({
        title: t("Failed to add item"),
        description: err?.response?.data?.message || t("Insufficient stock?"),
        variant: "destructive",
      });
    }
  }, [session, t]);

  const handleScannedCode = useCallback(
    async (raw: string) => {
      const shopId = user?.shop?.id;
      const code = normalizeScanCode(raw);
      if (!shopId || !code) return;
      if (!session) {
        toast({
          title: t("Start a POS session first"),
          description: t("Then scan a barcode, QR, or RFID tag to add it to the cart."),
        });
        return;
      }
      try {
        const res = await inventoryApi.lookupByCode(shopId, code);
        const found = res.data?.item ?? null;
        if (!found?.id) {
          toast({
            title: t("Not found"),
            description: t("No matching SKU, RFID, or QR in this shop."),
            variant: "destructive",
          });
          return;
        }
        await handleAddItem(found.id, res.data?.variant?.id);
        setCounterSearch("");
        setScannerOpen(false);
      } catch (err: any) {
        toast({
          title: t("Lookup failed"),
          description: err?.response?.data?.message || t("Could not look up that code"),
          variant: "destructive",
        });
      }
    },
    [handleAddItem, session, t, user?.shop?.id],
  );

  useBarcodeScanner(handleScannedCode, { enabled: !!session });

  // ─── Update Item Qty ───

  const handleUpdateQty = async (itemId: string, newQty: number) => {
    if (!session) return;
    try {
      await posApi.updateItem(session.id, itemId, newQty);
      // Refresh session
      const res = await posApi.getSession(session.id);
      setSession(res.data);
    } catch (err: any) {
      toast({
        title: t("Failed to update"),
        description: err?.response?.data?.message || t("Unknown error"),
        variant: "destructive",
      });
    }
  };

  // ─── Checkout ───

  const runCheckout = async () => {
    if (!session) return;

    let paymentSplits:
      | Array<{ method: string; amount: number }>
      | undefined;
    let paymentSummary: string | undefined;
    let usedBankTransfer = paymentMethod === "BANK_TRANSFER";

    if (splitMode) {
      const legs = splitLegs
        .map((leg) => ({
          method: leg.method,
          amount: parseFloat(leg.amount),
        }))
        .filter((leg) => Number.isFinite(leg.amount) && leg.amount > 0);
      if (legs.length < 2) {
        toast({
          variant: "destructive",
          title: t("Need at least two payment parts"),
        });
        return;
      }
      const sum = legs.reduce((s, l) => s + l.amount, 0);
      if (Math.abs(sum - basketTotal) > 0.05) {
        toast({
          variant: "destructive",
          title: t("Split total must equal basket total"),
        });
        return;
      }
      for (const leg of legs) {
        if (!isUpiAmountAllowed(leg.amount, leg.method)) {
          toast({
            variant: "destructive",
            title: t("UPI amount too high"),
            description: t(
              `UPI / PhonePe cannot exceed ₹${UPI_MAX_AMOUNT_INR.toLocaleString()} per part.`,
            ),
          });
          return;
        }
      }
      paymentSplits = legs;
      paymentSummary = formatPaymentSummary(legs, currencySymbol);
      usedBankTransfer = legs.some((l) => l.method === "BANK_TRANSFER");
    } else if (!isUpiAmountAllowed(basketTotal, paymentMethod)) {
      toast({
        variant: "destructive",
        title: t("UPI amount too high"),
        description: t(
          `UPI / PhonePe cannot exceed ₹${UPI_MAX_AMOUNT_INR.toLocaleString()}. Use bank transfer, card, or split payment.`,
        ),
      });
      return;
    }

    setCheckoutLoading(true);
    try {
      const res = await posApi.checkout(session.id, {
        customerName,
        customerPhone: customerPhone || undefined,
        customerEmail: customerEmail || undefined,
        notes: notes || undefined,
        taxRate,
        discountAmount,
        paymentMethod: splitMode
          ? "SPLIT"
          : paymentMethod,
        paymentSplits,
        makingChargeRate: makingChargeRate || undefined,
        invoiceCountry: shopCountry || undefined,
      });
      const inv = res.data?.invoice;
      setSession(null);
      setCheckoutOpen(false);
      setCustomerPicks([]);
      setSplitMode(false);
      setCheckoutSuccess({
        invoiceNumber: inv?.invoiceNumber || "N/A",
        total: inv?.totalAmount || basketTotal,
        paymentMethod: splitMode ? "SPLIT" : paymentMethod,
        paymentSummary,
        customerName,
        customerPhone,
        verificationToken: inv?.verificationToken,
        usedBankTransfer,
      });
      toast({
        title: t("Checkout complete!"),
        description: t("Invoice") + ` ${inv?.invoiceNumber} ` + t("created"),
      });
    } catch (err: any) {
      toast({
        title: t("Checkout failed"),
        description: err?.response?.data?.message || t("Unknown error"),
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!session) return;
    try {
      const res = await shopsApi.getManagerPinStatus();
      const data = res.data?.data ?? res.data;
      const threshold = Number(data?.discountThreshold ?? 0);
      setDiscountThreshold(threshold);
      setHasManagerPin(!!data?.hasPin);
      if (
        data?.hasPin &&
        discountAmount > 0 &&
        discountAmount >= threshold
      ) {
        setPinOpen(true);
        return;
      }
    } catch {
      // If PIN status fails, proceed (don't block sales offline)
    }
    await runCheckout();
  };

  // ─── Cancel Session ───

  const handleCancelSession = async () => {
    if (!session) return;
    try {
      await posApi.cancelSession(session.id);
      setSession(null);
      setCustomerPicks([]);
      toast({ title: t("POS session cancelled, stock released") });
    } catch (err: any) {
      toast({
        title: t("Failed to cancel"),
        description: err?.response?.data?.message || t("Unknown error"),
        variant: "destructive",
      });
    }
  };

  // ─── Compute Basket Totals ───

  const basketSubtotal =
    session?.items?.reduce((sum, i) => sum + i.lineTotal, 0) || 0;
  const basketMaking = makingChargeRate > 0 ? Math.round(basketSubtotal * (makingChargeRate / 100)) : 0;
  const basketTax = (basketSubtotal + basketMaking) * (taxRate || 0);
  const basketTotal = basketSubtotal + basketMaking + basketTax - (discountAmount || 0);

  const upiOverLimit =
    !splitMode &&
    isDigitalWalletMethod(paymentMethod) &&
    basketTotal > UPI_MAX_AMOUNT_INR;

  const initSplitLegs = useCallback(
    (total: number) => {
      const defaultMethod = (PAYMENT_METHODS[0]?.value ||
        "CASH") as CounterPaymentMethod;
      const half = Math.round((total / 2) * 100) / 100;
      const rest = Math.round((total - half) * 100) / 100;
      setSplitLegs([
        {
          id: crypto.randomUUID(),
          method: defaultMethod,
          amount: String(half),
        },
        {
          id: crypto.randomUUID(),
          method:
            (PAYMENT_METHODS.find((m) => m.value === "CARD")
              ?.value as CounterPaymentMethod) || defaultMethod,
          amount: String(rest),
        },
      ]);
    },
    [PAYMENT_METHODS],
  );

  // ─── Time remaining ───

  const expiresAt = session?.expiresAt ? new Date(session.expiresAt) : null;
  const minsRemaining = expiresAt
    ? Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 60000))
    : 0;

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <ScanLine className="h-6 w-6" /> <T>POS Terminal</T>
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                <T>{isCounterMode ? "Fast counter checkout mode" : "Advanced ERP mode with stock locking"}</T>
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Mode Toggle removed: now lives globally in DashboardLayout header */}
            </div>
            {session && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setScannerOpen(true)}
                >
                  <ScanLine className="h-4 w-4 mr-1" /> <T>Scan</T>
                </Button>
                <Badge
                  variant={minsRemaining > 5 ? "default" : "destructive"}
                  className="text-sm"
                >
                  {minsRemaining} <T>min remaining</T>
                </Badge>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleCancelSession}
                >
                  <X className="h-4 w-4 mr-1" /> <T>Cancel Session</T>
                </Button>
              </div>
            )}
          </div>

          {/* No Session → Start */}
          {!session && (
            <Card>
              <CardHeader>
                <CardTitle><T>Start a POS Session</T></CardTitle>
                <CardDescription>
                  <T>Create a new POS session. Optionally enter a customer ID to load their liked items. Sessions last 30 minutes.</T>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Label htmlFor="customerId"><T>Customer ID (optional)</T></Label>
                    <Input
                      id="customerId"
                      placeholder={t("Paste customer user ID...")}
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={() => handleCreateSession()}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <ShoppingCart className="h-4 w-4 mr-1" />
                    )}
                    <T>Start Session</T>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══ Counter Mode Layout ═══ */}
          {isCounterMode && session && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left 2/3: Product Catalogue Grid */}
              <div className="lg:col-span-2 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9 h-11 text-base"
                    placeholder={t("Search or scan SKU, RFID, QR...")}
                    value={counterSearch}
                    data-pos-scan="true"
                    onChange={(e) => setCounterSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      const code = counterSearch.trim();
                      if (!code) return;
                      e.preventDefault();
                      void handleScannedCode(code);
                    }}
                    autoFocus
                  />
                </div>
                {counterLoading && <div className="text-center py-6 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[65vh] overflow-y-auto pr-1">
                  {counterItems.map((item: any) => (
                    <div
                      key={item.id}
                      className="group relative border rounded-xl p-3 text-left hover:border-primary hover:shadow-md transition-all bg-card"
                    >
                      <Link
                        href={`/dashboard/shop/products/${item.id}`}
                        target="_blank"
                        className="absolute top-2 left-2 z-10 rounded-full bg-white/90 dark:bg-gray-900/90 p-1.5 text-amber-800 shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title={t("Show full details to customer")}
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleAddItem(item.id)}
                        className="w-full text-left"
                      >
                      <div className="relative aspect-square rounded-lg overflow-hidden bg-muted mb-2">
                        {item.images?.[0] ? (
                          <Image
                            src={item.images[0]}
                            alt=""
                            className="object-cover group-hover:scale-105 transition-transform"
                            fill
                            sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Package className="h-8 w-8 text-muted-foreground/40" /></div>
                        )}
                      </div>
                      <p className="text-sm font-medium truncate">{item.nameEn}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.sku}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-sm font-bold">{currencySymbol} {item.totalPriceNpr?.toLocaleString()}</span>
                        {item.metalPurity && <Badge variant="outline" className="text-[10px] px-1.5">{item.metalPurity}</Badge>}
                      </div>
                      {item.stockQuantity !== undefined && (
                        <p className={`text-[10px] mt-1 ${item.stockQuantity <= 2 ? "text-red-500" : "text-muted-foreground"}`}>
                          {item.stockQuantity} in stock
                        </p>
                      )}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-primary text-primary-foreground rounded-full p-1"><Plus className="h-3 w-3" /></div>
                      </div>
                      </button>
                    </div>
                  ))}
                  {!counterLoading && counterItems.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                      <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm"><T>No products found</T></p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right 1/3: Cart Sidebar */}
              <div className="lg:col-span-1">
                <Card className="sticky top-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" /> <T>Cart</T>
                      {session.items?.length > 0 && <Badge variant="secondary">{session.items.length}</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(!session.items || session.items.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-4"><T>Tap products to add</T></p>
                    )}
                    <div className="max-h-[30vh] overflow-y-auto space-y-2">
                      {session.items?.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{item.inventoryItem?.nameEn}</p>
                            <p className="text-xs text-muted-foreground">{currencySymbol} {item.unitPrice?.toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleUpdateQty(item.id, Math.max(0, item.qty - 1))}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center text-sm font-medium">{item.qty}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleUpdateQty(item.id, item.qty + 1)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="text-xs font-bold w-16 text-right">{currencySymbol} {item.lineTotal?.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>

                    {session.items?.length > 0 && (
                      <>
                        {/* Making Charge Presets */}
                        <div>
                          <Label className="text-xs"><T>Making Charges</T></Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {MAKING_PRESETS.map((pct) => (
                              <button
                                key={pct}
                                onClick={() => setMakingChargeRate(pct)}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${makingChargeRate === pct ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-transparent hover:border-primary/50"}`}
                              >
                                {pct}%
                              </button>
                            ))}
                          </div>
                        </div>
                        {/* Tax Presets */}
                        <div>
                          <Label className="text-xs"><T>Tax</T></Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {TAX_PRESETS.map((tp) => (
                              <button
                                key={tp.label}
                                onClick={() => setTaxRate(tp.value)}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${taxRate === tp.value ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-transparent hover:border-primary/50"}`}
                              >
                                {tp.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {/* Totals */}
                        <div className="border-t pt-2 space-y-1 text-sm">
                          <div className="flex justify-between"><span className="text-muted-foreground"><T>Subtotal</T></span><span>{currencySymbol} {basketSubtotal.toLocaleString()}</span></div>
                          {basketMaking > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Making ({makingChargeRate}%)</span><span>{currencySymbol} {basketMaking.toLocaleString()}</span></div>}
                          {basketTax > 0 && <div className="flex justify-between"><span className="text-muted-foreground"><T>Tax</T></span><span>{currencySymbol} {Math.round(basketTax).toLocaleString()}</span></div>}
                          <div className="flex justify-between font-bold text-base border-t pt-1"><span><T>Total</T></span><span>{currencySymbol} {Math.round(basketTotal).toLocaleString()}</span></div>
                        </div>
                        <Button className="w-full h-12 text-base font-semibold" onClick={() => setCheckoutOpen(true)}>
                          <T>Checkout</T> — {currencySymbol} {Math.round(basketTotal).toLocaleString()}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ═══ ERP Mode Layout (existing) ═══ */}
          {!isCounterMode && session && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Customer Picks */}
              <div className="lg:col-span-1 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Heart className="h-4 w-4 text-pink-500" /> <T>Customer Picks</T>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Load picks */}
                    {customerPicks.length === 0 && (
                      <div className="space-y-3">
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <Label><T>Customer ID</T></Label>
                            <Input
                              placeholder={t("Customer user ID")}
                              value={customerId}
                              onChange={(e) => setCustomerId(e.target.value)}
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={() => loadCustomerPicks()}
                            disabled={picksLoading || !customerId}
                          >
                            {picksLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Search className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        {picksLoading && (
                          <p className="text-xs text-muted-foreground">
                            <T>Loading...</T>
                          </p>
                        )}
                      </div>
                    )}

                    {customerPicks.length > 0 && (
                      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                        {customerPicks.map((pick) => (
                          <div
                            key={pick.id}
                            className="flex items-center gap-3 p-2 border rounded-lg hover:bg-accent/50 transition"
                          >
                            {pick.inventoryItem.images?.[0] ? (
                              <Image
                                src={pick.inventoryItem.images[0]}
                                alt=""
                                className="h-12 w-12 rounded object-cover"
                                width={48}
                                height={48}
                                unoptimized
                              />
                            ) : (
                              <div className="h-12 w-12 bg-muted rounded flex items-center justify-center">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {pick.inventoryItem.nameEn}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {pick.inventoryItem.sku} · {currencySymbol}{" "}
                                {pick.inventoryItem.totalPriceNpr?.toLocaleString()}
                              </p>
                              {pick.inventoryItem.variants?.length > 0 && (
                                <p className="text-xs text-blue-600">
                                  {pick.inventoryItem.variants.length} <T>sizes</T>
                                </p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleAddItem(pick.inventoryItem.id)
                              }
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Manual Add */}
                <Card data-tour="pos-search">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      <T>Quick Add by SKU</T>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ManualAddForm
                      shopId={user?.shop?.id}
                      onAdd={(itemId, variantId) =>
                        handleAddItem(itemId, variantId)
                      }
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Right: Basket */}
              <div data-tour="pos-cart" className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" /> <T>Basket</T>
                        {session.items?.length > 0 && (
                          <Badge variant="secondary">
                            {session.items.length} <T>items</T>
                          </Badge>
                        )}
                      </CardTitle>
                      {session.items?.length > 0 && (
                          <Button data-tour="pos-checkout" onClick={() => setCheckoutOpen(true)}>
                          <T>Checkout</T>
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(!session.items || session.items.length === 0) && (
                      <div className="text-center py-12 text-muted-foreground">
                        <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p><T>Basket is empty</T></p>
                        <p className="text-xs mt-1">
                          <T>Add items from customer picks or by SKU</T>
                        </p>
                      </div>
                    )}

                    {session.items && session.items.length > 0 && (
                      <>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead><T>Item</T></TableHead>
                              <TableHead><T>Variant</T></TableHead>
                              <TableHead className="text-right">
                                <T>Unit Price</T>
                              </TableHead>
                              <TableHead className="text-center"><T>Qty</T></TableHead>
                              <TableHead className="text-right">
                                <T>Line Total</T>
                              </TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {session.items.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {item.inventoryItem?.images?.[0] ? (
                                      <Image
                                        src={item.inventoryItem.images[0]}
                                        alt=""
                                        className="h-8 w-8 rounded object-cover"
                                        width={32}
                                        height={32}
                                        unoptimized
                                      />
                                    ) : (
                                      <div className="h-8 w-8 bg-muted rounded" />
                                    )}
                                    <div>
                                      <p className="text-sm font-medium">
                                        {item.inventoryItem?.nameEn}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {item.inventoryItem?.sku}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {item.variant ? (
                                    <Badge variant="outline">
                                      {item.variant.sizeLabel}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">
                                      —
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {currencySymbol} {item.unitPrice?.toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() =>
                                        handleUpdateQty(
                                          item.id,
                                          Math.max(0, item.qty - 1),
                                        )
                                      }
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="w-8 text-center font-medium">
                                      {item.qty}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() =>
                                        handleUpdateQty(item.id, item.qty + 1)
                                      }
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {currencySymbol} {item.lineTotal?.toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive"
                                    onClick={() => handleUpdateQty(item.id, 0)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>

                        {/* Totals */}
                        <div className="mt-4 border-t pt-4 space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              <T>Subtotal</T>
                            </span>
                            <span>{currencySymbol} {basketSubtotal.toLocaleString()}</span>
                          </div>
                          {taxRate > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                <T>Tax</T> ({(taxRate * 100).toFixed(1)}%)
                              </span>
                              <span>{currencySymbol} {basketTax.toLocaleString()}</span>
                            </div>
                          )}
                          {discountAmount > 0 && (
                            <div className="flex justify-between text-green-600">
                              <span><T>Discount</T></span>
                              <span>
                                - {currencySymbol} {discountAmount.toLocaleString()}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-base pt-2 border-t">
                            <span><T>Total</T></span>
                            <span>{currencySymbol} {basketTotal.toLocaleString()}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* Checkout Dialog */}
        <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle><T>Checkout</T></DialogTitle>
              <DialogDescription>
                <T>Complete the sale and generate an invoice</T>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="checkout-name"><T>Customer Name *</T></Label>
                <Input
                  id="checkout-name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={t("Full name")}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label><T>Phone</T></Label>
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder={t("Optional")}
                  />
                </div>
                <div>
                  <Label><T>Email</T></Label>
                  <Input
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder={t("Optional")}
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-sm font-medium"><T>Payment Method</T></Label>
                  <Button
                    type="button"
                    variant={splitMode ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      if (!splitMode) {
                        initSplitLegs(Math.max(0, basketTotal));
                        setSplitMode(true);
                      } else {
                        setSplitMode(false);
                      }
                    }}
                  >
                    <Split className="h-3 w-3 mr-1" />
                    {splitMode ? <T>Single</T> : <T>Split</T>}
                  </Button>
                </div>
                {!splitMode ? (
                  <>
                    <div className="grid grid-cols-3 gap-2 mt-1.5">
                      {PAYMENT_METHODS.map((pm) => (
                        <button
                          key={pm.value}
                          type="button"
                          onClick={() => setPaymentMethod(pm.value)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${paymentMethod === pm.value ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-muted/50 border-muted-foreground/20 hover:border-primary/50"}`}
                        >
                          {pm.label}
                        </button>
                      ))}
                    </div>
                    {upiOverLimit && (
                      <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-100">
                        <p className="font-semibold"><T>UPI limit exceeded</T></p>
                        <p>
                          <T>
                            UPI / PhonePe cannot collect more than ₹1,00,000 in one
                            QR. Use bank transfer, card, cash, or split the payment.
                          </T>
                        </p>
                      </div>
                    )}
                    {isDigitalWalletMethod(paymentMethod) && !upiOverLimit && (
                      <div className="mt-3 rounded-lg border border-dashed border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-center space-y-2">
                        {shopUpiId && basketTotal > 0 ? (
                          <>
                            <p className="text-xs text-muted-foreground">
                              <T>Customer can scan to pay via UPI / PhonePe</T>
                            </p>
                            <Image
                              src={buildQrImageUrl(
                                buildUpiPayUri({
                                  upiId: shopUpiId,
                                  amount: Math.round(basketTotal),
                                  currency: "INR",
                                  payeeName: billSettings?.shopNameOnBill || user?.shop?.shopName,
                                  note: "POS sale",
                                }) || shopUpiId,
                              )}
                              alt="UPI QR"
                              className="mx-auto h-36 w-36 rounded bg-white p-2"
                              width={144}
                              height={144}
                              unoptimized
                            />
                            <p className="text-[11px] font-mono text-muted-foreground">{shopUpiId}</p>
                          </>
                        ) : (
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            <T>Add UPI ID in Shop Settings to show a payment QR.</T>
                          </p>
                        )}
                      </div>
                    )}
                    {paymentMethod === "BANK_TRANSFER" && (
                      <div className="mt-3 rounded-lg border bg-muted/40 p-3 text-xs space-y-1 text-left">
                        <p className="font-semibold text-sm">
                          <T>Bank transfer details</T>
                        </p>
                        {bankDetailLines.length > 0 ? (
                          bankDetailLines.map((line) => (
                            <p key={line} className="text-muted-foreground">{line}</p>
                          ))
                        ) : (
                          <p className="text-muted-foreground">
                            <T>
                              Add bank account details in Shop Settings so they
                              appear on the receipt.
                            </T>
                          </p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mt-2 space-y-2">
                    {splitLegs.map((leg, index) => (
                      <div key={leg.id} className="rounded-lg border p-2 space-y-2">
                        <div className="flex justify-between items-center">
                          <p className="text-xs font-medium"><T>Part</T> {index + 1}</p>
                          {splitLegs.length > 2 && (
                            <button
                              type="button"
                              onClick={() =>
                                setSplitLegs((prev) => prev.filter((l) => l.id !== leg.id))
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {PAYMENT_METHODS.map((pm) => (
                            <button
                              key={pm.value}
                              type="button"
                              onClick={() =>
                                setSplitLegs((prev) =>
                                  prev.map((l) =>
                                    l.id === leg.id
                                      ? { ...l, method: pm.value as CounterPaymentMethod }
                                      : l,
                                  ),
                                )
                              }
                              className={`px-1 py-1 rounded text-[10px] border ${
                                leg.method === pm.value
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-muted/50"
                              }`}
                            >
                              {pm.label}
                            </button>
                          ))}
                        </div>
                        <Input
                          type="number"
                          value={leg.amount}
                          onChange={(e) =>
                            setSplitLegs((prev) =>
                              prev.map((l) =>
                                l.id === leg.id ? { ...l, amount: e.target.value } : l,
                              ),
                            )
                          }
                          className="h-8"
                        />
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() =>
                          setSplitLegs((prev) => [
                            ...prev,
                            {
                              id: crypto.randomUUID(),
                              method: (PAYMENT_METHODS[0]?.value ||
                                "CASH") as CounterPaymentMethod,
                              amount: "0",
                            },
                          ])
                        }
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        <T>Add part</T>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => initSplitLegs(Math.max(0, basketTotal))}
                      >
                        <T>50 / 50</T>
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Tax Presets */}
              <div>
                <Label className="text-sm font-medium"><T>Tax Rate</T></Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {TAX_PRESETS.map((tp) => (
                    <button
                      key={tp.label}
                      onClick={() => setTaxRate(tp.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${taxRate === tp.value ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-transparent hover:border-primary/50"}`}
                    >
                      {tp.label}
                    </button>
                  ))}
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-20 h-7 text-xs"
                    placeholder="Custom"
                  />
                </div>
              </div>

              {/* Making Charges */}
              <div>
                <Label className="text-sm font-medium"><T>Making Charges</T></Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {MAKING_PRESETS.map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setMakingChargeRate(pct)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${makingChargeRate === pct ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-transparent hover:border-primary/50"}`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label><T>Discount</T> ({currencySymbol})</Label>
                  <Input
                    type="number"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label><T>Notes</T></Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t("Optional...")}
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span><T>Items</T></span>
                  <span>{session?.items?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span><T>Subtotal</T></span>
                  <span>{currencySymbol} {basketSubtotal.toLocaleString()}</span>
                </div>
                {basketMaking > 0 && (
                  <div className="flex justify-between">
                    <span>Making ({makingChargeRate}%)</span>
                    <span>{currencySymbol} {basketMaking.toLocaleString()}</span>
                  </div>
                )}
                {basketTax > 0 && (
                  <div className="flex justify-between">
                    <span><T>Tax</T> ({(taxRate * 100).toFixed(1)}%)</span>
                    <span>{currencySymbol} {Math.round(basketTax).toLocaleString()}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span><T>Discount</T></span>
                    <span>- {currencySymbol} {discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t pt-1 text-base">
                  <span><T>Total</T></span>
                  <span>{currencySymbol} {Math.round(basketTotal).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span><T>Payment</T></span>
                  <span>{paymentMethod}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCheckoutOpen(false)}>
                <T>Cancel</T>
              </Button>
              <Button
                onClick={handleCheckout}
                disabled={
                  checkoutLoading || !customerName.trim() || upiOverLimit
                }
                className="min-w-[140px]"
              >
                {checkoutLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : null}
                <T>Complete Sale</T>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Receipt Success Dialog */}
        <Dialog open={!!checkoutSuccess} onOpenChange={(open) => !open && setCheckoutSuccess(null)}>
          <DialogContent className="sm:max-w-sm text-center">
            <DialogHeader>
              <DialogTitle className="text-center text-xl">
                ✅ <T>Sale Complete!</T>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="text-3xl font-bold">
                {currencySymbol} {checkoutSuccess?.total?.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">
                <T>Invoice</T> #{checkoutSuccess?.invoiceNumber}
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!checkoutSuccess) return;
                    const ok = printBill({
                      fallbackShopName: user?.shop?.shopName,
                      settings: billSettings,
                      invoiceNumber: checkoutSuccess.invoiceNumber,
                      customerName: checkoutSuccess.customerName,
                      customerPhone: checkoutSuccess.customerPhone,
                      totalAmount: checkoutSuccess.total,
                      paidAmount: checkoutSuccess.total,
                      balanceDue: 0,
                      currency: currencySymbol,
                      paymentMethod: checkoutSuccess.paymentMethod,
                      paymentSummary: checkoutSuccess.paymentSummary,
                      bankAccountDetails:
                        checkoutSuccess.usedBankTransfer &&
                        hasBankTransferDetails(shopBankDetails)
                          ? shopBankDetails
                          : undefined,
                      verificationToken: checkoutSuccess.verificationToken,
                    });
                    if (!ok) {
                      toast({
                        variant: "destructive",
                        title: t("Pop-ups blocked"),
                        description: t("Allow pop-ups to print the receipt"),
                      });
                    }
                  }}
                >
                  🖨️ <T>Print Receipt</T>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const text = `Invoice ${checkoutSuccess?.invoiceNumber}\nTotal: ${currencySymbol} ${checkoutSuccess?.total?.toLocaleString()}\nPaid via: ${checkoutSuccess?.paymentSummary || checkoutSuccess?.paymentMethod || "CASH"}\nThank you for your purchase!`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                  }}
                >
                  💬 WhatsApp
                </Button>
              </div>
            </div>
            <DialogFooter className="justify-center">
              <Button onClick={() => setCheckoutSuccess(null)}>
                <T>Done</T>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ManagerPinDialog
          open={pinOpen}
          onOpenChange={setPinOpen}
          title="Authorize discount"
          description={
            hasManagerPin
              ? `Manager PIN required for discounts of ${discountThreshold}+ ${currencySymbol}.`
              : "Manager PIN required for this discount."
          }
          onVerified={async () => {
            setPinOpen(false);
            await runCheckout();
          }}
        />

        <BarcodeScannerSheet
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={handleScannedCode}
          shopId={user?.shop?.id}
          hint="Scan a printed barcode or QR with the webcam, type a SKU, or use a USB / Bluetooth barcode or RFID gun."
        />
      </DashboardLayout>
    </ShopGuard>
  );
}

function ManualAddForm({
  shopId,
  onAdd,
}: {
  shopId?: string;
  onAdd: (itemId: string, variantId?: string) => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const t = useT();

  const submit = async () => {
    const trimmed = normalizeScanCode(code);
    if (!trimmed || !shopId) return;
    setBusy(true);
    try {
      const res = await inventoryApi.lookupByCode(shopId, trimmed);
      const item = res.data?.item;
      if (!item?.id) {
        toast({
          title: t("Not found"),
          description: t("No matching SKU, RFID, or QR in this shop."),
          variant: "destructive",
        });
        return;
      }
      onAdd(item.id, res.data?.variant?.id);
      setCode("");
    } catch (err: any) {
      toast({
        title: t("Lookup failed"),
        description: err?.response?.data?.message || t("Could not look up that code"),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <Label><T>SKU / RFID / QR</T></Label>
        <Input
          data-pos-scan="true"
          placeholder={t("Scan or type SKU, RFID, or QR")}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
        />
      </div>
      <Button
        size="sm"
        disabled={!code.trim() || !shopId || busy}
        onClick={() => void submit()}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <Plus className="h-4 w-4 mr-1" />
        )}{" "}
        <T>Add</T>
      </Button>
    </div>
  );
}
