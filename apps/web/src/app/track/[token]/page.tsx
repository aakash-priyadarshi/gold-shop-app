"use client";

import { T } from "@/components/ui/T";
import { getApiUrl } from "@/lib/api";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Package,
  XCircle,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface TrackData {
  quoteNumber: string;
  invoiceNumber?: string | null;
  jewelleryType?: string;
  status: string;
  estimatedDays?: number | null;
  createdAt: string;
  confirmedAt?: string | null;
  startedAt?: string | null;
  readyAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  customerName?: string;
  totalAmount?: number | null;
  paidAmount?: number | null;
  balanceDue?: number | null;
  currency?: string;
  shop?: {
    shopName?: string;
    city?: string;
    country?: string;
  } | null;
}

const STEPS = [
  { key: "QUOTED", label: "Quoted", at: "createdAt" },
  { key: "CONFIRMED", label: "Confirmed", at: "confirmedAt" },
  { key: "IN_PROGRESS", label: "In Progress", at: "startedAt" },
  { key: "READY", label: "Ready", at: "readyAt" },
  { key: "COMPLETED", label: "Completed", at: "completedAt" },
] as const;

export default function TrackQuotePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TrackData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${getApiUrl()}/shop-quotes/track/${encodeURIComponent(token)}`,
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            body.message || "Invalid or expired tracking link",
          );
        }
        if (!cancelled) setData(body.data ?? body);
      } catch (err: unknown) {
        if (!cancelled) {
          setData(null);
          setError(
            err instanceof Error
              ? err.message
              : "Could not load tracking info",
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

  const fmt = (amount?: number | null, currency?: string) => {
    if (amount == null) return "—";
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency || "INR",
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${currency || ""} ${amount}`;
    }
  };

  const statusOrder = STEPS.map((s) => s.key);
  const currentIdx = data
    ? statusOrder.indexOf(data.status as (typeof statusOrder)[number])
    : -1;
  const isCancelled = data?.status === "CANCELLED";

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/80 to-white dark:from-[#0d1117] dark:to-[#161b22]">
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 mb-4">
            <Package className="h-7 w-7 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold">
            <T>Order Tracking</T>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            <T>Powered by Orivraa</T>
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            <p className="text-sm text-muted-foreground">
              <T>Loading order status…</T>
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-6 text-center">
            <XCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <h2 className="font-semibold text-red-800 dark:text-red-300">
              <T>Link invalid</T>
            </h2>
            <p className="text-sm text-red-700 dark:text-red-400 mt-2">
              {error}
            </p>
          </div>
        ) : data ? (
          <div className="space-y-4">
            <div className="rounded-2xl border bg-white dark:bg-[#161b22] shadow-sm overflow-hidden">
              {data.shop?.shopName && (
                <div className="px-5 py-4 border-b bg-muted/30">
                  <p className="font-semibold">{data.shop.shopName}</p>
                  {(data.shop.city || data.shop.country) && (
                    <p className="text-xs text-muted-foreground">
                      {[data.shop.city, data.shop.country]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                </div>
              )}

              <div className="px-5 py-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    <T>Quote #</T>
                  </span>
                  <span className="font-mono font-semibold">
                    {data.invoiceNumber || data.quoteNumber}
                  </span>
                </div>
                {data.customerName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      <T>Customer</T>
                    </span>
                    <span>{data.customerName}</span>
                  </div>
                )}
                {data.jewelleryType && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      <T>Item</T>
                    </span>
                    <span>{data.jewelleryType.replace(/_/g, " ")}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm border-t pt-3">
                  <span className="font-medium">
                    <T>Total</T>
                  </span>
                  <span className="font-bold">
                    {fmt(data.totalAmount, data.currency)}
                  </span>
                </div>
                {(data.paidAmount ?? 0) > 0 && (
                  <div className="flex justify-between text-sm text-green-700">
                    <span>
                      <T>Paid</T>
                    </span>
                    <span>{fmt(data.paidAmount, data.currency)}</span>
                  </div>
                )}
                {(data.balanceDue ?? 0) > 0 && (
                  <div className="flex justify-between text-sm text-amber-700">
                    <span>
                      <T>Balance due</T>
                    </span>
                    <span>{fmt(data.balanceDue, data.currency)}</span>
                  </div>
                )}
              </div>
            </div>

            {isCancelled ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/20 p-5 text-center">
                <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="font-semibold text-red-800 dark:text-red-300">
                  <T>Order cancelled</T>
                </p>
                {data.cancelReason && (
                  <p className="text-sm text-red-700 mt-1">
                    {data.cancelReason}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border bg-white dark:bg-[#161b22] p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                  <T>Status</T>
                </p>
                <ol className="space-y-4">
                  {STEPS.map((step, i) => {
                    const done = currentIdx >= i;
                    const active = currentIdx === i;
                    const atKey = step.at as keyof TrackData;
                    const atVal = data[atKey];
                    return (
                      <li key={step.key} className="flex items-start gap-3">
                        {done ? (
                          <CheckCircle2
                            className={`h-5 w-5 shrink-0 mt-0.5 ${
                              active ? "text-amber-500" : "text-green-600"
                            }`}
                          />
                        ) : (
                          <Circle className="h-5 w-5 shrink-0 mt-0.5 text-gray-300" />
                        )}
                        <div>
                          <p
                            className={`text-sm font-medium ${
                              done ? "" : "text-muted-foreground"
                            }`}
                          >
                            {step.label}
                          </p>
                          {typeof atVal === "string" && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(atVal).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
