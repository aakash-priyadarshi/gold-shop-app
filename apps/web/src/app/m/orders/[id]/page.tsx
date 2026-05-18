"use client";

import { MobileFeatureGate } from "@/components/mobile/MobileFeatureGate";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { shopQuotesApi } from "@/lib/api";
import {
  formatCurrencyAmount,
  getCurrencyForCountry,
  type SupportedCurrencyCode,
} from "@/lib/currency";
import { ArrowLeft, Banknote, Check, CreditCard, Loader2, Receipt } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface WalkInCustomer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
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
  paidInFullAt?: string | null;
  status: string;
  specialInstructions?: string | null;
  shopNotes?: string | null;
  createdAt: string;
  invoicedAt?: string | null;
  walkInCustomer: WalkInCustomer;
  shop?: { shopName?: string };
}

function quotePaymentStatus(q: ShopQuote) {
  const balance = q.balanceDueNpr ?? 0;
  if (q.invoiceNumber && balance <= 0) return { label: "Paid in Full", color: "text-green-700", bg: "bg-green-100" };
  if (q.invoiceNumber && balance > 0) return { label: "Partial Payment", color: "text-amber-700", bg: "bg-amber-100" };
  const map: Record<string, { label: string; color: string; bg: string }> = {
    QUOTED:      { label: "Quote Sent",   color: "text-blue-700",   bg: "bg-blue-100" },
    CONFIRMED:   { label: "Confirmed",    color: "text-purple-700", bg: "bg-purple-100" },
    IN_PROGRESS: { label: "In Progress",  color: "text-orange-700", bg: "bg-orange-100" },
    READY:       { label: "Ready",        color: "text-cyan-700",   bg: "bg-cyan-100" },
    COMPLETED:   { label: "Completed",    color: "text-green-700",  bg: "bg-green-100" },
    CANCELLED:   { label: "Cancelled",    color: "text-red-600",    bg: "bg-red-100" },
  };
  return map[q.status?.toUpperCase()] ?? { label: q.status, color: "text-gray-600", bg: "bg-gray-100" };
}

