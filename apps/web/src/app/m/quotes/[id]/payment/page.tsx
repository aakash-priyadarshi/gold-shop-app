"use client";

import { MobileFeatureGate } from "@/components/mobile/MobileFeatureGate";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { shopQuotesApi } from "@/lib/api";
import {
  ArrowLeft,
  Banknote,
  Check,
  CreditCard,
  FileDown,
  Loader2,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function fmt(amount: number, currency = "NPR") {
  return `${currency} ${Math.round(amount).toLocaleString("en-IN")}`;
}

type PaymentMethod = "CASH" | "POS";
type PaymentMode = "full" | "partial";

function PaymentPageInner() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const quoteId = params.id;
  const displayTotal = Number(searchParams.get("displayTotal") ?? 0);
  const currency = searchParams.get("currency") ?? "NPR";
  const nprRate = Number(searchParams.get("nprRate") ?? 1);
  const customerName = searchParams.get("name") ?? "";
  const quoteNumber = searchParams.get("num") ?? String(quoteId ?? "");
  const customerPhone = searchParams.get("phone") ?? "";

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("full");
  const [customAmount, setCustomAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);
  const [outstandingAmount, setOutstandingAmount] = useState(0);

  const payAmount = paymentMode === "full" ? displayTotal : Number(customAmount) || 0;
  const outstanding = Math.max(0, displayTotal - payAmount);
  // *Npr fields store the shop's local currency (e.g. INR for Indian shops).
  // payAmount is already in that same local currency — no conversion needed.
  const payAmountNpr = Math.round(payAmount);

  const handlePay = async () => {
    if (!quoteId) return;
    if (paymentMode === "partial" && payAmount <= 0) {
      toast({ title: "Enter the amount being paid", variant: "destructive" });
      return;
    }
    if (payAmount > displayTotal + 0.01) {
      toast({ title: "Amount cannot exceed the total", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const methodLabel = paymentMethod === "CASH" ? "Cash at shop" : "POS / Card";
      const notes = `Payment via ${methodLabel}. Paid: ${fmt(payAmount, currency)}${outstanding > 0 ? `. Outstanding: ${fmt(outstanding, currency)}` : ""}`;

      // 1. Record payment on the quote
      await shopQuotesApi.recordPayment(quoteId, {
        amountNpr: Math.round(payAmountNpr),
        notes,
      });

      // 2. Convert quote → invoice (generates the bill)
      await shopQuotesApi.convertToInvoice(quoteId, { notes });

      setPaidAmount(payAmount);
      setOutstandingAmount(outstanding);
      setDone(true);

      toast({
        title: outstanding > 0 ? "Partial payment recorded" : "Payment complete!",
        description: quoteNumber,
      });
    } catch (err: any) {
      toast({
        title: "Payment failed",
        description: err?.response?.data?.message ?? "Please try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const printBill = () => {
    const printWindow = window.open("", "_blank", "width=480,height=900");
    if (!printWindow) {
      toast({ title: "Pop-ups are blocked. Please allow them to print.", variant: "destructive" });
      return;
    }
    const shopName = user?.shop?.shopName ?? "Receipt";
    const shopAddr = (user?.shop as any)?.address ?? "";
    const safe = (v: string) => String(v ?? "").replace(/</g, "&lt;");
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8">
<title>${safe(shopName)} — ${safe(quoteNumber)}</title>
<style>
*{box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;padding:28px 24px;max-width:380px;margin:0 auto}
h2{margin:0 0 2px;font-size:18px;color:#b45309}
.muted{color:#6b7280;font-size:11px;margin:0 0 12px}
.divider{border:none;border-top:1px solid #e5e7eb;margin:12px 0}
.row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px}
.label{color:#6b7280}.value{font-weight:600}
.total-row{display:flex;justify-content:space-between;padding:8px 0 0;font-size:16px;font-weight:700;border-top:2px solid #1f2937}
.amt-paid{color:#065f46;font-weight:700}
.amt-due{color:#b45309;font-weight:700}
.status-badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;margin-top:14px}
.paid-badge{background:#d1fae5;color:#065f46}
.partial-badge{background:#fef3c7;color:#92400e}
.footer{margin-top:20px;font-size:10px;color:#9ca3af;text-align:center}
@media print{button{display:none}}
</style>
</head><body>
<button onclick="window.print()" style="position:fixed;top:12px;right:12px;padding:7px 14px;background:#b45309;color:#fff;border:0;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">Print / Save PDF</button>
<h2>${safe(shopName)}</h2>
<p class="muted">${safe(shopAddr)}</p>
<hr class="divider"/>
<div class="row"><span class="label">Quote / Bill</span><span class="value">${safe(quoteNumber)}</span></div>
<div class="row"><span class="label">Customer</span><span class="value">${safe(customerName)}</span></div>
${customerPhone ? `<div class="row"><span class="label">Phone</span><span class="value">${safe(customerPhone)}</span></div>` : ""}
<div class="row"><span class="label">Date</span><span class="value">${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span></div>
<div class="row"><span class="label">Payment method</span><span class="value">${paymentMethod === "CASH" ? "Cash at shop" : "POS / Card"}</span></div>
<hr class="divider"/>
<div class="total-row"><span>Total</span><span>${safe(fmt(displayTotal, currency))}</span></div>
<div class="row" style="padding-top:8px"><span class="label">Paid now</span><span class="amt-paid">${safe(fmt(paidAmount, currency))}</span></div>
${outstandingAmount > 0 ? `<div class="row"><span class="label">Outstanding balance</span><span class="amt-due">${safe(fmt(outstandingAmount, currency))}</span></div>` : ""}
<div><span class="status-badge ${outstandingAmount > 0 ? "partial-badge" : "paid-badge"}">${outstandingAmount > 0 ? "Partial Payment" : "Paid in Full"}</span></div>
<p class="footer">Thank you for your business!</p>
<script>setTimeout(function(){window.print();},350);</script>
</body></html>`);
    printWindow.document.close();
  };

  const shareWhatsApp = () => {
    const phone = customerPhone.replace(/\D/g, "");
    const text = encodeURIComponent(
      `Hello ${customerName},\n\n` +
        `Receipt for: ${quoteNumber}\n` +
        `Total: ${fmt(displayTotal, currency)}\n` +
        `Paid: ${fmt(paidAmount, currency)}\n` +
        (outstandingAmount > 0 ? `Outstanding: ${fmt(outstandingAmount, currency)}\n` : "") +
        `Payment: ${paymentMethod === "CASH" ? "Cash at shop" : "POS / Card"}\n\n` +
        `Thank you — ${user?.shop?.shopName ?? "our store"}`,
    );
    window.open(
      phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`,
      "_blank",
    );
  };

  if (done) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <Check className="h-10 w-10 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold dark:text-gray-100">
            {outstandingAmount > 0 ? (
              <T>Partial Payment Recorded</T>
            ) : (
              <T>Payment Complete!</T>
            )}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{quoteNumber}</p>
        </div>

        {/* Receipt Summary */}
        <div className="w-full max-w-xs rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">
              <T>Total</T>
            </span>
            <span className="font-semibold dark:text-gray-100">{fmt(displayTotal, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">
              <T>Paid</T>
            </span>
            <span className="font-semibold text-green-600">{fmt(paidAmount, currency)}</span>
          </div>
          {outstandingAmount > 0 && (
            <div className="flex justify-between border-t border-gray-100 dark:border-gray-800 pt-2">
              <span className="text-gray-500 dark:text-gray-400">
                <T>Outstanding</T>
              </span>
              <span className="font-bold text-amber-700">{fmt(outstandingAmount, currency)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-100 dark:border-gray-800 pt-2 text-xs">
            <span className="text-gray-400">
              <T>Method</T>
            </span>
            <span className="text-gray-600 dark:text-gray-300">
              {paymentMethod === "CASH" ? "Cash at shop" : "POS / Card"}
            </span>
          </div>
        </div>

        <div className="w-full max-w-xs space-y-3">
          {customerPhone && (
            <button
              onClick={shareWhatsApp}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-4 text-sm font-semibold text-white shadow-lg"
            >
              <MessageCircle className="h-5 w-5" />
              <T>Share Receipt on WhatsApp</T>
            </button>
          )}
          <button
            onClick={printBill}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-300 py-3 text-sm font-semibold text-amber-700 dark:text-amber-400"
          >
            <FileDown className="h-4 w-4" />
            <T>Print / Save Bill</T>
          </button>
          <Link
            href="/m/orders"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 dark:bg-gray-100 py-3 text-sm font-semibold text-white dark:text-gray-900"
          >
            <T>Go to Orders</T>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 pb-32 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/m/orders"
          className="rounded-full bg-gray-100 dark:bg-gray-800 p-2"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </Link>
        <div>
          <h1 className="text-base font-bold dark:text-gray-100">
            <T>Collect Payment</T>
          </h1>
          <p className="text-[11px] text-gray-400">
            {quoteNumber}
            {customerName ? ` · ${customerName}` : ""}
          </p>
        </div>
      </div>

      {/* Amount due */}
      <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 text-center">
        <p className="text-xs font-semibold uppercase text-gray-400 mb-1">
          <T>Amount Due</T>
        </p>
        <p className="text-3xl font-bold text-amber-700">{fmt(displayTotal, currency)}</p>
      </section>

      {/* Payment method */}
      <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          <T>Payment Method</T>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPaymentMethod("CASH")}
            className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition ${
              paymentMethod === "CASH"
                ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20"
                : "border-gray-200 dark:border-gray-700"
            }`}
          >
            <Banknote
              className={`h-6 w-6 ${paymentMethod === "CASH" ? "text-amber-600" : "text-gray-400"}`}
            />
            <span
              className={`text-sm font-semibold ${paymentMethod === "CASH" ? "text-amber-700 dark:text-amber-400" : "text-gray-500 dark:text-gray-400"}`}
            >
              <T>Cash at Shop</T>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod("POS")}
            className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition ${
              paymentMethod === "POS"
                ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20"
                : "border-gray-200 dark:border-gray-700"
            }`}
          >
            <CreditCard
              className={`h-6 w-6 ${paymentMethod === "POS" ? "text-amber-600" : "text-gray-400"}`}
            />
            <span
              className={`text-sm font-semibold ${paymentMethod === "POS" ? "text-amber-700 dark:text-amber-400" : "text-gray-500 dark:text-gray-400"}`}
            >
              <T>POS / Card</T>
            </span>
          </button>
        </div>
      </section>

      {/* Payment amount */}
      <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          <T>How Much Is Being Paid?</T>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPaymentMode("full")}
            className={`rounded-2xl border-2 py-3 text-sm font-semibold transition ${
              paymentMode === "full"
                ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"
            }`}
          >
            <T>Pay in Full</T>
          </button>
          <button
            type="button"
            onClick={() => setPaymentMode("partial")}
            className={`rounded-2xl border-2 py-3 text-sm font-semibold transition ${
              paymentMode === "partial"
                ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"
            }`}
          >
            <T>Partial / Advance</T>
          </button>
        </div>

        {paymentMode === "partial" && (
          <div className="space-y-2">
            <label className="block text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400">
              <T>Amount Paying Now</T> ({currency})
            </label>
            <input
              type="number"
              inputMode="decimal"
              min="1"
              max={displayTotal}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder={`Max ${Math.round(displayTotal).toLocaleString("en-IN")}`}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white dark:bg-gray-900 dark:text-gray-100"
            />
            {Number(customAmount) > 0 && outstanding > 0 && (
              <p className="rounded-xl bg-amber-50 dark:bg-amber-900/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400">
                Outstanding balance:{" "}
                <strong>{fmt(outstanding, currency)}</strong> — recorded on the bill &
                visible in Orders.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Summary */}
      {payAmount > 0 && (
        <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">
              <T>Paying now</T>
            </span>
            <span className="font-semibold text-green-600">{fmt(payAmount, currency)}</span>
          </div>
          {outstanding > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">
                <T>Balance due after payment</T>
              </span>
              <span className="font-semibold text-amber-700">{fmt(outstanding, currency)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-100 dark:border-gray-800 pt-2">
            <span className="text-gray-500 dark:text-gray-400">
              <T>Method</T>
            </span>
            <span className="font-semibold dark:text-gray-100">
              {paymentMethod === "CASH" ? "Cash at Shop" : "POS / Card"}
            </span>
          </div>
        </section>
      )}

      {/* Submit */}
      <div className="fixed bottom-16 left-0 right-0 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 pb-4 pt-2">
        <button
          onClick={handlePay}
          disabled={submitting || (paymentMode === "partial" && payAmount <= 0)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 py-4 text-base font-semibold text-white shadow-lg shadow-amber-500/25 disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Check className="h-5 w-5" />
          )}
          {paymentMode === "full" ? (
            <T>Confirm Full Payment</T>
          ) : payAmount > 0 ? (
            <>
              <T>Record</T> {fmt(payAmount, currency)}
            </>
          ) : (
            <T>Enter Amount Above</T>
          )}
        </button>
      </div>
    </div>
  );
}

export default function QuotePaymentPage() {
  return (
    <MobileFeatureGate feature="mobileQuotes" featureName="Payment">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
          </div>
        }
      >
        <PaymentPageInner />
      </Suspense>
    </MobileFeatureGate>
  );
}
