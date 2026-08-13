"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { InvoicePrintButton } from "@/components/shop/InvoicePrintButton";
import { InvoiceShareActions } from "@/components/shop/InvoiceShareActions";
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
import { Separator } from "@/components/ui/separator";
import { T } from "@/components/ui/T";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import { useAuth } from "@/hooks/useAuth";
import { invoicesApi, shopsApi } from "@/lib/api";
import { printBill, type BillSettings } from "@/lib/billPrint";
import {
  resolveBillShopAddress,
  resolveBillShopName,
  resolveBillShopPhone,
  unwrapInvoiceSettingsResponse,
} from "@/lib/invoiceBranding";
import {
  getCounterPaymentMethods,
  buildUpiPayUri,
  formatBankAccountDetails,
  formatPaymentSummary,
  hasBankTransferDetails,
  isDigitalWalletMethod,
  isUpiAmountAllowed,
  paymentMethodLabel,
  UPI_MAX_AMOUNT_INR,
  type CounterPaymentMethod,
  type ShopBankAccountDetails,
} from "@/lib/counterPayments";
import { toQrDataUrl, verifyBillUrl } from "@/lib/qrCode";
import { useT } from "@/providers/translation-provider";
import {
  ArrowLeft,
  Ban,
  Banknote,
  CheckCircle,
  CreditCard,
  DollarSign,
  FileText,
  Loader2,
  PartyPopper,
  Plus,
  Split,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

interface LineItem {
  label: string;
  category: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  details?: string;
}

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  shopId: string;
  orderId?: string;
  shopQuoteId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  lineItems: LineItem[];
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  taxLabel?: string;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  currency: string;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  issuedAt?: string;
  supplyDate?: string;
  dueDate?: string;
  paidAt?: string;
  voidedAt?: string;
  notes?: string;
  terms?: string;
  createdAt: string;
  customerTaxId?: string;
  customerType?: string;
  invoiceCountry?: string;
  placeOfSupply?: string;
  invoiceTitle?: string;
  supplierName?: string;
  supplierAddress?: string;
  supplierPhone?: string;
  supplierTaxId?: string;
  taxBreakdown?: any;
  verificationToken?: string;
  payments?: Array<{
    id: string;
    amount: number;
    currency: string;
    method: string;
    reference?: string | null;
    notes?: string | null;
    receivedAt?: string;
    createdAt?: string;
  }>;
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
  ISSUED: "bg-blue-100 text-blue-700 dark:text-blue-300",
  PAID: "bg-green-100 text-green-700 dark:text-green-300",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700 dark:text-amber-300",
  OVERDUE: "bg-red-100 text-red-700 dark:text-red-300",
  VOID: "bg-gray-200 text-gray-500 dark:text-gray-400",
  CANCELLED: "bg-red-100 text-red-500",
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { symbol: currencySymbol } = useShopCurrency();
  const { user } = useAuth();
  const t = useT();
  const invoiceId = params.id as string;
  const justCreated = searchParams.get("created") === "true";

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const shouldShowWatermark = useMemo(() => {
    if (!user || !user.shop || user.shop.isVerified) return false;
    if (invoice?.customerTaxId && invoice.customerTaxId.trim().length > 0) return false;
    return true;
  }, [user, invoice]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreatedBanner, setShowCreatedBanner] = useState(justCreated);
  const [billSettings, setBillSettings] = useState<BillSettings | null>(null);
  const [shopUpiId, setShopUpiId] = useState<string>("");
  const [shopBankDetails, setShopBankDetails] =
    useState<ShopBankAccountDetails | null>(null);
  const [verifyQrDataUrl, setVerifyQrDataUrl] = useState<string | null>(null);
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string | null>(null);
  const [splitMode, setSplitMode] = useState(false);
  const [splitLegs, setSplitLegs] = useState<
    Array<{ id: string; method: CounterPaymentMethod; amount: string }>
  >([]);

  const invoiceCountry = String(
    invoice?.invoiceCountry || invoice?.taxBreakdown?.country || "",
  ).toUpperCase();
  const sellerLkTin = String(
    invoice?.supplierTaxId ||
      invoice?.taxBreakdown?.sellerTaxId ||
      billSettings?.gstin ||
      "",
  ).trim();
  const purchaserLkTin = String(invoice?.customerTaxId || "").trim();
  const isLkTaxInvoice = Boolean(
    invoiceCountry === "LK" &&
      (invoice?.invoiceTitle === "TAX INVOICE" ||
        invoice?.taxBreakdown?.lkTaxInvoice === true) &&
      /^\d{9}$/.test(sellerLkTin) &&
      /^\d{9}$/.test(purchaserLkTin),
  );
  const isSriLankaInvoice = invoiceCountry === "LK";
  const availablePaymentMethods = useMemo(
    () => getCounterPaymentMethods(invoiceCountry || user?.shop?.country),
    [invoiceCountry, user?.shop?.country],
  );

  useEffect(() => {
    if (!availablePaymentMethods.some((m) => m.value === paymentMethod)) {
      setPaymentMethod(availablePaymentMethods[0]?.value || "CASH");
    }
  }, [availablePaymentMethods, paymentMethod]);

  const loadInvoice = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await invoicesApi.getById(invoiceId);
      setInvoice(response.data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("Failed to load invoice"),
        description: t("Could not fetch invoice details"),
      });
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId, t]);

  useEffect(() => {
    if (invoiceId) loadInvoice();
  }, [invoiceId, loadInvoice]);

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

  const upiPayUri = useMemo(() => {
    if (!isDigitalWalletMethod(paymentMethod) || !shopUpiId || !invoice) {
      return null;
    }
    const amount = parseFloat(paymentAmount) || invoice.balanceDue || 0;
    if (!isUpiAmountAllowed(amount, paymentMethod)) return null;
    return buildUpiPayUri({
      upiId: shopUpiId,
      amount,
      currency: invoice.currency === "NPR" ? "INR" : invoice.currency || "INR",
      payeeName: billSettings?.shopNameOnBill || user?.shop?.shopName,
      note: `Invoice ${invoice.invoiceNumber}`,
      transactionRef: invoice.invoiceNumber,
    });
  }, [
    paymentMethod,
    shopUpiId,
    invoice,
    paymentAmount,
    billSettings?.shopNameOnBill,
    user?.shop?.shopName,
  ]);

  const singlePaymentAmount = useMemo(() => {
    if (!invoice) return 0;
    return parseFloat(paymentAmount) || invoice.balanceDue || 0;
  }, [invoice, paymentAmount]);

  const upiOverLimit =
    !splitMode &&
    isDigitalWalletMethod(paymentMethod) &&
    singlePaymentAmount > UPI_MAX_AMOUNT_INR;

  const bankDetailLines = useMemo(
    () => formatBankAccountDetails(shopBankDetails),
    [shopBankDetails],
  );

  const paymentSummaryForPrint = useMemo(() => {
    if (!invoice?.payments?.length) {
      return invoice?.paymentMethod
        ? paymentMethodLabel(invoice.paymentMethod)
        : "";
    }
    return formatPaymentSummary(
      invoice.payments.map((p) => ({
        method: p.method,
        amount: Number(p.amount) || 0,
      })),
      invoice.currency,
    );
  }, [invoice]);

  const showBankOnPrint = useMemo(() => {
    if (!invoice) return false;
    if (invoice.paymentMethod === "BANK_TRANSFER") return true;
    return (invoice.payments || []).some(
      (p) => (p.method || "").toUpperCase() === "BANK_TRANSFER",
    );
  }, [invoice]);

  const initSplitLegs = useCallback(
    (balance: number) => {
      const defaultMethod = (availablePaymentMethods[0]?.value ||
        "CASH") as CounterPaymentMethod;
      const half = Math.round((balance / 2) * 100) / 100;
      const rest = Math.round((balance - half) * 100) / 100;
      setSplitLegs([
        {
          id: crypto.randomUUID(),
          method: defaultMethod,
          amount: String(half),
        },
        {
          id: crypto.randomUUID(),
          method:
            (availablePaymentMethods.find((m) => m.value === "CARD")?.value as
              | CounterPaymentMethod
              | undefined) || defaultMethod,
          amount: String(rest),
        },
      ]);
    },
    [availablePaymentMethods],
  );

  const openPaymentDialog = useCallback(
    (method: string, amount: number) => {
      const useMethod =
        isDigitalWalletMethod(method) && amount > UPI_MAX_AMOUNT_INR
          ? availablePaymentMethods.find((m) => m.value === "BANK_TRANSFER")
              ?.value ||
            availablePaymentMethods.find((m) => m.value === "CARD")?.value ||
            "CASH"
          : method;
      setSplitMode(false);
      setPaymentMethod(useMethod);
      setPaymentAmount(String(amount));
      setPaymentDialogOpen(true);
    },
    [availablePaymentMethods],
  );

  useEffect(() => {
    if (!invoice?.verificationToken) {
      setVerifyQrDataUrl(null);
      return;
    }
    let cancelled = false;
    toQrDataUrl(verifyBillUrl(invoice.verificationToken), 200).then((url) => {
      if (!cancelled) setVerifyQrDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [invoice?.verificationToken]);

  useEffect(() => {
    if (!upiPayUri) {
      setUpiQrDataUrl(null);
      return;
    }
    let cancelled = false;
    toQrDataUrl(upiPayUri, 220).then((url) => {
      if (!cancelled) setUpiQrDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [upiPayUri]);

  const shareBillInput = useMemo(() => {
    if (!invoice) return null;
    return {
      id: invoice.id,
      shopName: billSettings?.shopNameOnBill || user?.shop?.shopName,
      shopPhone: billSettings?.shopPhone,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      customerPhone: invoice.customerPhone,
      customerEmail: invoice.customerEmail,
      currency: invoice.currency || currencySymbol,
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount,
      taxLabel: invoice.taxLabel,
      discountAmount: invoice.discountAmount,
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      balanceDue: invoice.balanceDue,
      lineItems: invoice.lineItems,
      issuedAt: invoice.issuedAt || invoice.createdAt,
      verificationToken: invoice.verificationToken,
    };
  }, [invoice, billSettings, user?.shop?.shopName, currencySymbol]);

  const receiptPayload = useMemo(() => {
    if (!invoice) return null;
    return {
      shopName: billSettings?.shopNameOnBill || user?.shop?.shopName,
      invoiceNumber: invoice.invoiceNumber,
      issuedAt: invoice.issuedAt || invoice.createdAt,
      customerName: invoice.customerName,
      customerPhone: invoice.customerPhone,
      currency: invoice.currency || "NPR",
      lines: (invoice.lineItems || []).map((li) => ({
        label: li.label,
        qty: li.quantity ?? 1,
        amount: li.amount ?? 0,
      })),
      subtotal: invoice.subtotal,
      discount: invoice.discountAmount,
      taxAmount: invoice.taxAmount,
      taxLabel: invoice.taxLabel,
      total: invoice.totalAmount,
      paid: invoice.paidAmount,
      balance: invoice.balanceDue,
    };
  }, [invoice, billSettings?.shopNameOnBill, user?.shop?.shopName]);

  const handleRecordPayment = async () => {
    if (!invoice) return;

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
      if (sum > invoice.balanceDue + 0.009) {
        toast({
          variant: "destructive",
          title: t("Split total exceeds balance due"),
        });
        return;
      }

      for (const leg of legs) {
        if (!isUpiAmountAllowed(leg.amount, leg.method)) {
          toast({
            variant: "destructive",
            title: t("UPI amount too high"),
            description: t(
              `UPI / PhonePe cannot exceed ₹${UPI_MAX_AMOUNT_INR.toLocaleString()}. Use bank transfer, card, or split further.`,
            ),
          });
          return;
        }
      }

      setIsSubmitting(true);
      let recorded = 0;
      try {
        for (const leg of legs) {
          await invoicesApi.updatePaymentStatus(invoiceId, {
            amount: leg.amount,
            paymentMethod: leg.method,
            idempotencyKey: crypto.randomUUID(),
          });
          recorded += 1;
        }
        toast({
          title: t("Split payment recorded"),
          description: formatPaymentSummary(legs, invoice.currency),
        });
        setPaymentDialogOpen(false);
        setPaymentAmount("");
        setSplitMode(false);
        loadInvoice();
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: t("Partial payment recorded"),
          description:
            recorded > 0
              ? t(
                  `${recorded} of ${legs.length} parts saved. Reload and record the rest.`,
                )
              : error.response?.data?.message || t("Error"),
        });
        loadInvoice();
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast({ variant: "destructive", title: t("Invalid amount") });
      return;
    }
    if (!isUpiAmountAllowed(amount, paymentMethod)) {
      toast({
        variant: "destructive",
        title: t("UPI amount too high"),
        description: t(
          `UPI / PhonePe cannot exceed ₹${UPI_MAX_AMOUNT_INR.toLocaleString()}. Choose bank transfer, card, or split payment.`,
        ),
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await invoicesApi.updatePaymentStatus(invoiceId, {
        amount,
        paymentMethod,
        idempotencyKey: crypto.randomUUID(),
      });
      toast({
        title: t("Payment Recorded"),
        description: `${invoice?.currency} ${amount.toLocaleString()} via ${paymentMethodLabel(paymentMethod)}`,
      });
      setPaymentDialogOpen(false);
      setPaymentAmount("");
      loadInvoice();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("Failed"),
        description: error.response?.data?.message || t("Error"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoid = async () => {
    setIsSubmitting(true);
    try {
      await invoicesApi.void(invoiceId);
      toast({ title: t("Invoice Voided") });
      setVoidDialogOpen(false);
      loadInvoice();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("Failed"),
        description: error.response?.data?.message || t("Error"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = async () => {
    if (!invoice) return false;
    if (!invoice.verificationToken) {
      toast({
        variant: "destructive",
        title: t("Verification QR unavailable"),
        description: t(
          "This invoice has no verification token. Contact support if this persists.",
        ),
      });
    }
    const lines = invoice.lineItems || [];
    const wastageAmount = lines
      .filter((li) => /wastage|jarti/i.test(li.label || ""))
      .reduce((s, li) => s + (Number(li.amount) || 0), 0);
    const makingAmount = lines
      .filter(
        (li) =>
          String(li.category || "").toUpperCase() === "MAKING" ||
          /making/i.test(li.label || ""),
      )
      .reduce((s, li) => s + (Number(li.amount) || 0), 0);
    const tb = invoice.taxBreakdown || {};
    let verificationQrDataUrl = verifyQrDataUrl;
    if (invoice.verificationToken && !verificationQrDataUrl) {
      verificationQrDataUrl = await toQrDataUrl(
        verifyBillUrl(invoice.verificationToken),
        200,
      );
    }
    return printBill({
      fallbackShopName: user?.shop?.shopName,
      settings: billSettings,
      invoiceNumber: invoice.invoiceNumber,
      invoiceCountry,
      isTaxInvoice: isLkTaxInvoice,
      sellerTaxId: sellerLkTin,
      supplierName: invoice.supplierName,
      supplierAddress: invoice.supplierAddress,
      supplierPhone: invoice.supplierPhone,
      customerTaxId: invoice.customerTaxId,
      customerName: invoice.customerName,
      customerPhone: invoice.customerPhone,
      customerEmail: invoice.customerEmail,
      customerAddress: invoice.customerAddress,
      issuedAt: invoice.issuedAt || invoice.createdAt,
      supplyDate: invoice.supplyDate,
      placeOfSupply:
        invoice.placeOfSupply || invoice.taxBreakdown?.placeOfSupply,
      lineItems: lines.map((li) => ({
        label: li.label,
        quantity: li.quantity,
        amount: li.amount,
        details: li.details,
      })),
      subtotal: invoice.subtotal,
      makingAmount: makingAmount > 0 ? makingAmount : undefined,
      wastageAmount: wastageAmount > 0 ? wastageAmount : undefined,
      taxAmount: invoice.taxAmount,
      taxLabel: invoice.taxLabel,
      taxBreakdown: {
        metalTax: Number(tb.metalTax) || undefined,
        wastageTax: Number(tb.wastageTax) || undefined,
        makingTax: Number(tb.makingTax) || undefined,
        gemstoneTax: Number(tb.gemstoneTax) || undefined,
      },
      discountAmount: invoice.discountAmount,
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      balanceDue: invoice.balanceDue,
      currency: invoice.currency || currencySymbol,
      paymentMethod: invoice.paymentMethod,
      paymentSummary: paymentSummaryForPrint || undefined,
      bankAccountDetails:
        showBankOnPrint && hasBankTransferDetails(shopBankDetails)
          ? shopBankDetails
          : undefined,
      notes: invoice.notes,
      watermark: shouldShowWatermark,
      verificationToken: invoice.verificationToken,
      verificationQrDataUrl,
    });
  };

  const formatCurrency = (amount: number) => {
    const code = isSriLankaInvoice ? "LKR" : invoice?.currency || currencySymbol;
    return `${code} ${amount.toLocaleString(isSriLankaInvoice ? "en-LK" : undefined, {
      minimumFractionDigits: isSriLankaInvoice ? 2 : 0,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatLkDate = (dateStr?: string) => {
    if (!dateStr) return "";
    return new Intl.DateTimeFormat("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    }).format(new Date(dateStr));
  };

  if (isLoading) {
    return (
      <ShopGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DashboardLayout>
      </ShopGuard>
    );
  }

  if (!invoice) {
    return (
      <ShopGuard>
        <DashboardLayout>
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <h2 className="text-xl font-semibold">
              <T>Invoice Not Found</T>
            </h2>
            <Button onClick={() => router.back()} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" /> <T>Go Back</T>
            </Button>
          </div>
        </DashboardLayout>
      </ShopGuard>
    );
  }

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Success banner after creation */}
          {showCreatedBanner && invoice.status !== "PAID" && (
            <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50 rounded-lg print:hidden space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <PartyPopper className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-800 dark:text-green-200">
                      <T>Invoice Created Successfully!</T>
                    </p>
                    <p className="text-sm text-green-600">
                      <T>What would you like to do next?</T>
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <InvoicePrintButton
                    onSystemPrint={handlePrint}
                    receiptPayload={receiptPayload}
                  />
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() =>
                      openPaymentDialog("CASH", invoice.balanceDue)
                    }
                  >
                    <Banknote className="h-4 w-4 mr-2" /> <T>Pay Cash</T>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreatedBanner(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {shareBillInput && (
                <div className="pt-3 border-t border-green-200/60 dark:border-green-800/40">
                  <InvoiceShareActions
                    invoice={shareBillInput}
                  />
                </div>
              )}
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between print:hidden">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" /> <T>Back</T>
              </Button>
              <div>
                <h1 className="text-2xl font-bold">
                  Invoice {invoice.invoiceNumber}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    className={
                      statusColors[invoice.status] ||
                      "bg-gray-100 dark:bg-gray-800"
                    }
                  >
                    {invoice.status.replace(/_/g, " ")}
                  </Badge>
                  {invoice.paidAt && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      {t(`Paid ${formatDate(invoice.paidAt)}`)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <InvoicePrintButton
                onSystemPrint={handlePrint}
                receiptPayload={receiptPayload}
              />
              {invoice.status !== "VOID" && invoice.status !== "CANCELLED" && (
                <>
                  {invoice.status !== "PAID" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-300 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-950/30"
                        onClick={() =>
                          openPaymentDialog("CASH", invoice.balanceDue)
                        }
                      >
                        <Banknote className="h-4 w-4 mr-2" /> <T>Pay Cash</T>
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() =>
                          openPaymentDialog(
                            availablePaymentMethods.some((m) => m.value === "UPI")
                              ? "UPI"
                              : availablePaymentMethods[0]?.value || "CASH",
                            invoice.balanceDue,
                          )
                        }
                      >
                        <CreditCard className="h-4 w-4 mr-2" />{" "}
                        <T>Record Payment</T>
                      </Button>
                    </>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setVoidDialogOpen(true)}
                  >
                    <Ban className="h-4 w-4 mr-2" /> <T>Void</T>
                  </Button>
                </>
              )}
            </div>
          </div>

          {shareBillInput && (
            <div className="print:hidden">
              <InvoiceShareActions
                invoice={shareBillInput}
              />
            </div>
          )}

          {/* Sandbox warning banner */}
          {!user?.shop?.isVerified && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
              <div className="flex items-start gap-2.5">
                <span className="text-base">⚠️</span>
                <div>
                  <p className="font-semibold text-xs text-amber-800 dark:text-amber-300">
                    KYC Sandbox Mode Demo Receipt
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
                    This receipt will print with a repeated diagonal <span className="font-mono font-bold text-red-600">DEMO BILL - NOT FOR COMMERCIAL SALE</span> watermark. Submit business details in KYC or add the business's GSTIN/VAT/PAN tax number on the invoice to print standard water-free receipts.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-300 text-amber-800 dark:text-amber-300 hover:bg-amber-100/50 h-7 text-[10px] font-bold self-start sm:self-center shrink-0"
                onClick={() => router.push("/dashboard/shop/kyc")}
              >
                Verify KYC
              </Button>
            </div>
          )}

          {/* Invoice Card (printable) */}
          <Card className={`print:shadow-none print:border-0 ${shouldShowWatermark ? "sandbox-watermark-container" : ""}`}>
            {shouldShowWatermark && (
              <>
                <style dangerouslySetInnerHTML={{ __html: `
                  @media print {
                    .sandbox-watermark-container {
                      position: relative;
                    }
                    .sandbox-watermark-overlay {
                      position: absolute;
                      top: 0;
                      left: 0;
                      right: 0;
                      bottom: 0;
                      pointer-events: none;
                      z-index: 9999;
                      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='250' height='250' viewBox='0 0 250 250'><text fill='rgba(220, 38, 38, 0.12)' font-family='sans-serif' font-weight='bold' font-size='14' x='20' y='180' transform='rotate(-45 100 100)'>DEMO BILL - NOT FOR COMMERCIAL SALE</text></svg>");
                      background-repeat: repeat;
                      mix-blend-mode: multiply;
                    }
                  }
                ` }} />
                <div className="sandbox-watermark-overlay hidden print:block" />
              </>
            )}
            <CardHeader>
              {isSriLankaInvoice && (
                <div className="mb-5 text-center text-2xl font-black tracking-[0.16em] text-gray-950 dark:text-gray-50">
                  <T>{isLkTaxInvoice ? "TAX INVOICE" : "INVOICE / RECEIPT"}</T>
                </div>
              )}
              <div className="flex justify-between items-start">
                <div>
                  {isLkTaxInvoice && (
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <T>Supplier</T>
                    </p>
                  )}
                  {(billSettings?.shopLogoUrl && billSettings.showLogo !== false) && (
                    <Image
                      src={billSettings.shopLogoUrl}
                      alt="Shop logo"
                      className="h-12 w-auto object-contain mb-2"
                      width={192}
                      height={48}
                      unoptimized
                    />
                  )}
                  <CardTitle className="text-xl">
                    {resolveBillShopName(
                      billSettings,
                      invoice.supplierName,
                      user?.shop?.shopName,
                    ) || <T>INVOICE</T>}
                  </CardTitle>
                  {billSettings?.tagline && (
                    <p className="text-xs text-muted-foreground italic mt-0.5">
                      {billSettings.tagline}
                    </p>
                  )}
                  <CardDescription className="font-mono text-base mt-1">
                    {invoice.invoiceNumber}
                  </CardDescription>
                  {(billSettings?.showAddress !== false &&
                    resolveBillShopAddress(
                      billSettings,
                      invoice.supplierAddress,
                    )) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {resolveBillShopAddress(
                        billSettings,
                        invoice.supplierAddress,
                      )}
                    </p>
                  )}
                  {(billSettings?.showGstin !== false && (isLkTaxInvoice ? sellerLkTin : billSettings?.gstin)) && (
                    <p className="text-xs text-muted-foreground">
                      <T>{isLkTaxInvoice ? "Supplier TIN" : "Tax ID"}</T>: {isLkTaxInvoice ? sellerLkTin : billSettings?.gstin}
                    </p>
                  )}
                  {invoice.paymentMethod && (
                    <p className="text-xs mt-1">
                      <T>{isLkTaxInvoice ? "Mode of payment" : "Paid via"}</T>:{" "}
                      {paymentSummaryForPrint ||
                        paymentMethodLabel(invoice.paymentMethod)}
                    </p>
                  )}
                  {invoice.paymentMethod === "BANK_TRANSFER" &&
                    bankDetailLines.length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                        <p className="font-medium text-foreground">
                          <T>Bank transfer details</T>
                        </p>
                        {bankDetailLines.map((line) => (
                          <p key={line}>{line}</p>
                        ))}
                      </div>
                    )}
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  {invoice.issuedAt && (
                    <p>
                      <T>{isLkTaxInvoice ? "Invoice date" : "Issued"}</T>: {isLkTaxInvoice ? formatLkDate(invoice.issuedAt) : formatDate(invoice.issuedAt)}
                    </p>
                  )}
                  {isLkTaxInvoice && invoice.supplyDate && (
                    <p>
                      <T>Date of supply</T>: {formatLkDate(invoice.supplyDate)}
                    </p>
                  )}
                  {isLkTaxInvoice && (invoice.placeOfSupply || invoice.taxBreakdown?.placeOfSupply) && (
                    <p>
                      <T>Place of supply</T>: {invoice.placeOfSupply || invoice.taxBreakdown?.placeOfSupply}
                    </p>
                  )}
                  {invoice.dueDate && (
                    <p>{t(`Due: ${formatDate(invoice.dueDate)}`)}</p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Customer Info */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <Label className="text-xs text-muted-foreground">
                  <T>{isLkTaxInvoice ? "Purchaser" : "Bill To"}</T>
                </Label>
                <p className="font-semibold text-lg">{invoice.customerName}</p>
                {invoice.customerPhone && (
                  <p className="text-sm">{invoice.customerPhone}</p>
                )}
                {invoice.customerEmail && (
                  <p className="text-sm">{invoice.customerEmail}</p>
                )}
                {invoice.customerAddress && (
                  <p className="text-sm text-muted-foreground">
                    {invoice.customerAddress}
                  </p>
                )}
                {isLkTaxInvoice && (
                  <p className="text-sm font-medium">
                    <T>Purchaser TIN</T>: {purchaserLkTin}
                  </p>
                )}
              </div>

              {/* Line Items Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <T>Item</T>
                    </TableHead>
                    <TableHead className="text-center">
                      <T>Qty</T>
                    </TableHead>
                    <TableHead className="text-right">
                      <T>Unit Price</T>
                    </TableHead>
                    <TableHead className="text-right">
                      <T>Amount</T>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.lineItems.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.label}</p>
                          {item.details && (
                            <p className="text-xs text-muted-foreground">
                              {item.details}
                            </p>
                          )}
                          <Badge variant="outline" className="text-xs mt-1">
                            {item.category}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-72 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>
                      <T>{isLkTaxInvoice ? "Value excluding VAT" : "Subtotal"}</T>
                    </span>
                    <span>
                      {formatCurrency(
                        isLkTaxInvoice
                          ? Math.max(0, invoice.totalAmount - invoice.taxAmount)
                          : invoice.subtotal,
                      )}
                    </span>
                  </div>
                  {(() => {
                    const wastageAmt = (invoice.lineItems || [])
                      .filter((li) => /wastage|jarti/i.test(li.label || ""))
                      .reduce((s, li) => s + (Number(li.amount) || 0), 0);
                    const makingAmt = (invoice.lineItems || [])
                      .filter(
                        (li) =>
                          String(li.category || "").toUpperCase() === "MAKING" ||
                          /making/i.test(li.label || ""),
                      )
                      .reduce((s, li) => s + (Number(li.amount) || 0), 0);
                    return (
                      <>
                        {makingAmt > 0 && (
                          <div className="flex justify-between text-sm text-blue-600 dark:text-blue-400">
                            <span>
                              <T>Incl. making</T>
                            </span>
                            <span>{formatCurrency(makingAmt)}</span>
                          </div>
                        )}
                        {wastageAmt > 0 && (
                          <div className="flex justify-between text-sm text-amber-700 dark:text-amber-300">
                            <span>
                              <T>Incl. wastage</T>
                            </span>
                            <span>{formatCurrency(wastageAmt)}</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                  {invoice.taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>
                        {isLkTaxInvoice
                          ? "VAT"
                          : invoice.taxLabel ||
                            `Tax (${(invoice.taxRate * 100).toFixed(1)}%)`}
                      </span>
                      <span>{formatCurrency(invoice.taxAmount)}</span>
                    </div>
                  )}
                  {(invoice.taxBreakdown?.metalTax > 0 ||
                    invoice.taxBreakdown?.wastageTax > 0 ||
                    invoice.taxBreakdown?.makingTax > 0 ||
                    invoice.taxBreakdown?.gemstoneTax > 0) && (
                    <div className="pl-2 border-l-2 border-amber-100 dark:border-amber-900/40 space-y-0.5 text-[11px] text-muted-foreground">
                      {invoice.taxBreakdown?.metalTax > 0 && (
                        <div className="flex justify-between">
                          <span>
                            <T>Metal tax</T>
                          </span>
                          <span>
                            {formatCurrency(invoice.taxBreakdown.metalTax)}
                          </span>
                        </div>
                      )}
                      {invoice.taxBreakdown?.wastageTax > 0 && (
                        <div className="flex justify-between">
                          <span>
                            <T>Wastage tax</T>
                          </span>
                          <span>
                            {formatCurrency(invoice.taxBreakdown.wastageTax)}
                          </span>
                        </div>
                      )}
                      {invoice.taxBreakdown?.makingTax > 0 && (
                        <div className="flex justify-between">
                          <span>
                            <T>Making tax</T>
                          </span>
                          <span>
                            {formatCurrency(invoice.taxBreakdown.makingTax)}
                          </span>
                        </div>
                      )}
                      {invoice.taxBreakdown?.gemstoneTax > 0 && (
                        <div className="flex justify-between">
                          <span>
                            <T>Gemstone tax</T>
                          </span>
                          <span>
                            {formatCurrency(invoice.taxBreakdown.gemstoneTax)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {invoice.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>
                        <T>Discount</T>
                      </span>
                      <span>-{formatCurrency(invoice.discountAmount)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>
                      <T>{isLkTaxInvoice ? "Total including VAT" : "Total"}</T>
                    </span>
                    <span>{formatCurrency(invoice.totalAmount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm text-green-600">
                    <span>
                      <T>Paid</T>
                    </span>
                    <span>{formatCurrency(invoice.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span
                      className={
                        invoice.balanceDue > 0
                          ? "text-red-600"
                          : "text-green-600"
                      }
                    >
                      <T>Balance Due</T>
                    </span>
                    <span
                      className={
                        invoice.balanceDue > 0
                          ? "text-red-600"
                          : "text-green-600"
                      }
                    >
                      {formatCurrency(invoice.balanceDue)}
                    </span>
                  </div>
                  {invoice.payments && invoice.payments.length > 0 && (
                    <div className="pt-2 space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        <T>Payment history</T>
                      </p>
                      {invoice.payments.map((p) => (
                        <div
                          key={p.id}
                          className="flex justify-between text-xs gap-3"
                        >
                          <span className="text-muted-foreground">
                            {paymentMethodLabel(p.method)}
                            {p.receivedAt
                              ? ` · ${formatDate(p.receivedAt)}`
                              : ""}
                          </span>
                          <span className="font-medium shrink-0">
                            {formatCurrency(Number(p.amount) || 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Orivraa Partners Mock Insurance Shield */}
              {invoice.taxBreakdown?.isMockInsured && (
                <>
                  <Separator />
                  <div className="p-4 border border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl flex items-center gap-4 text-emerald-800 dark:text-emerald-300">
                    <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-xl shadow-sm flex-shrink-0">
                      🛡️
                    </div>
                    <div>
                      <h4 className="font-bold text-sm tracking-wide flex items-center gap-1.5 uppercase">
                        Insured by Orivraa Partners
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 animate-pulse">
                          SECURE
                        </span>
                      </h4>
                      <p className="text-xs text-emerald-600/90 dark:text-emerald-400/90 leading-normal mt-0.5">
                        This jewelry purchase is covered against accidental damage, burglary, and theft for 12 months. Certificate Reference: <span className="font-mono">{invoice.invoiceNumber}-INS</span>.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Notes & Terms */}
              {(invoice.notes || invoice.terms) && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {invoice.notes && (
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          <T>Notes</T>
                        </Label>
                        <p className="mt-1">{invoice.notes}</p>
                      </div>
                    )}
                    {invoice.terms && (
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          <T>Terms</T>
                        </Label>
                        <p className="mt-1">{invoice.terms}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Bill verification QR */}
              {invoice.verificationToken && (
                <>
                  <Separator />
                  <div className="flex flex-col items-center gap-2 py-4 text-center">
                    {verifyQrDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={verifyQrDataUrl}
                        alt="Verify bill QR"
                        className="h-36 w-36 rounded bg-white p-2 border"
                      />
                    ) : (
                      <div className="h-36 w-36 flex items-center justify-center rounded border bg-muted/40">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground max-w-xs">
                      <T>Scan to verify this bill is genuine on Orivraa</T>
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Record Payment Dialog */}
        <Dialog
          open={paymentDialogOpen}
          onOpenChange={(open) => {
            setPaymentDialogOpen(open);
            if (!open) setSplitMode(false);
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {splitMode ? (
                  <Split className="h-5 w-5 text-green-600" />
                ) : paymentMethod === "CASH" ? (
                  <Banknote className="h-5 w-5 text-green-600" />
                ) : (
                  <CreditCard className="h-5 w-5 text-green-600" />
                )}
                {t(splitMode ? "Split Payment" : "Record Payment")}
              </DialogTitle>
              <DialogDescription>
                {t(`Record a payment for invoice ${invoice.invoiceNumber}`)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-sm">
                <div className="flex justify-between">
                  <span>
                    <T>Total Due</T>
                  </span>
                  <span className="font-bold">
                    {formatCurrency(invoice.balanceDue)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">
                  <T>Split across methods</T>
                </Label>
                <Button
                  type="button"
                  variant={splitMode ? "default" : "outline"}
                  size="sm"
                  className={
                    splitMode
                      ? "bg-green-600 hover:bg-green-700 h-8 text-xs"
                      : "h-8 text-xs"
                  }
                  onClick={() => {
                    if (!splitMode) {
                      initSplitLegs(invoice.balanceDue);
                      setSplitMode(true);
                    } else {
                      setSplitMode(false);
                    }
                  }}
                >
                  <Split className="h-3.5 w-3.5 mr-1.5" />
                  {splitMode ? <T>Single method</T> : <T>Split payment</T>}
                </Button>
              </div>

              {!splitMode ? (
                <>
                  <div>
                    <Label className="text-xs mb-1.5 block">
                      <T>Payment Method</T>
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {availablePaymentMethods.map((pm) => (
                        <button
                          key={pm.value}
                          type="button"
                          onClick={() => setPaymentMethod(pm.value)}
                          className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all ${
                            paymentMethod === pm.value
                              ? "bg-green-600 text-white border-green-600 shadow-sm"
                              : "bg-muted/50 border-muted-foreground/20 hover:border-green-500/50"
                          }`}
                        >
                          {pm.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {upiOverLimit && (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-100 space-y-1">
                      <p className="font-semibold">
                        <T>UPI limit exceeded</T>
                      </p>
                      <p>
                        <T>
                          UPI / PhonePe cannot collect more than ₹1,00,000 in one
                          QR. Use bank transfer, card, cash, or split the payment.
                        </T>
                      </p>
                    </div>
                  )}

                  {isDigitalWalletMethod(paymentMethod) && !upiOverLimit && (
                    <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-center space-y-2">
                      {upiQrDataUrl ? (
                        <>
                          <p className="text-xs text-muted-foreground">
                            <T>Ask customer to scan UPI / PhonePe QR</T>
                          </p>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={upiQrDataUrl}
                            alt="UPI QR"
                            className="mx-auto h-40 w-40 rounded bg-white p-2"
                            width={160}
                            height={160}
                          />
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {shopUpiId}
                          </p>
                        </>
                      ) : shopUpiId ? (
                        <div className="flex justify-center py-6">
                          <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
                        </div>
                      ) : (
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          <T>
                            Add your UPI ID in Shop Settings → Bank Details to
                            show a payment QR here.
                          </T>
                        </p>
                      )}
                    </div>
                  )}

                  {paymentMethod === "BANK_TRANSFER" && (
                    <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1">
                      <p className="font-semibold text-sm">
                        <T>Bank transfer details</T>
                      </p>
                      {bankDetailLines.length > 0 ? (
                        bankDetailLines.map((line) => (
                          <p key={line} className="text-muted-foreground">
                            {line}
                          </p>
                        ))
                      ) : (
                        <p className="text-muted-foreground">
                          <T>
                            Add bank account details in Shop Settings so they
                            appear here and on the printed receipt.
                          </T>
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <Label>{t(`Payment Amount (${invoice.currency})`)}</Label>
                    <Input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() =>
                        setPaymentAmount(String(invoice.balanceDue))
                      }
                    >
                      <T>Full Amount</T>
                    </Button>
                    {invoice.balanceDue > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() =>
                          setPaymentAmount(
                            String(Math.round(invoice.balanceDue / 2)),
                          )
                        }
                      >
                        <T>Half</T>
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  {splitLegs.map((leg, index) => (
                    <div
                      key={leg.id}
                      className="rounded-lg border p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium">
                          <T>Part</T> {index + 1}
                        </p>
                        {splitLegs.length > 2 && (
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-red-600"
                            onClick={() =>
                              setSplitLegs((prev) =>
                                prev.filter((l) => l.id !== leg.id),
                              )
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {availablePaymentMethods.map((pm) => (
                          <button
                            key={pm.value}
                            type="button"
                            onClick={() =>
                              setSplitLegs((prev) =>
                                prev.map((l) =>
                                  l.id === leg.id
                                    ? {
                                        ...l,
                                        method:
                                          pm.value as CounterPaymentMethod,
                                      }
                                    : l,
                                ),
                              )
                            }
                            className={`px-1.5 py-1.5 rounded text-[10px] font-medium border ${
                              leg.method === pm.value
                                ? "bg-green-600 text-white border-green-600"
                                : "bg-muted/50 border-muted-foreground/20"
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
                              l.id === leg.id
                                ? { ...l, amount: e.target.value }
                                : l,
                            ),
                          )
                        }
                        placeholder="0"
                      />
                      {isDigitalWalletMethod(leg.method) &&
                        parseFloat(leg.amount) > UPI_MAX_AMOUNT_INR && (
                          <p className="text-[10px] text-amber-700">
                            <T>
                              This UPI part exceeds ₹1,00,000 — lower the amount
                              or change method.
                            </T>
                          </p>
                        )}
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() =>
                        setSplitLegs((prev) => [
                          ...prev,
                          {
                            id: crypto.randomUUID(),
                            method: (availablePaymentMethods[0]?.value ||
                              "CASH") as CounterPaymentMethod,
                            amount: "0",
                          },
                        ])
                      }
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      <T>Add part</T>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => initSplitLegs(invoice.balanceDue)}
                    >
                      <T>50 / 50</T>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <T>Parts total</T>:{" "}
                    {formatCurrency(
                      splitLegs.reduce(
                        (s, l) => s + (parseFloat(l.amount) || 0),
                        0,
                      ),
                    )}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setPaymentDialogOpen(false)}
              >
                <T>Cancel</T>
              </Button>
              <Button
                onClick={handleRecordPayment}
                disabled={isSubmitting || (!splitMode && upiOverLimit)}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <DollarSign className="h-4 w-4 mr-2" />
                )}
                <T>Record Payment</T>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Void Dialog */}
        <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Ban className="h-5 w-5" />
                <T>Void Invoice</T>
              </DialogTitle>
              <DialogDescription>
                {invoice.paidAmount > 0
                  ? t(
                      `This will void invoice ${invoice.invoiceNumber}, reverse ${invoice.currency} ${Number(invoice.paidAmount).toLocaleString()} in payments in the ledger, and restore any linked stock. This cannot be undone.`,
                    )
                  : t(
                      `This will void invoice ${invoice.invoiceNumber}. This action cannot be undone.`,
                    )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setVoidDialogOpen(false)}
              >
                <T>Cancel</T>
              </Button>
              <Button
                variant="destructive"
                onClick={handleVoid}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Ban className="h-4 w-4 mr-2" />
                )}
                <T>Void Invoice</T>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ShopGuard>
  );
}
