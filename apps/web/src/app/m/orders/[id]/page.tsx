"use client";

import { MobileFeatureGate } from "@/components/mobile/MobileFeatureGate";
import { T } from "@/components/ui/T";
import { useAuth } from "@/hooks/useAuth";
import { invoicesApi } from "@/lib/api";
import { shareBillOnWhatsApp } from "@/lib/billShare";
import { ArrowLeft, Loader2, Receipt, Share2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface InvoiceLineItem {
  label?: string;
  name?: string;
  description?: string;
  category?: string;
  quantity?: number;
  qty?: number;
  unitPrice?: number;
  amount?: number;
  details?: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  subtotal?: number;
  taxAmount?: number;
  taxLabel?: string | null;
  discountAmount?: number;
  totalAmount?: number;
  paidAmount?: number;
  balanceDue?: number;
  currency?: string;
  status?: string;
  paymentStatus?: string;
  issuedAt?: string | null;
  createdAt?: string;
  dueDate?: string | null;
  notes?: string | null;
  terms?: string | null;
  lineItems?: InvoiceLineItem[] | string | null;
}

function money(amount?: number | null, currency = "NPR") {
  return `${currency} ${Math.round(Number(amount ?? 0)).toLocaleString("en-IN")}`;
}

function parseLineItems(value: Invoice["lineItems"]): InvoiceLineItem[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function MobileOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!params?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await invoicesApi.getById(params.id);
      setInvoice(res.data?.invoice ?? res.data ?? null);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Could not load bill");
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  }, [params?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleShare = () => {
    if (!invoice) return;
    shareBillOnWhatsApp(
      {
        shopName: user?.shop?.shopName,
        shopPhone: user?.shop?.contactPhone,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        customerPhone: invoice.customerPhone,
        currency: invoice.currency || "NPR",
        subtotal: invoice.subtotal,
        taxAmount: invoice.taxAmount,
        taxLabel: invoice.taxLabel,
        discountAmount: invoice.discountAmount,
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        balanceDue: invoice.balanceDue,
        lineItems: parseLineItems(invoice.lineItems),
        issuedAt: invoice.issuedAt || invoice.createdAt,
      },
      invoice.customerPhone,
    );
  };

  const lineItems = parseLineItems(invoice?.lineItems);
  const currency = invoice?.currency || "NPR";
  const issuedAt = invoice?.issuedAt || invoice?.createdAt;

  return (
    <MobileFeatureGate feature="mobileOrders" featureName="Orders">
      <div className="flex flex-col h-full bg-gray-50">
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <Link
            href="/m/orders"
            className="h-10 w-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center"
            aria-label="Back to bills"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">
              <T>Bill Details</T>
            </p>
            <h1 className="text-base font-bold text-gray-900 truncate">
              {invoice?.invoiceNumber ? `#${invoice.invoiceNumber}` : "Bill"}
            </h1>
          </div>
          {invoice && (
            <button
              onClick={handleShare}
              className="h-10 px-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-1.5"
            >
              <Share2 className="h-4 w-4" />
              <T>Share</T>
            </button>
          )}
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            </div>
          ) : error || !invoice ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3 text-center">
              <Receipt className="h-10 w-10" />
              <p className="text-sm font-medium">{error || "Bill not found"}</p>
              <button onClick={load} className="text-xs text-amber-600 font-semibold">
                <T>Try again</T>
              </button>
            </div>
          ) : (
            <>
              <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-400"><T>Customer</T></p>
                    <p className="text-sm font-semibold text-gray-900">
                      {invoice.customerName || "Walk-in Customer"}
                    </p>
                    {invoice.customerPhone && (
                      <p className="text-xs text-gray-500">{invoice.customerPhone}</p>
                    )}
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold">
                    {invoice.paymentStatus || invoice.status || "ISSUED"}
                  </span>
                </div>
                {issuedAt && (
                  <p className="text-xs text-gray-400">
                    {new Date(issuedAt).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </section>

              <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    <T>Line Items</T>
                  </p>
                </div>
                <div className="divide-y divide-gray-100">
                  {lineItems.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-gray-400 text-center">
                      <T>No line items recorded</T>
                    </p>
                  ) : (
                    lineItems.map((item, index) => {
                      const qty = Number(item.quantity ?? item.qty ?? 1);
                      const label = item.label || item.name || item.description || "Item";
                      return (
                        <div key={`${label}-${index}`} className="px-4 py-3 flex gap-3">
                          <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{label}</p>
                            <p className="text-xs text-gray-400">
                              {qty} x {money(item.unitPrice, currency)}
                              {item.details ? ` · ${item.details}` : ""}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-gray-900 whitespace-nowrap">
                            {money(item.amount, currency)}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500"><T>Subtotal</T></span>
                  <span>{money(invoice.subtotal, currency)}</span>
                </div>
                {(invoice.discountAmount ?? 0) > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span><T>Discount</T></span>
                    <span>-{money(invoice.discountAmount, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{invoice.taxLabel || "Tax"}</span>
                  <span>{money(invoice.taxAmount, currency)}</span>
                </div>
                <div className="flex justify-between text-base font-bold border-t pt-2">
                  <span><T>Total</T></span>
                  <span className="text-amber-700">{money(invoice.totalAmount, currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500"><T>Paid</T></span>
                  <span>{money(invoice.paidAmount, currency)}</span>
                </div>
                {(invoice.balanceDue ?? 0) > 0 && (
                  <div className="flex justify-between text-sm font-semibold text-red-600">
                    <span><T>Balance Due</T></span>
                    <span>{money(invoice.balanceDue, currency)}</span>
                  </div>
                )}
              </section>

              {(invoice.notes || invoice.terms) && (
                <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                  {invoice.notes && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase mb-1">
                        <T>Notes</T>
                      </p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
                    </div>
                  )}
                  {invoice.terms && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase mb-1">
                        <T>Terms</T>
                      </p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.terms}</p>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </MobileFeatureGate>
  );
}
