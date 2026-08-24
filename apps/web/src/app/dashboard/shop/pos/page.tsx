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
import {
  customerCrmApi,
  inventoryApi,
  invoicesApi,
  posApi,
  shopsApi,
} from "@/lib/api";
import { ManagerPinDialog } from "@/components/shop/ManagerPinDialog";
import { PosShiftModal } from "@/components/shop/PosShiftModal";
import { PosReturnModal } from "@/components/shop/PosReturnModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  defaultPhoneCountryCode,
  PosCustomerPicker,
  type PosCustomer,
} from "@/components/shop/PosCustomerPicker";
import {
  SellerProductDetailDialog,
  type SellerProductDetail,
} from "@/components/shop/SellerProductDetailDialog";
import { printAuthoritativeBill, printBill, type BillSettings } from "@/lib/billPrint";
import { unwrapInvoiceSettingsResponse } from "@/lib/invoiceBranding";
import { roundMoney2 } from "@/lib/invoice/calculateLineTotals";
import { kickCashDrawer, loadHardwareConfig } from "@/lib/posHardware";
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
    CheckCircle2,
    Coins,
    DollarSign,
    FileText,
    Heart,
    Loader2,
    Maximize2,
    Minus,
    Package,
    Plus,
    RotateCcw,
    ScanLine,
    Search,
    ShoppingCart,
    Split,
    Store,
    Trash2,
    UserRound,
    X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
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
  customer?: PosCustomer | null;
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
  const [selectedCustomer, setSelectedCustomer] =
    useState<PosCustomer | null>(null);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const [viewingProduct, setViewingProduct] =
    useState<SellerProductDetail | null>(null);
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
  const [drawerPinOpen, setDrawerPinOpen] = useState(false);
  const [discountThreshold, setDiscountThreshold] = useState(0);
  const [hasManagerPin, setHasManagerPin] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [makingChargeRate, setMakingChargeRate] = useState(0);
  const [confirmingPaymentId, setConfirmingPaymentId] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState<{
    invoiceId?: string;
    invoiceNumber: string;
    total: number;
    status?: string;
    paymentStatus?: string;
    paidAmount?: number;
    balanceDue?: number;
    paymentMethod?: string;
    paymentSummary?: string;
    customerName?: string;
    customerPhone?: string;
    verificationToken?: string;
    usedBankTransfer?: boolean;
    pendingPayments?: Array<{ id: string; amount: number; method: string }>;
  } | null>(null);
  const [billSettings, setBillSettings] = useState<BillSettings | null>(null);
  const [shopUpiId, setShopUpiId] = useState("");
  const [shopBankDetails, setShopBankDetails] =
    useState<ShopBankAccountDetails | null>(null);
  const [splitMode, setSplitMode] = useState(false);
  const [splitLegs, setSplitLegs] = useState<
    Array<{ id: string; method: CounterPaymentMethod; amount: string }>
  >([]);

  // Multi-counter register and shift state
  const [registers, setRegisters] = useState<Array<{ id: string; name: string; terminalCode: string }>>([]);
  const [selectedRegisterId, setSelectedRegisterId] = useState<string>("");
  const [currentShift, setCurrentShift] = useState<any | null>(null);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shiftModalMode, setShiftModalMode] = useState<"OPEN" | "CLOSE" | "Z_REPORT">("OPEN");
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [serverPreview, setServerPreview] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const shopCountry = user?.shop?.country || "NP";
  const PAYMENT_METHODS = getCounterPaymentMethods(shopCountry);
  const TAX_PRESETS = shopCountry === "IN"
    ? [{ label: "GST 3%", value: 0.03 }, { label: "GST 5%", value: 0.05 }, { label: "Exempt", value: 0 }]
    : shopCountry === "NP"
      ? [{ label: "VAT 13%", value: 0.13 }, { label: "Exempt", value: 0 }]
      : [{ label: "VAT 5%", value: 0.05 }, { label: "Exempt", value: 0 }];
  const MAKING_PRESETS = [0, 8, 12, 14, 18];

  const loadRegisters = useCallback(async () => {
    try {
      const res = await posApi.getRegisters();
      const list = res.data || [];
      setRegisters(list);
      if (list.length > 0) {
        setSelectedRegisterId((current) => current || list[0].id);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadCurrentShift = useCallback(async (regId?: string) => {
    try {
      const res = await posApi.getCurrentShift(regId || selectedRegisterId || undefined);
      setCurrentShift(res.data || null);
    } catch {
      setCurrentShift(null);
    }
  }, [selectedRegisterId]);

  // Load active session on mount
  const loadActiveSession = useCallback(async (regId?: string) => {
    try {
      const res = await posApi.getActiveSession(regId || selectedRegisterId || undefined);
      if (res.data) {
        setSession(res.data);
        setSelectedCustomer(res.data.customer || null);
      } else {
        setSession(null);
      }
    } catch {
      setSession(null);
    }
  }, [selectedRegisterId]);

  useEffect(() => {
    loadRegisters();
  }, [loadRegisters]);

  useEffect(() => {
    if (selectedRegisterId) {
      loadCurrentShift(selectedRegisterId);
      loadActiveSession(selectedRegisterId);
    }
  }, [selectedRegisterId, loadCurrentShift, loadActiveSession]);

  // Authoritative server pricing preview effect
  useEffect(() => {
    if (!session?.id || session.items.length === 0) {
      setServerPreview(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await posApi.previewSession(session.id, {
          makingChargeRate: makingChargeRate || undefined,
          discountAmount: discountAmount || undefined,
          taxRate: taxRate || undefined,
          invoiceCountry: shopCountry || undefined,
        });
        if (!cancelled) setServerPreview(res.data);
      } catch {
        if (!cancelled) setServerPreview(null);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [session?.id, session?.items, makingChargeRate, discountAmount, taxRate, shopCountry]);

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
  const activeSessionId = session?.id;
  useEffect(() => {
    const shopId = user?.shop?.id;
    if (!shopId || !activeSessionId) return;
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
  }, [activeSessionId, counterSearch, user?.shop?.id]);

  // ─── Create Session ───

  const handleCreateSession = async (cId?: string, convId?: string) => {
    setLoading(true);
    try {
      const res = await posApi.createSession({
        customerId:
          cId || selectedCustomer?.id || customerId || undefined,
        conversationId: convId || urlConversationId || undefined,
        registerId: selectedRegisterId || undefined,
      });
      setSession(res.data);
      setSelectedCustomer(res.data.customer || selectedCustomer || null);
      toast({ title: t("POS session started (30 min)") });

      // Auto-load picks if we have a customer
      const pickedCustomer = res.data.customer as PosCustomer | undefined;
      if (pickedCustomer?.isRegistered) {
        await loadCustomerPicks(pickedCustomer.id);
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

  useEffect(() => {
    const customer = session?.customer;
    if (!customer) return;
    setSelectedCustomer(customer);
    setCustomerId(customer.id);
    setCustomerName(customer.name || "");
    setCustomerPhone(customer.phone || "");
    setCustomerEmail(customer.email || "");
  }, [session?.customer]);

  const attachCustomer = async (customer: PosCustomer) => {
    try {
      const updated = session
        ? await posApi.updateCustomer(session.id, customer.id)
        : null;
      setSelectedCustomer(customer);
      setCustomerId(customer.id);
      setCustomerName(customer.name || "");
      setCustomerPhone(customer.phone || "");
      setCustomerEmail(customer.email || "");
      if (!session) return;

      if (updated) setSession(updated.data);
      setCustomerDialogOpen(false);
      if (customer.isRegistered) await loadCustomerPicks(customer.id);
      else setCustomerPicks([]);
    } catch (error: any) {
      toast({
        title: t("Could not attach customer"),
        description: error?.response?.data?.message,
        variant: "destructive",
      });
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

    let checkoutCustomerId = session.customerId;
    if (!checkoutCustomerId && customerName.trim() && customerPhone.trim()) {
      const phoneCountryCode = defaultPhoneCountryCode(shopCountry);
      const countryDigits = phoneCountryCode.replace(/\D/g, "");
      let localPhone = customerPhone.replace(/\D/g, "");
      if (
        customerPhone.trim().startsWith(phoneCountryCode) &&
        localPhone.startsWith(countryDigits)
      ) {
        localPhone = localPhone.slice(countryDigits.length);
      }
      try {
        const customerRes = await customerCrmApi.upsertWalkIn({
          name: customerName.trim(),
          phoneCountryCode,
          phone: localPhone,
          email: customerEmail.trim() || undefined,
          country: shopCountry,
        });
        const savedCustomer = customerRes.data as PosCustomer;
        checkoutCustomerId = savedCustomer.id;
        setSelectedCustomer(savedCustomer);
        const updatedSession = await posApi.updateCustomer(
          session.id,
          savedCustomer.id,
        );
        setSession(updatedSession.data);
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: t("Could not save customer"),
          description:
            error?.response?.data?.message ||
            t("Use Add customer to check the phone number"),
        });
        return;
      }
    }

    setCheckoutLoading(true);
    try {
      const res = await posApi.checkout(session.id, {
        customerName,
        customerPhone: customerPhone || undefined,
        customerEmail: customerEmail || undefined,
        customerId: checkoutCustomerId || undefined,
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
      const payments = Array.isArray(inv?.payments) ? inv.payments : [];
      const pendingPayments = payments.filter((p: any) => p.status === "PENDING");
      const hasReceivedCash = payments.some(
        (payment: any) => payment.method === "CASH" && payment.status === "RECEIVED",
      );
      if (hasReceivedCash && loadHardwareConfig().printer.kickCashDrawer) {
        kickCashDrawer().catch(() => {});
      }

      setSession(null);
      setCheckoutOpen(false);
      setCustomerPicks([]);
      setSelectedCustomer(null);
      setCustomerId("");
      setSplitMode(false);
      setCheckoutSuccess({
        invoiceId: inv?.id,
        invoiceNumber: inv?.invoiceNumber || "N/A",
        total: inv?.totalAmount || basketTotal,
        status: inv?.status,
        paymentStatus: inv?.paymentStatus,
        paidAmount: inv?.paidAmount,
        balanceDue: inv?.balanceDue,
        paymentMethod: splitMode ? "SPLIT" : paymentMethod,
        paymentSummary,
        customerName,
        customerPhone,
        verificationToken: inv?.verificationToken,
        usedBankTransfer,
        pendingPayments: pendingPayments.map((p: any) => ({
          id: p.id,
          amount: Number(p.amount),
          method: p.method,
        })),
      });
      const isPaymentComplete =
        inv?.paymentStatus === "PAID" && Number(inv?.balanceDue || 0) <= 0.01;
      toast({
        title: isPaymentComplete
          ? t("Checkout complete")
          : t("Sale created — payment pending"),
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

  const handleKickDrawer = async (managerPin?: string) => {
    try {
      await posApi.authorizeDrawerOpen({
        reason: "Cashier manual drawer open",
        registerId: selectedRegisterId || undefined,
        managerPin,
      });
      await kickCashDrawer();
      await posApi.auditDrawerOpen({
        reason: "Cashier manual drawer open",
        registerId: selectedRegisterId || undefined,
        success: true,
      });
      toast({ title: t("Drawer opened") });
    } catch (err: any) {
      // Authorization happens before the hardware action. A hardware failure
      // is still recorded, but never alters a completed sale.
      if (err?.response == null) {
        void posApi.auditDrawerOpen({
          reason: "Cashier manual drawer open",
          registerId: selectedRegisterId || undefined,
          success: false,
          error: err?.message || "Hardware kick failed",
        });
      }
      toast({
        title: t("Drawer kick failed"),
        description: err?.message || t("Check receipt printer connection"),
        variant: "destructive",
      });
    }
  };

  const requestDrawerOpen = async () => {
    try {
      const res = await shopsApi.getManagerPinStatus();
      const status = res.data?.data ?? res.data;
      if (status?.hasPin) {
        setDrawerPinOpen(true);
        return;
      }
      await handleKickDrawer();
    } catch (err: any) {
      toast({
        title: t("Drawer authorization failed"),
        description: err?.response?.data?.message || t("Unable to authorize the cash drawer"),
        variant: "destructive",
      });
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
      setSelectedCustomer(null);
      setCustomerId("");
      toast({ title: t("POS session cancelled, stock released") });
    } catch (err: any) {
      toast({
        title: t("Failed to cancel"),
        description: err?.response?.data?.message || t("Unknown error"),
        variant: "destructive",
      });
    }
  };

  // ─── Compute Basket Totals (Authoritative Server Preview Preferred) ───

  const localSubtotal =
    session?.items?.reduce((sum, i) => sum + i.lineTotal, 0) || 0;
  const localMaking = makingChargeRate > 0 ? roundMoney2(localSubtotal * (makingChargeRate / 100)) : 0;
  const localTax = roundMoney2((localSubtotal + localMaking) * (taxRate || 0));
  const localTotal = roundMoney2(localSubtotal + localMaking + localTax - (discountAmount || 0));

  const basketSubtotal = serverPreview?.subtotal ?? localSubtotal;
  const basketMaking = serverPreview?.makingChargeAmount ?? localMaking;
  const basketTax = serverPreview?.taxAmount ?? localTax;
  const basketTotal = serverPreview?.grandTotal ?? localTotal;


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
            <div className="flex items-center gap-2 flex-wrap">
              {/* Register / Counter Selector */}
              {registers.length > 0 && (
                <div className="flex items-center gap-1.5 bg-muted/40 rounded-lg p-1 border">
                  <Store className="h-4 w-4 text-muted-foreground ml-1.5" />
                  <Select value={selectedRegisterId} onValueChange={setSelectedRegisterId}>
                    <SelectTrigger className="h-8 text-xs border-0 bg-transparent shadow-none w-36">
                      <SelectValue placeholder={t("Select Counter")} />
                    </SelectTrigger>
                    <SelectContent>
                      {registers.map((r) => (
                        <SelectItem key={r.id} value={r.id} className="text-xs">
                          {r.name} ({r.terminalCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Shift Status & Controls */}
              {currentShift ? (
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 border-emerald-300 text-xs">
                    <T>Shift Open</T>
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => {
                      setShiftModalMode("CLOSE");
                      setShiftModalOpen(true);
                    }}
                  >
                    <FileText className="h-3.5 w-3.5 mr-1" /> <T>Close Shift</T>
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-800 border-amber-300"
                  onClick={() => {
                    setShiftModalMode("OPEN");
                    setShiftModalOpen(true);
                  }}
                >
                  <DollarSign className="h-3.5 w-3.5 mr-1" /> <T>Open Shift</T>
                </Button>
              )}

              {/* Drawer Kick */}
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={requestDrawerOpen}
                title={t("Open Cash Drawer")}
              >
                <Coins className="h-3.5 w-3.5 mr-1" /> <T>Drawer</T>
              </Button>

              {/* Return & Exchange */}
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => setReturnModalOpen(true)}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> <T>Return / Exchange</T>
              </Button>
            </div>
            {session && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomerDialogOpen(true)}
                >
                  <UserRound className="h-4 w-4 mr-1" />
                  {selectedCustomer?.name || <T>Add customer</T>}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCatalogueOpen(true)}
                >
                  <Package className="h-4 w-4 mr-1" /> <T>Catalogue</T>
                </Button>
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
                  <T>Search an existing customer by phone or save a new walk-in customer before starting. You can also start without a customer.</T>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <PosCustomerPicker
                  country={shopCountry}
                  selected={selectedCustomer}
                  onSelect={(customer) => {
                    setSelectedCustomer(customer);
                    setCustomerId(customer.id);
                    setCustomerName(customer.name || "");
                    setCustomerPhone(customer.phone || "");
                    setCustomerEmail(customer.email || "");
                  }}
                  onClear={() => {
                    setSelectedCustomer(null);
                    setCustomerId("");
                    setCustomerName("");
                    setCustomerPhone("");
                    setCustomerEmail("");
                  }}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={() => handleCreateSession()}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <ShoppingCart className="h-4 w-4 mr-1" />
                    )}
                    {selectedCustomer ? <T>Start session for customer</T> : <T>Start without customer</T>}
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
                      <button
                        type="button"
                        onClick={() =>
                          setViewingProduct(item as SellerProductDetail)
                        }
                        className="absolute top-2 left-2 z-10 rounded-full bg-white/90 dark:bg-gray-900/90 p-1.5 text-amber-800 shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title={t("Show full details to customer")}
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                      </button>
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
                        {selectedCustomer ? (
                          <div className="rounded-lg border p-3">
                            <p className="text-sm font-medium">{selectedCustomer.name}</p>
                            <p className="text-xs text-muted-foreground">{selectedCustomer.phone}</p>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => setCustomerDialogOpen(true)}
                          >
                            <UserRound className="h-4 w-4 mr-2" />
                            <T>Add customer</T>
                          </Button>
                        )}
                        {selectedCustomer?.isRegistered && (
                          <Button
                            size="sm"
                            onClick={() => loadCustomerPicks(selectedCustomer.id)}
                            disabled={picksLoading}
                          >
                            {picksLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Heart className="h-4 w-4 mr-2" />}
                            <T>Load customer picks</T>
                          </Button>
                        )}
                        {selectedCustomer && !selectedCustomer.isRegistered && (
                          <p className="text-xs text-muted-foreground">
                            <T>Wishlist picks are available for registered customers.</T>
                          </p>
                        )}
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

        <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle><T>POS customer</T></DialogTitle>
              <DialogDescription>
                <T>Search by phone or save a walk-in customer. The same customer record is used by quotes and invoices.</T>
              </DialogDescription>
            </DialogHeader>
            <PosCustomerPicker
              country={shopCountry}
              selected={selectedCustomer}
              onSelect={attachCustomer}
              onClear={async () => {
                if (session) {
                  const res = await posApi.updateCustomer(session.id);
                  setSession(res.data);
                }
                setSelectedCustomer(null);
                setCustomerId("");
                setCustomerName("");
                setCustomerPhone("");
                setCustomerEmail("");
                setCustomerPicks([]);
              }}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={catalogueOpen} onOpenChange={setCatalogueOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle><T>Add from product catalogue</T></DialogTitle>
              <DialogDescription>
                <T>Search inventory, review full details, and add an available piece to this basket.</T>
              </DialogDescription>
            </DialogHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                value={counterSearch}
                onChange={(event) => setCounterSearch(event.target.value)}
                placeholder={t("Search product name, SKU, QR, or RFID")}
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto py-1">
              {counterItems.map((item: any) => (
                <div key={item.id} className="rounded-xl border p-3 space-y-2">
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => {
                      setCatalogueOpen(false);
                      setViewingProduct(item as SellerProductDetail);
                    }}
                  >
                    <div className="relative aspect-square rounded-lg bg-muted overflow-hidden mb-2">
                      {item.images?.[0] ? (
                        <Image src={item.images[0]} alt="" fill className="object-cover" sizes="200px" unoptimized />
                      ) : (
                        <div className="h-full flex items-center justify-center"><Package className="h-8 w-8 text-muted-foreground/40" /></div>
                      )}
                    </div>
                    <p className="text-sm font-medium truncate">{item.nameEn}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.sku}</p>
                    <p className="text-sm font-semibold mt-1">{currencySymbol} {item.totalPriceNpr?.toLocaleString()}</p>
                  </button>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      if (item.variants?.length) {
                        setCatalogueOpen(false);
                        setViewingProduct(item as SellerProductDetail);
                      } else {
                        void handleAddItem(item.id);
                      }
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {item.variants?.length ? <T>Choose variant</T> : <T>Add to basket</T>}
                  </Button>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <SellerProductDetailDialog
          item={viewingProduct}
          open={Boolean(viewingProduct)}
          onOpenChange={(open) => {
            if (!open) setViewingProduct(null);
          }}
          onAddedToPos={async () => {
            if (!session) return;
            const res = await posApi.getSession(session.id);
            setSession(res.data);
          }}
        />

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
          <DialogContent className="sm:max-w-md text-center">
            <DialogHeader>
              <DialogTitle className="text-center text-xl">
                {checkoutSuccess?.paymentStatus === "PENDING" || (checkoutSuccess?.balanceDue != null && checkoutSuccess.balanceDue > 0.01) ? (
                  <span className="text-amber-600 dark:text-amber-400">⏳ <T>Sale created — Payment Pending</T></span>
                ) : (
                  <span>✅ <T>Sale Complete!</T></span>
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="text-3xl font-bold">
                {currencySymbol} {checkoutSuccess?.total?.toLocaleString()}
              </div>

              {checkoutSuccess && (checkoutSuccess.paymentStatus === "PENDING" || (checkoutSuccess.balanceDue != null && checkoutSuccess.balanceDue > 0.01)) ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 p-3 text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="border-amber-400 text-amber-800 dark:text-amber-200 text-xs">
                      <T>Payment Pending Confirmation</T>
                    </Badge>
                    <span className="text-xs font-mono font-semibold text-amber-800 dark:text-amber-200">
                      <T>Pending amount</T>: {currencySymbol} {(checkoutSuccess.balanceDue ?? checkoutSuccess.total).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <T>Non-cash counter payments are recorded as pending until explicitly confirmed by the cashier.</T>
                  </p>
                  {checkoutSuccess.invoiceId && checkoutSuccess.pendingPayments && checkoutSuccess.pendingPayments.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      {checkoutSuccess.pendingPayments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-2 bg-white dark:bg-zinc-900 p-2 rounded-lg border">
                          <span className="text-xs font-medium">
                            {p.method}: {currencySymbol} {p.amount.toLocaleString()}
                          </span>
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={confirmingPaymentId === p.id}
                            onClick={async () => {
                              if (!checkoutSuccess?.invoiceId) return;
                              setConfirmingPaymentId(p.id);
                              try {
                                await invoicesApi.confirmPayment(checkoutSuccess.invoiceId, p.id, {});
                                const refreshed = await invoicesApi.getById(checkoutSuccess.invoiceId);
                                const canonical = refreshed.data;
                                const canonicalPayments = Array.isArray(canonical?.payments)
                                  ? canonical.payments
                                  : [];
                                toast({
                                  title: t("Payment Confirmed!"),
                                  description: t("Payment has been verified and invoice balance updated."),
                                });
                                setCheckoutSuccess((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        status: canonical.status,
                                        paymentStatus: canonical.paymentStatus,
                                        paidAmount: Number(canonical.paidAmount),
                                        balanceDue: Number(canonical.balanceDue),
                                        paymentMethod: canonical.paymentMethod || prev.paymentMethod,
                                        pendingPayments: canonicalPayments
                                          .filter((payment: any) => payment.status === "PENDING")
                                          .map((payment: any) => ({
                                            id: payment.id,
                                            amount: Number(payment.amount),
                                            method: payment.method,
                                          })),
                                      }
                                    : null,
                                );
                                loadCurrentShift(selectedRegisterId);
                              } catch (err: any) {
                                toast({
                                  variant: "destructive",
                                  title: t("Failed to confirm payment"),
                                  description: err?.response?.data?.message || t("Unknown error"),
                                });
                              } finally {
                                setConfirmingPaymentId(null);
                              }
                            }}
                          >
                            {confirmingPaymentId === p.id ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            )}
                            <T>Confirm Payment Received</T>
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  disabled={
                    checkoutSuccess?.paymentStatus !== "PAID" ||
                    Number(checkoutSuccess?.balanceDue || 0) > 0.01
                  }
                  onClick={async () => {
                    if (!checkoutSuccess) return;
                    const ok = await printAuthoritativeBill({
                      fallbackShopName: user?.shop?.shopName,
                      settings: billSettings,
                      invoiceNumber: checkoutSuccess.invoiceNumber,
                      customerName: checkoutSuccess.customerName,
                      customerPhone: checkoutSuccess.customerPhone,
                      totalAmount: checkoutSuccess.total,
                      paidAmount: checkoutSuccess.paidAmount ?? checkoutSuccess.total,
                      balanceDue: checkoutSuccess.balanceDue ?? 0,
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
                    const text = `Invoice ${checkoutSuccess?.invoiceNumber}\nTotal: ${currencySymbol} ${checkoutSuccess?.total?.toLocaleString()}\nStatus: ${checkoutSuccess?.paymentStatus === "PENDING" ? "Payment Pending" : "Paid"}\nThank you for your purchase!`;
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

        {/* Cashier Shift Modal */}
        <PosShiftModal
          open={shiftModalOpen}
          onOpenChange={setShiftModalOpen}
          mode={shiftModalMode}
          registerId={selectedRegisterId}
          registerName={registers.find((r) => r.id === selectedRegisterId)?.name || "Main Register"}
          currentShift={currentShift}
          currencySymbol={currencySymbol}
          onShiftUpdated={() => {
            loadCurrentShift(selectedRegisterId);
            loadRegisters();
          }}
        />

        {/* POS Return & Exchange Modal */}
        <PosReturnModal
          open={returnModalOpen}
          onOpenChange={setReturnModalOpen}
          currencySymbol={currencySymbol}
          onReturnCompleted={() => {
            loadCurrentShift(selectedRegisterId);
          }}
        />

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

        <ManagerPinDialog
          open={drawerPinOpen}
          onOpenChange={setDrawerPinOpen}
          title={t("Authorize cash drawer")}
          description="A manager PIN is required before the cash drawer can be opened."
          onVerified={async (managerPin) => {
            setDrawerPinOpen(false);
            await handleKickDrawer(managerPin);
          }}
        />

        <BarcodeScannerSheet
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={handleScannedCode}
          shopId={user?.shop?.id}
          hint={t("Scan a printed barcode or QR with the webcam, type a SKU, or use a USB or Bluetooth barcode or RFID gun.")}
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