export default function MobileOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [quote, setQuote] = useState<ShopQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payRemainingOpen, setPayRemainingOpen] = useState(false);
  const [payRemainingMethod, setPayRemainingMethod] = useState<"CASH" | "POS">("CASH");
  const [payingRemaining, setPayingRemaining] = useState(false);
  const [remainingPaid, setRemainingPaid] = useState(false);

  // Derive the shop's local currency from its country setting (single source of truth).
  // *Npr DB fields store amounts in this local currency — no FX conversion needed.
  const shopCurrency = getCurrencyForCountry(user?.shop?.country) as SupportedCurrencyCode;
  const money = (amount?: number | null) =>
    formatCurrencyAmount(Math.round(Number(amount ?? 0)), shopCurrency);

  const load = useCallback(async () => {
    if (!params?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await shopQuotesApi.getById(params.id);
      setQuote(res.data ?? null);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Could not load quote");
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }, [params?.id]);

  useEffect(() => { load(); }, [load]);

  const handlePayRemaining = async () => {
    if (!quote?.id || !quote.balanceDueNpr) return;
    setPayingRemaining(true);
    try {
      const methodLabel = payRemainingMethod === "CASH" ? "Cash at shop" : "POS / Card";
      await shopQuotesApi.recordPayment(quote.id, {
        amountNpr: Math.round(quote.balanceDueNpr),
        notes: `Remaining balance collected via ${methodLabel}.`,
      });
      setRemainingPaid(true);
      setPayRemainingOpen(false);
      toast({ title: "Payment recorded!", description: `${money(quote.balanceDueNpr)} collected.` });
      await load();
    } catch (err: any) {
      toast({ title: "Failed", description: err?.response?.data?.message ?? "Try again", variant: "destructive" });
    } finally {
      setPayingRemaining(false);
    }
  };

  const status = quote ? quotePaymentStatus(quote) : null;
  const issuedAt = quote?.invoicedAt || quote?.createdAt;
  const lineItems = quote ? [
    quote.metalCostNpr  ? { label: "Metal / Material",  amount: quote.metalCostNpr,  details: `${quote.jewelleryType?.replace(/_/g," ") ?? ""} · ${quote.targetTotalWeightG ?? "?"}g` } : null,
    quote.makingChargeNpr ? { label: "Making Charge",    amount: quote.makingChargeNpr } : null,
    (quote.gemstoneCostNpr ?? 0) > 0 ? { label: "Gemstone",   amount: quote.gemstoneCostNpr } : null,
    (quote.finishCostNpr ?? 0)   > 0 ? { label: "Finish",     amount: quote.finishCostNpr }   : null,
  ].filter(Boolean) as { label: string; amount?: number | null; details?: string }[] : [];

  return (
    <MobileFeatureGate feature="mobileOrders" featureName="Orders">
      <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
        <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
          <Link href="/m/orders" className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 flex items-center justify-center" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide"><T>Quote / Bill</T></p>
            <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">
              {quote?.invoiceNumber ? `#${quote.invoiceNumber}` : quote?.quoteNumber ? `#${quote.quoteNumber}` : "Loading…"}
            </h1>
          </div>
          {status && (
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${status.bg} ${status.color}`}>
              {status.label}
            </span>
          )}
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            </div>
          ) : error || !quote ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3 text-center">
              <Receipt className="h-10 w-10" />
              <p className="text-sm font-medium">{error || "Quote not found"}</p>
              <button onClick={load} className="text-xs text-amber-600 font-semibold"><T>Try again</T></button>
            </div>
          ) : (
            <>
              {/* Customer info */}
              <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase"><T>Customer</T></p>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{quote.walkInCustomer?.name || "Walk-in"}</p>
                {quote.walkInCustomer?.phone && <p className="text-xs text-gray-500">{quote.walkInCustomer.phone}</p>}
                {quote.walkInCustomer?.email && <p className="text-xs text-gray-500">{quote.walkInCustomer.email}</p>}
                {issuedAt && (
                  <p className="text-xs text-gray-400 pt-1">
                    {new Date(issuedAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </section>

              {/* Item breakdown */}
              {lineItems.length > 0 && (
                <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide"><T>Cost Breakdown</T></p>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {lineItems.map((item, i) => (
                      <div key={i} className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.label}</p>
                          {item.details && <p className="text-[11px] text-gray-400">{item.details}</p>}
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{money(item.amount)}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Totals */}
              <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-2">
                {(quote.taxNpr ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400"><T>Tax</T></span>
                    <span className="dark:text-gray-300">{money(quote.taxNpr)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold border-t border-gray-100 dark:border-gray-800 pt-2">
                  <span className="dark:text-gray-100"><T>Total</T></span>
                  <span className="text-amber-700">{money(quote.totalPriceNpr)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400"><T>Paid</T></span>
                  <span className="text-green-600 font-semibold">{money(quote.advancePaidNpr)}</span>
                </div>
                {(quote.balanceDueNpr ?? 0) > 0 && (
                  <div className="flex justify-between text-sm font-semibold border-t border-gray-100 dark:border-gray-800 pt-2">
                    <span className="text-amber-700"><T>Balance Due</T></span>
                    <span className="text-amber-700">{money(quote.balanceDueNpr)}</span>
                  </div>
                )}
              </section>

              {/* Pay Remaining */}
              {(quote.balanceDueNpr ?? 0) > 0 && !remainingPaid && (
                <section className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-amber-300 dark:border-amber-700 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-400"><T>Outstanding Balance</T></p>
                      <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{money(quote.balanceDueNpr)}</p>
                    </div>
                    <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-400">PENDING</span>
                  </div>
                  {!payRemainingOpen ? (
                    <button onClick={() => setPayRemainingOpen(true)} className="w-full rounded-2xl bg-amber-600 py-3 text-sm font-semibold text-white">
                      <T>Collect Remaining Payment</T>
                    </button>
                  ) : (
                    <div className="space-y-3 pt-1">
                      <p className="text-xs font-semibold uppercase text-gray-400"><T>Payment Method</T></p>
                      <div className="grid grid-cols-2 gap-2">
                        {(["CASH", "POS"] as const).map((m) => (
                          <button key={m} type="button" onClick={() => setPayRemainingMethod(m)}
                            className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-semibold transition ${payRemainingMethod === m ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400" : "border-gray-200 dark:border-gray-700 text-gray-500"}`}>
                            {m === "CASH" ? <><Banknote className="h-4 w-4" /><T>Cash</T></> : <><CreditCard className="h-4 w-4" /><T>POS / Card</T></>}
                          </button>
                        ))}
                      </div>
                      <p className="rounded-xl bg-green-50 dark:bg-green-900/10 px-3 py-2 text-[11px] text-green-700 dark:text-green-400">
                        Collecting <strong>{money(quote.balanceDueNpr)}</strong> will mark this order as <strong>Paid in Full</strong>.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setPayRemainingOpen(false)} className="rounded-xl border border-gray-200 dark:border-gray-700 py-3 text-sm text-gray-500"><T>Cancel</T></button>
                        <button onClick={handlePayRemaining} disabled={payingRemaining}
                          className="flex items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white disabled:opacity-50">
                          {payingRemaining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          <T>Confirm Paid</T>
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {remainingPaid && (
                <section className="flex items-center gap-3 rounded-2xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 p-4">
                  <Check className="h-5 w-5 text-green-600 shrink-0" />
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400"><T>Remaining balance collected. Order fully paid.</T></p>
                </section>
              )}

              {/* Notes */}
              {quote.specialInstructions || quote.shopNotes ? (
                <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-3">
                  {quote.specialInstructions && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase mb-1"><T>Special Instructions</T></p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{quote.specialInstructions}</p>
                    </div>
                  )}
                  {quote.shopNotes && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase mb-1"><T>Shop Notes</T></p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{quote.shopNotes}</p>
                    </div>
                  )}
                </section>
              ) : null}
            </>
          )}
        </main>
      </div>
    </MobileFeatureGate>
  );
}
