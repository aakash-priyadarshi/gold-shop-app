"use client";

import { T } from "@/components/ui/T";
import { getApiUrl } from "@/lib/api";
import {
  CheckCircle2,
  Loader2,
  Receipt,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface VerifiedBill {
  verified: boolean;
  invoiceNumber: string;
  invoiceTitle?: string | null;
  issuedAt: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  currency: string;
  supplierName?: string | null;
  supplierPhone?: string | null;
  supplierTaxId?: string | null;
  customerName?: string | null;
  lineItems?: Array<{
    label?: string;
    category?: string;
    amount?: number;
    details?: string;
  }>;
  shop?: {
    shopName?: string;
    city?: string;
    country?: string;
    logo?: string | null;
  } | null;
}

export default function VerifyBillPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const [loading, setLoading] = useState(true);
  const [bill, setBill] = useState<VerifiedBill | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${getApiUrl()}/invoices/public/verify/${encodeURIComponent(token)}`,
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body.message || "Bill not found or link invalid");
        }
        if (!cancelled) setBill(body.data ?? body);
      } catch (err: unknown) {
        if (!cancelled) {
          setBill(null);
          setError(
            err instanceof Error ? err.message : "Could not verify this bill",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const fmt = (amount: number, currency: string) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2,
    }).format(amount ?? 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/80 to-white dark:from-[#0d1117] dark:to-[#161b22]">
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 mb-4">
            <Receipt className="h-7 w-7 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold">
            <T>Bill Verification</T>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            <T>Powered by Orivraa — scan-to-verify authenticity</T>
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            <p className="text-sm text-muted-foreground">
              <T>Verifying bill…</T>
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-6 text-center">
            <XCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <h2 className="font-semibold text-red-800 dark:text-red-300">
              <T>Verification Failed</T>
            </h2>
            <p className="text-sm text-red-700 dark:text-red-400 mt-2">
              {error}
            </p>
          </div>
        ) : bill ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 p-5 flex items-start gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0" />
              <div>
                <h2 className="font-bold text-green-800 dark:text-green-300">
                  <T>Authentic Bill</T>
                </h2>
                <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                  <T>
                    This invoice was issued by a registered Orivraa shop and
                    matches our records.
                  </T>
                </p>
              </div>
            </div>

            <div className="rounded-2xl border bg-white dark:bg-[#161b22] shadow-sm overflow-hidden">
              {bill.shop?.shopName && (
                <div className="px-5 py-4 border-b bg-muted/30">
                  <p className="font-semibold">{bill.shop.shopName}</p>
                  {(bill.shop.city || bill.shop.country) && (
                    <p className="text-xs text-muted-foreground">
                      {[bill.shop.city, bill.shop.country]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                </div>
              )}

              <div className="px-5 py-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    <T>Invoice #</T>
                  </span>
                  <span className="font-mono font-semibold">
                    {bill.invoiceNumber}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    <T>Date</T>
                  </span>
                  <span>
                    {new Date(bill.issuedAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                {bill.customerName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      <T>Customer</T>
                    </span>
                    <span>{bill.customerName}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    <T>Status</T>
                  </span>
                  <span className="capitalize">
                    {bill.paymentStatus?.toLowerCase().replace(/_/g, " ") ||
                      bill.status}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t pt-3">
                  <span className="font-medium">
                    <T>Total</T>
                  </span>
                  <span className="font-bold text-lg">
                    {fmt(bill.totalAmount, bill.currency)}
                  </span>
                </div>
                {bill.balanceDue > 0 && (
                  <div className="flex justify-between text-sm text-amber-700">
                    <span>
                      <T>Balance due</T>
                    </span>
                    <span>{fmt(bill.balanceDue, bill.currency)}</span>
                  </div>
                )}
              </div>

              {bill.lineItems && bill.lineItems.length > 0 && (
                <div className="px-5 py-4 border-t">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    <T>Items</T>
                  </p>
                  <ul className="space-y-2">
                    {bill.lineItems.map((li, i) => (
                      <li
                        key={i}
                        className="flex justify-between text-sm gap-4"
                      >
                        <span className="min-w-0 truncate">
                          {li.label || li.category || "Item"}
                        </span>
                        {li.amount != null && (
                          <span className="shrink-0 font-medium">
                            {fmt(li.amount, bill.currency)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5" />
              <T>
                This page confirms the bill exists in Orivraa. It is not a tax
                receipt substitute.
              </T>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
