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
import { invoicesApi } from "@/lib/api";
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
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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
  issuedAt?: string;
  dueDate?: string;
  paidAt?: string;
  voidedAt?: string;
  notes?: string;
  terms?: string;
  createdAt: string;
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
  const t = useT();
  const invoiceId = params.id as string;
  const justCreated = searchParams.get("created") === "true";

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "other">("cash");
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreatedBanner, setShowCreatedBanner] = useState(justCreated);

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
  }, [invoiceId]);

  useEffect(() => {
    if (invoiceId) loadInvoice();
  }, [invoiceId, loadInvoice]);

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
        method: paymentMethod,
      });
      toast({
        title:
          paymentMethod === "cash"
            ? t("Cash Payment Recorded")
            : t("Payment Recorded"),
        description: `${invoice?.currency} ${amount.toLocaleString()} recorded`,
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
    window.print();
  };

  const formatCurrency = (amount: number) => {
    return `${invoice?.currency || currencySymbol} ${amount.toLocaleString()}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
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
                    setPaymentMethod("cash");
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
                      setPaymentMethod("cash");
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
                      setPaymentMethod("other");
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

          {/* Invoice Card (printable) */}
          <Card className="print:shadow-none print:border-0">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">
                    <T>INVOICE</T>
                  </CardTitle>
                  <CardDescription className="font-mono text-base mt-1">
                    {invoice.invoiceNumber}
                  </CardDescription>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  {invoice.issuedAt && (
                    <p>{t(`Issued: ${formatDate(invoice.issuedAt)}`)}</p>
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
                  <T>Bill To</T>
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
                      <T>Subtotal</T>
                    </span>
                    <span>{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  {invoice.taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>
                        {invoice.taxLabel ||
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
                      <T>Total</T>
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
                {paymentMethod === "cash" ? (
                  <Banknote className="h-5 w-5 text-green-600" />
                ) : (
                  <CreditCard className="h-5 w-5 text-green-600" />
                )}
                {paymentMethod === "cash"
                  ? t("Record Cash Payment")
                  : t("Record Payment")}
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
              {/* Payment method toggle */}
              <div>
                <Label className="text-xs mb-1.5 block">
                  <T>Payment Method</T>
                </Label>
                <div className="inline-flex h-9 rounded-full border bg-muted p-0.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`px-4 text-sm font-medium rounded-full transition-all flex items-center gap-1.5 ${
                      paymentMethod === "cash"
                        ? "bg-green-600 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Banknote className="h-3.5 w-3.5" /> <T>Cash</T>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("other")}
                    className={`px-4 text-sm font-medium rounded-full transition-all flex items-center gap-1.5 ${
                      paymentMethod === "other"
                        ? "bg-green-600 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <CreditCard className="h-3.5 w-3.5" /> <T>Other</T>
                  </button>
                </div>
              </div>
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
