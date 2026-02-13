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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { invoicesApi } from "@/lib/api";
import {
  ArrowLeft,
  Ban,
  CheckCircle,
  CreditCard,
  DollarSign,
  FileText,
  Loader2,
  Printer,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
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
  DRAFT: "bg-gray-100 text-gray-700",
  ISSUED: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  OVERDUE: "bg-red-100 text-red-700",
  VOID: "bg-gray-200 text-gray-500",
  CANCELLED: "bg-red-100 text-red-500",
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadInvoice = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await invoicesApi.getById(invoiceId);
      setInvoice(response.data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to load invoice",
        description: "Could not fetch invoice details",
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
      toast({ variant: "destructive", title: "Invalid amount" });
      return;
    }

    setIsSubmitting(true);
    try {
      await invoicesApi.updatePaymentStatus(invoiceId, { amount });
      toast({
        title: "Payment Recorded",
        description: `${invoice?.currency} ${amount.toLocaleString()} recorded`,
      });
      setPaymentDialogOpen(false);
      setPaymentAmount("");
      loadInvoice();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed",
        description: error.response?.data?.message || "Error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoid = async () => {
    setIsSubmitting(true);
    try {
      await invoicesApi.void(invoiceId);
      toast({ title: "Invoice Voided" });
      setVoidDialogOpen(false);
      loadInvoice();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed",
        description: error.response?.data?.message || "Error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount: number) => {
    return `${invoice?.currency || "NPR"} ${amount.toLocaleString()}`;
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
            <h2 className="text-xl font-semibold">Invoice Not Found</h2>
            <Button onClick={() => router.back()} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
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
          {/* Header */}
          <div className="flex items-center justify-between print:hidden">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">
                  Invoice {invoice.invoiceNumber}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    className={statusColors[invoice.status] || "bg-gray-100"}
                  >
                    {invoice.status.replace(/_/g, " ")}
                  </Badge>
                  {invoice.paidAt && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Paid {formatDate(invoice.paidAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" /> Print
              </Button>
              {invoice.status !== "PAID" && invoice.status !== "VOID" && (
                <>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setPaymentAmount(String(invoice.balanceDue));
                      setPaymentDialogOpen(true);
                    }}
                  >
                    <CreditCard className="h-4 w-4 mr-2" /> Record Payment
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setVoidDialogOpen(true)}
                  >
                    <Ban className="h-4 w-4 mr-2" /> Void
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
                  <CardTitle className="text-xl">INVOICE</CardTitle>
                  <CardDescription className="font-mono text-base mt-1">
                    {invoice.invoiceNumber}
                  </CardDescription>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  {invoice.issuedAt && (
                    <p>Issued: {formatDate(invoice.issuedAt)}</p>
                  )}
                  {invoice.dueDate && <p>Due: {formatDate(invoice.dueDate)}</p>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Customer Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <Label className="text-xs text-muted-foreground">Bill To</Label>
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
                    <TableHead>Item</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
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
                    <span>Subtotal</span>
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
                      <span>Discount</span>
                      <span>-{formatCurrency(invoice.discountAmount)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>{formatCurrency(invoice.totalAmount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Paid</span>
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
                      Balance Due
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
                          Notes
                        </Label>
                        <p className="mt-1">{invoice.notes}</p>
                      </div>
                    )}
                    {invoice.terms && (
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Terms
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
                <CreditCard className="h-5 w-5 text-green-600" />
                Record Payment
              </DialogTitle>
              <DialogDescription>
                Record a payment for invoice {invoice.invoiceNumber}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <div className="flex justify-between">
                  <span>Total Due</span>
                  <span className="font-bold">
                    {formatCurrency(invoice.balanceDue)}
                  </span>
                </div>
              </div>
              <div>
                <Label>Payment Amount ({invoice.currency})</Label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setPaymentDialogOpen(false)}
              >
                Cancel
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
                Record Payment
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
                Void Invoice
              </DialogTitle>
              <DialogDescription>
                This will void invoice {invoice.invoiceNumber}. This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setVoidDialogOpen(false)}
              >
                Cancel
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
                Void Invoice
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ShopGuard>
  );
}
