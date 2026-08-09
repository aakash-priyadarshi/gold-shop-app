"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
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
  getCounterPaymentMethods,
  buildQrImageUrl,
  buildUpiPayUri,
  isDigitalWalletMethod,
  paymentMethodLabel,
} from "@/lib/counterPayments";
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
  Printer,
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
      .then((res) => setBillSettings(res.data))
      .catch(() => setBillSettings(null));
    shopsApi
      .getSettings()
      .then((res) => {
        const shop = res.data?.shop || res.data;
        const upi = shop?.bankAccountDetails?.upiId || "";
        setShopUpiId(typeof upi === "string" ? upi : "");
      })
      .catch(() => setShopUpiId(""));
  }, []);

  const upiQrUrl = useMemo(() => {
    if (!isDigitalWalletMethod(paymentMethod) || !shopUpiId || !invoice) {
      return null;
    }
    const amount = parseFloat(paymentAmount) || invoice.balanceDue || 0;
    const uri = buildUpiPayUri({
      upiId: shopUpiId,
      amount,
      currency: invoice.currency === "NPR" ? "INR" : invoice.currency || "INR",
      payeeName: billSettings?.shopNameOnBill || user?.shop?.shopName,
      note: `Invoice ${invoice.invoiceNumber}`,
      transactionRef: invoice.invoiceNumber,
    });
    return uri ? buildQrImageUrl(uri) : null;
  }, [
    paymentMethod,
    shopUpiId,
    invoice,
    paymentAmount,
    billSettings?.shopNameOnBill,
    user?.shop?.shopName,
  ]);

  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast({ variant: "destructive", title: t("Invalid amount") });
      return;
    }

    setIsSubmitting(true);
    try {
      await invoicesApi.updatePaymentStatus(invoiceId, {
        amount,
        paymentMethod,
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

  const handlePrint = () => {
    if (!invoice) return;
    const ok = printBill({
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
      lineItems: invoice.lineItems?.map((li) => ({
        label: li.label,
        quantity: li.quantity,
        amount: li.amount,
        details: li.details,
      })),
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount,
      taxLabel: invoice.taxLabel,
      discountAmount: invoice.discountAmount,
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      balanceDue: invoice.balanceDue,
      currency: invoice.currency || currencySymbol,
      paymentMethod: invoice.paymentMethod,
      notes: invoice.notes,
      watermark: shouldShowWatermark,
      verificationToken: invoice.verificationToken,
    });
    if (!ok) {
      toast({
        variant: "destructive",
        title: t("Pop-ups blocked"),
        description: t("Allow pop-ups to print the bill"),
      });
    }
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
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50 rounded-lg print:hidden">
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
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" /> <T>Print</T>
                </Button>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                    setPaymentMethod("CASH");
                    setPaymentAmount(String(invoice.balanceDue));
                    setPaymentDialogOpen(true);
                  }}
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
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" /> <T>Print</T>
              </Button>
              {invoice.status !== "PAID" && invoice.status !== "VOID" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-green-300 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-950/30"
                    onClick={() => {
                      setPaymentMethod("CASH");
                      setPaymentAmount(String(invoice.balanceDue));
                      setPaymentDialogOpen(true);
                    }}
                  >
                    <Banknote className="h-4 w-4 mr-2" /> <T>Pay Cash</T>
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setPaymentMethod("UPI");
                      setPaymentAmount(String(invoice.balanceDue));
                      setPaymentDialogOpen(true);
                    }}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />{" "}
                    <T>Record Payment</T>
                  </Button>
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
                    {invoice.supplierName || billSettings?.shopNameOnBill || user?.shop?.shopName || (
                      <T>INVOICE</T>
                    )}
                  </CardTitle>
                  {billSettings?.tagline && (
                    <p className="text-xs text-muted-foreground italic mt-0.5">
                      {billSettings.tagline}
                    </p>
                  )}
                  <CardDescription className="font-mono text-base mt-1">
                    {invoice.invoiceNumber}
                  </CardDescription>
                  {(invoice.supplierAddress || (billSettings?.showAddress !== false && billSettings?.shopAddress)) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {invoice.supplierAddress || billSettings?.shopAddress}
                    </p>
                  )}
                  {(billSettings?.showGstin !== false && (isLkTaxInvoice ? sellerLkTin : billSettings?.gstin)) && (
                    <p className="text-xs text-muted-foreground">
                      <T>{isLkTaxInvoice ? "Supplier TIN" : "Tax ID"}</T>: {isLkTaxInvoice ? sellerLkTin : billSettings?.gstin}
                    </p>
                  )}
                  {invoice.paymentMethod && (
                    <p className="text-xs mt-1">
                      <T>{isLkTaxInvoice ? "Mode of payment" : "Paid via"}</T>: {paymentMethodLabel(invoice.paymentMethod)}
                    </p>
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
            </CardContent>
          </Card>
        </div>

        {/* Record Payment Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {paymentMethod === "CASH" ? (
                  <Banknote className="h-5 w-5 text-green-600" />
                ) : (
                  <CreditCard className="h-5 w-5 text-green-600" />
                )}
                {t("Record Payment")}
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
              {isDigitalWalletMethod(paymentMethod) && (
                <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-center space-y-2">
                  {upiQrUrl ? (
                    <>
                      <p className="text-xs text-muted-foreground">
                        <T>Ask customer to scan UPI / PhonePe QR</T>
                      </p>
                      <Image
                        src={upiQrUrl}
                        alt="UPI QR"
                        className="mx-auto h-40 w-40 rounded bg-white p-2"
                        width={160}
                        height={160}
                        unoptimized
                      />
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {shopUpiId}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      <T>
                        Add your UPI ID in Shop Settings → Bank Details to show a
                        payment QR here.
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
              {/* Quick fill buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setPaymentAmount(String(invoice.balanceDue))}
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
                disabled={isSubmitting}
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
                {t(
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
