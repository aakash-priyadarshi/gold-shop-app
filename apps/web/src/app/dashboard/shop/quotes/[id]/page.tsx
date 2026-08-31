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
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import { shopQuotesApi } from "@/lib/api";
import {
  ArrowLeft,
  Banknote,
  CheckCircle,
  Loader2,
  Phone,
  Receipt,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface WalkInCustomer {
  id: string;
  name: string;
  phone?: string | null;
  phoneCountryCode?: string | null;
  email?: string | null;
  city?: string | null;
}

interface ShopQuote {
  id: string;
  quoteNumber: string;
  invoiceNumber?: string | null;
  jewelleryType?: string;
  buildMethod?: string;
  targetTotalWeightG?: number | null;
  metalCostNpr?: number | null;
  makingChargeNpr?: number | null;
  gemstoneCostNpr?: number;
  finishCostNpr?: number;
  taxNpr?: number;
  totalPriceNpr?: number | null;
  advancePaidNpr?: number;
  balanceDueNpr?: number | null;
  /** Billing wastage % set at Mark Ready (built). null until then. */
  wastagePercent?: number | null;
  status: string;
  specialInstructions?: string | null;
  shopNotes?: string | null;
  createdAt: string;
  invoicedAt?: string | null;
  walkInCustomer: WalkInCustomer;
}

const STATUS_COLORS: Record<string, string> = {
  QUOTED: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-purple-100 text-purple-700",
  IN_PROGRESS: "bg-orange-100 text-orange-700",
  READY: "bg-cyan-100 text-cyan-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const NEXT_STATUS: Record<string, string> = {
  QUOTED: "CONFIRMED",
  CONFIRMED: "IN_PROGRESS",
  IN_PROGRESS: "READY",
  READY: "COMPLETED",
};

const STATUS_LABELS: Record<string, string> = {
  QUOTED: "Confirm Order",
  CONFIRMED: "Start Production",
  IN_PROGRESS: "Mark Ready",
  READY: "Mark Delivered",
};

export default function QuoteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const quoteId = params?.id;
  const { format: formatCurrency } = useShopCurrency();

  const [quote, setQuote] = useState<ShopQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [readyDialogOpen, setReadyDialogOpen] = useState(false);
  const [readyWastagePercent, setReadyWastagePercent] = useState("0");
  const [editWastagePercent, setEditWastagePercent] = useState("");

  const load = useCallback(async () => {
    if (!quoteId) return;
    setLoading(true);
    try {
      const res = await shopQuotesApi.getById(quoteId);
      const data = res.data?.data ?? res.data;
      setQuote(data);
      if (data?.wastagePercent != null) {
        setEditWastagePercent(String(data.wastagePercent));
      } else {
        setEditWastagePercent("0");
      }
    } catch {
      setQuote(null);
      toast({ variant: "destructive", title: "Failed to load quote" });
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    void load();
  }, [load]);

  const advanceStatus = async (
    next: string,
    extras?: { wastagePercent?: number },
  ) => {
    if (!quote) return;
    setSubmitting(true);
    try {
      await shopQuotesApi.updateStatus(quote.id, {
        status: next,
        ...extras,
      });
      toast({ title: "Status updated" });
      setReadyDialogOpen(false);
      await load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Could not update status";
      toast({ variant: "destructive", title: "Failed", description: message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusAdvance = async () => {
    if (!quote) return;
    const next = NEXT_STATUS[quote.status];
    if (!next) return;
    if (next === "COMPLETED" && (quote.balanceDueNpr ?? 0) > 0) {
      toast({
        variant: "destructive",
        title: "Balance due",
        description:
          "Record the remaining payment or create an invoice before marking delivered.",
        reportToAdmin: false,
      });
      return;
    }
    if (next === "READY") {
      setReadyWastagePercent(
        quote.wastagePercent != null ? String(quote.wastagePercent) : "0",
      );
      setReadyDialogOpen(true);
      return;
    }
    await advanceStatus(next);
  };

  const handleConfirmReady = async () => {
    const pct = parseFloat(readyWastagePercent);
    if (!Number.isFinite(pct) || pct < 0) {
      toast({
        variant: "destructive",
        title: "Enter a valid wastage % (0 or more)",
      });
      return;
    }
    await advanceStatus("READY", { wastagePercent: pct });
  };

  const handleSaveWastage = async () => {
    if (!quote) return;
    const pct = parseFloat(editWastagePercent);
    if (!Number.isFinite(pct) || pct < 0) {
      toast({
        variant: "destructive",
        title: "Enter a valid wastage % (0 or more)",
      });
      return;
    }
    setSubmitting(true);
    try {
      await shopQuotesApi.update(quote.id, { wastagePercent: pct });
      toast({ title: "Wastage updated" });
      await load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Could not update wastage";
      toast({ variant: "destructive", title: "Failed", description: message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordAdvance = async () => {
    if (!quote) return;
    const amount = parseFloat(advanceAmount);
    if (!amount || amount <= 0) {
      toast({ variant: "destructive", title: "Enter a valid amount" });
      return;
    }
    setSubmitting(true);
    try {
      await shopQuotesApi.recordPayment(quote.id, {
        amountNpr: amount,
        notes: "Advance recorded from desktop quote detail",
      });
      toast({ title: "Payment recorded" });
      setAdvanceAmount("");
      await load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Could not record payment";
      toast({ variant: "destructive", title: "Failed", description: message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!quote) return;
    setSubmitting(true);
    try {
      const res = await shopQuotesApi.convertToInvoice(quote.id);
      const invoiceId = res.data?.invoiceId ?? res.data?.invoice?.id;
      toast({
        title: "Invoice created",
        description: res.data?.invoiceNumber
          ? `Invoice ${res.data.invoiceNumber}`
          : undefined,
      });
      if (invoiceId) {
        router.push(`/dashboard/shop/invoices/${invoiceId}`);
      } else {
        await load();
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Could not create invoice";
      toast({ variant: "destructive", title: "Failed", description: message });
    } finally {
      setSubmitting(false);
    }
  };

  const customerPhone = quote?.walkInCustomer?.phone
    ? `${quote.walkInCustomer.phoneCountryCode || ""}${quote.walkInCustomer.phone}`
    : null;

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6 max-w-3xl mx-auto p-4 md:p-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/shop/quotes">
                <ArrowLeft className="h-4 w-4 mr-2" />
                <T>Back</T>
              </Link>
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold truncate">
                {quote?.quoteNumber ?? <T>Quote</T>}
              </h1>
              {quote && (
                <p className="text-sm text-muted-foreground">
                  {quote.jewelleryType?.replace(/_/g, " ")}
                  {quote.targetTotalWeightG
                    ? ` · ${quote.targetTotalWeightG}g`
                    : ""}
                </p>
              )}
            </div>
            {quote && (
              <Badge
                className={
                  STATUS_COLORS[quote.status] ?? "bg-gray-100 text-gray-700"
                }
              >
                {quote.status.replace(/_/g, " ")}
              </Badge>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : !quote ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <T>Quote not found</T>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <T>Customer</T>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="font-medium">{quote.walkInCustomer.name}</p>
                  {customerPhone && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {customerPhone}
                    </p>
                  )}
                  {quote.walkInCustomer.email && (
                    <p className="text-muted-foreground">
                      {quote.walkInCustomer.email}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    <T>Pricing</T>
                  </CardTitle>
                  <CardDescription>
                    <T>Amounts from walk-in quote estimate</T>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {quote.metalCostNpr != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        <T>Metal</T>
                      </span>
                      <span>{formatCurrency(quote.metalCostNpr)}</span>
                    </div>
                  )}
                  {quote.makingChargeNpr != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        <T>Making</T>
                      </span>
                      <span>{formatCurrency(quote.makingChargeNpr)}</span>
                    </div>
                  )}
                  {(quote.gemstoneCostNpr ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        <T>Gemstone</T>
                      </span>
                      <span>{formatCurrency(quote.gemstoneCostNpr!)}</span>
                    </div>
                  )}
                  {quote.wastagePercent != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        <T>Wastage (from ready)</T>
                      </span>
                      <span>{quote.wastagePercent}%</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <span>
                      <T>Total</T>
                    </span>
                    <span>
                      {quote.totalPriceNpr != null
                        ? formatCurrency(quote.totalPriceNpr)
                        : "—"}
                    </span>
                  </div>
                  {(quote.advancePaidNpr ?? 0) > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span>
                        <T>Advance paid</T>
                      </span>
                      <span>{formatCurrency(quote.advancePaidNpr!)}</span>
                    </div>
                  )}
                  {(quote.balanceDueNpr ?? 0) > 0 && (
                    <div className="flex justify-between text-amber-700">
                      <span>
                        <T>Balance due</T>
                      </span>
                      <span>{formatCurrency(quote.balanceDueNpr!)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {(quote.status === "READY" || quote.status === "IN_PROGRESS") &&
                !quote.invoiceNumber && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        <T>Billing wastage</T>
                      </CardTitle>
                      <CardDescription>
                        <T>
                          Set when the piece is built / marked ready. Carried to
                          the final invoice (0 is allowed).
                        </T>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row gap-2 items-end">
                      <div className="flex-1 space-y-2 w-full">
                        <Label htmlFor="edit-wastage">
                          <T>Wastage %</T>
                        </Label>
                        <Input
                          id="edit-wastage"
                          type="number"
                          min={0}
                          max={50}
                          step={0.5}
                          value={editWastagePercent}
                          onChange={(e) =>
                            setEditWastagePercent(e.target.value)
                          }
                        />
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleSaveWastage}
                        disabled={submitting}
                      >
                        <T>Save wastage</T>
                      </Button>
                    </CardContent>
                  </Card>
                )}

              {quote.specialInstructions && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      <T>Instructions</T>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm whitespace-pre-wrap">
                    {quote.specialInstructions}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    <T>Actions</T>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {quote.status === "READY" &&
                    (quote.balanceDueNpr ?? 0) > 0 && (
                      <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-lg px-3 py-2">
                        <T>
                          Balance is still due. Record the payment below or
                          create an invoice before marking delivered.
                        </T>
                      </p>
                    )}
                  {NEXT_STATUS[quote.status] && quote.status !== "CANCELLED" && (
                    <Button
                      onClick={handleStatusAdvance}
                      disabled={
                        submitting ||
                        (quote.status === "READY" &&
                          (quote.balanceDueNpr ?? 0) > 0 &&
                          NEXT_STATUS[quote.status] === "COMPLETED")
                      }
                      className="w-full sm:w-auto"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      <T>{STATUS_LABELS[quote.status] ?? "Advance status"}</T>
                    </Button>
                  )}

                  {!quote.invoiceNumber && quote.status !== "CANCELLED" && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="advance">
                          <T>Record advance (optional)</T>
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="advance"
                            type="number"
                            min="0"
                            placeholder="Amount"
                            value={advanceAmount}
                            onChange={(e) => setAdvanceAmount(e.target.value)}
                          />
                          <Button
                            variant="outline"
                            onClick={handleRecordAdvance}
                            disabled={submitting || !advanceAmount}
                          >
                            <Banknote className="h-4 w-4 mr-2" />
                            <T>Record</T>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {!quote.invoiceNumber && quote.status !== "CANCELLED" ? (
                    <Button
                      onClick={handleConvertToInvoice}
                      disabled={submitting}
                      className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Receipt className="h-4 w-4 mr-2" />
                      )}
                      <T>Create Invoice</T>
                    </Button>
                  ) : quote.invoiceNumber ? (
                    <p className="text-sm text-green-700 flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      <T>Invoiced as</T> {quote.invoiceNumber}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <Dialog open={readyDialogOpen} onOpenChange={setReadyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                <T>Mark ready — billing wastage</T>
              </DialogTitle>
              <DialogDescription>
                <T>
                  Enter the wastage % for this built piece. It will be applied
                  on the final invoice. Use 0 if there is no wastage.
                </T>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="ready-wastage">
                <T>Wastage %</T>
              </Label>
              <Input
                id="ready-wastage"
                type="number"
                min={0}
                max={50}
                step={0.5}
                value={readyWastagePercent}
                onChange={(e) => setReadyWastagePercent(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setReadyDialogOpen(false)}
                disabled={submitting}
              >
                <T>Cancel</T>
              </Button>
              <Button onClick={handleConfirmReady} disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                <T>Mark Ready</T>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ShopGuard>
  );
}
