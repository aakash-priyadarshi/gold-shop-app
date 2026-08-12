"use client";

import { T } from "@/components/ui/T";
import { InvoiceShareActions } from "@/components/shop/InvoiceShareActions";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { invoicesApi } from "@/lib/api";
import { getCounterPaymentMethods } from "@/lib/counterPayments";
import { unwrapInvoiceSettingsResponse } from "@/lib/invoiceBranding";
import { printBill } from "@/lib/billPrint";
import { toQrDataUrl, verifyBillUrl } from "@/lib/qrCode";
import { ArrowLeft, Loader2, PartyPopper, Printer, WalletCards, X } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function MobileInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [saving, setSaving] = useState(false);
  const [showCreatedBanner, setShowCreatedBanner] = useState(
    searchParams.get("created") === "true",
  );
  const methods = useMemo(
    () => getCounterPaymentMethods(user?.shop?.country ?? "NP"),
    [user?.shop?.country],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [invoiceResponse, settingsResponse] = await Promise.all([
        invoicesApi.getById(id),
        invoicesApi.getSettings(),
      ]);
      setInvoice(invoiceResponse.data ?? null);
      setSettings(unwrapInvoiceSettingsResponse(settingsResponse.data));
    } catch (error: any) {
      toast({ title: "Could not load invoice", description: error?.response?.data?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!methods.some((item) => item.value === method)) setMethod(methods[0]?.value ?? "CASH");
  }, [method, methods]);

  const recordPayment = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0 || value > Number(invoice?.balanceDue ?? 0)) {
      toast({ title: "Enter an amount within the remaining balance", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await invoicesApi.updatePaymentStatus(id, {
        amount: value,
        paymentMethod: method,
        idempotencyKey: crypto.randomUUID(),
      });
      setAmount("");
      await load();
      toast({ title: "Payment recorded" });
    } catch (error: any) {
      toast({ title: "Could not record payment", description: error?.response?.data?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const print = async () => {
    if (!invoice) return;
    const qr = invoice.verificationToken
      ? await toQrDataUrl(verifyBillUrl(invoice.verificationToken), 180)
      : undefined;
    printBill({
      fallbackShopName: user?.shop?.shopName,
      settings,
      invoiceNumber: invoice.invoiceNumber,
      invoiceCountry: invoice.invoiceCountry,
      isTaxInvoice: invoice.invoiceTitle === "TAX INVOICE",
      supplierName: invoice.supplierName,
      supplierAddress: invoice.supplierAddress,
      supplierPhone: invoice.supplierPhone,
      sellerTaxId: invoice.supplierTaxId,
      customerName: invoice.customerName,
      customerPhone: invoice.customerPhone,
      customerEmail: invoice.customerEmail,
      customerAddress: invoice.customerAddress,
      customerTaxId: invoice.customerTaxId,
      issuedAt: invoice.issuedAt,
      supplyDate: invoice.supplyDate,
      lineItems: (invoice.lineItems ?? []).map((line: any) => ({
        label: line.label,
        quantity: line.quantity,
        amount: line.amount,
        details: line.details,
      })),
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount,
      taxLabel: invoice.taxLabel,
      taxBreakdown: invoice.taxBreakdown ?? undefined,
      discountAmount: invoice.discountAmount,
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      balanceDue: invoice.balanceDue,
      currency: invoice.currency,
      paymentMethod: invoice.paymentMethod,
      notes: invoice.notes,
      verificationToken: invoice.verificationToken,
      verificationQrDataUrl: qr,
    });
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>;
  if (!invoice) return <div className="px-4 py-12 text-center text-sm text-gray-500"><T>Invoice not found</T></div>;

  const currency = invoice.currency ?? "NPR";
  return (
    <div className="space-y-4 px-4 py-4 pb-28">
      {showCreatedBanner && (
        <section className="rounded-2xl border border-green-200 bg-green-50 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <PartyPopper className="mt-0.5 h-5 w-5 text-green-600" />
              <div>
                <p className="font-bold text-green-900"><T>Invoice created!</T></p>
                <p className="text-sm text-green-700">
                  <T>Share via WhatsApp, email, or print below.</T>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowCreatedBanner(false)}
              className="rounded-lg p-1 text-green-700"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}
      <div className="flex items-center justify-between">
        <Link href="/m/invoices" className="rounded-xl bg-gray-100 p-2"><ArrowLeft className="h-5 w-5" /></Link>
        <button onClick={() => void print()} className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 px-3 py-2 text-sm font-bold text-amber-700"><Printer className="h-4 w-4" /><T>Print</T></button>
      </div>
      <section className="rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 p-5 text-white shadow-lg">
        <p className="text-xs opacity-80">{invoice.invoiceTitle || "INVOICE"}</p>
        <h1 className="mt-1 text-xl font-black">#{invoice.invoiceNumber}</h1>
        <p className="mt-3 text-3xl font-black">{currency} {Number(invoice.totalAmount || 0).toLocaleString()}</p>
        <p className="mt-1 text-sm opacity-90">{invoice.customerName || "Walk-in customer"}</p>
      </section>
      <section className="rounded-2xl border border-gray-100 bg-white p-4">
        <div className="space-y-3">
          {(invoice.lineItems ?? []).map((line: any, index: number) => <div key={`${line.label}-${index}`} className="flex justify-between gap-4 text-sm"><span>{line.label}{line.quantity ? ` × ${line.quantity}` : ""}</span><strong>{currency} {Number(line.amount || 0).toLocaleString()}</strong></div>)}
          <div className="flex justify-between border-t pt-3 text-sm"><span><T>Tax</T></span><strong>{currency} {Number(invoice.taxAmount || 0).toLocaleString()}</strong></div>
          <div className="flex justify-between text-base font-black"><span><T>Total</T></span><span>{currency} {Number(invoice.totalAmount || 0).toLocaleString()}</span></div>
        </div>
      </section>
      <section className="rounded-2xl border border-gray-100 bg-white p-4 space-y-2">
        <h2 className="font-bold"><T>Payment history</T></h2>
        {(invoice.payments ?? []).map((payment: any) => <div key={payment.id} className="flex justify-between text-sm"><span>{payment.method?.replace(/_/g, " ")}</span><strong className="text-emerald-600">{currency} {Number(payment.amount || 0).toLocaleString()}</strong></div>)}
        <div className="flex justify-between border-t pt-2 text-sm font-bold"><span><T>Balance due</T></span><span className={Number(invoice.balanceDue || 0) > 0 ? "text-amber-700" : "text-emerald-600"}>{currency} {Number(invoice.balanceDue || 0).toLocaleString()}</span></div>
      </section>
      <section className="rounded-2xl border border-gray-100 bg-white p-4">
        <InvoiceShareActions
          invoice={{
            id: invoice.id,
            shopName: invoice.supplierName || user?.shop?.shopName,
            shopPhone: invoice.supplierPhone || (user?.shop as any)?.phone,
            invoiceNumber: invoice.invoiceNumber,
            customerName: invoice.customerName,
            customerPhone: invoice.customerPhone,
            customerEmail: invoice.customerEmail,
            currency: invoice.currency,
            subtotal: invoice.subtotal,
            taxAmount: invoice.taxAmount,
            taxLabel: invoice.taxLabel,
            discountAmount: invoice.discountAmount,
            totalAmount: invoice.totalAmount,
            paidAmount: invoice.paidAmount,
            balanceDue: invoice.balanceDue,
            lineItems: invoice.lineItems,
            issuedAt: invoice.issuedAt,
            verificationToken: invoice.verificationToken,
          }}
        />
      </section>
      {Number(invoice.balanceDue || 0) > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <h2 className="flex items-center gap-2 font-bold text-amber-900"><WalletCards className="h-4 w-4" /><T>Record payment</T></h2>
          <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" type="number" min="0.01" max={invoice.balanceDue} placeholder={`Amount in ${currency}`} className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm" />
          <div className="flex flex-wrap gap-2">{methods.map((item) => <button key={item.value} onClick={() => setMethod(item.value)} className={`rounded-xl border px-3 py-2 text-xs font-bold ${method === item.value ? "border-amber-500 bg-amber-500 text-white" : "border-amber-200 bg-white text-amber-800"}`}><T>{item.label}</T></button>)}</div>
          <button disabled={saving} onClick={() => void recordPayment()} className="w-full rounded-xl bg-amber-600 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? <T>Saving…</T> : <T>Record payment</T>}</button>
        </section>
      )}
    </div>
  );
}
