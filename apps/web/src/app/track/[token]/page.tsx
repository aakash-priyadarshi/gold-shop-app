"use client";

import { T } from "@/components/ui/T";
import { shopQuotesApi } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface TrackData {
  quoteNumber?: string;
  invoiceNumber?: string | null;
  jewelleryType?: string;
  status?: string;
  estimatedDays?: number | null;
  createdAt?: string;
  shop?: { shopName?: string; city?: string; country?: string };
  customerName?: string;
  totalAmount?: number | null;
  paidAmount?: number | null;
  currency?: string | null;
}

function formatStatus(status?: string) {
  if (!status) return "—";
  return status.replace(/_/g, " ");
}

export default function TrackQuotePage() {
  const params = useParams();
  const token = typeof params?.token === "string" ? params.token : "";
  const [data, setData] = useState<TrackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("Invalid tracking link");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await shopQuotesApi.trackByToken(token);
        if (cancelled) return;
        setData(res.data ?? res);
      } catch (err: any) {
        if (cancelled) return;
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Tracking link is invalid or has expired";
        setError(Array.isArray(msg) ? msg[0] : msg);
        setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white text-gray-900">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-10">
        <header className="mb-8 text-center">
          <p className="text-sm font-semibold tracking-wide text-amber-700">
            Orivraa
          </p>
          <h1 className="mt-2 text-2xl font-bold">
            <T>Track your order</T>
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            <T>Quote and bill status</T>
          </p>
        </header>

        {loading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            <p className="text-sm">
              <T>Loading…</T>
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-8 text-center">
            <p className="text-base font-semibold text-red-700">
              <T>Not found</T>
            </p>
            <p className="mt-2 text-sm text-red-600">{error}</p>
          </div>
        )}

        {!loading && !error && data && (
          <div className="space-y-4 rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
            {data.shop?.shopName && (
              <div className="border-b border-gray-100 pb-4 text-center">
                <p className="text-lg font-bold">{data.shop.shopName}</p>
                {(data.shop.city || data.shop.country) && (
                  <p className="text-xs text-gray-500">
                    {[data.shop.city, data.shop.country]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  <T>Customer</T>
                </p>
                <p className="mt-0.5 font-medium">
                  {data.customerName || "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  <T>Status</T>
                </p>
                <p className="mt-0.5 font-medium capitalize">
                  {formatStatus(data.status)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  <T>Quote #</T>
                </p>
                <p className="mt-0.5 font-medium">
                  {data.quoteNumber || "—"}
                </p>
              </div>
              {data.invoiceNumber && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    <T>Invoice #</T>
                  </p>
                  <p className="mt-0.5 font-medium">{data.invoiceNumber}</p>
                </div>
              )}
              {data.jewelleryType && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    <T>Item</T>
                  </p>
                  <p className="mt-0.5 font-medium capitalize">
                    {data.jewelleryType.replace(/_/g, " ").toLowerCase()}
                  </p>
                </div>
              )}
              {data.estimatedDays != null && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    <T>Est. days</T>
                  </p>
                  <p className="mt-0.5 font-medium">{data.estimatedDays}</p>
                </div>
              )}
            </div>

            {(data.totalAmount != null || data.paidAmount != null) && (
              <div className="mt-2 space-y-2 rounded-xl bg-amber-50 px-4 py-3">
                {data.totalAmount != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      <T>Total</T>
                    </span>
                    <span className="font-semibold">
                      {data.currency ? `${data.currency} ` : ""}
                      {Number(data.totalAmount).toLocaleString()}
                    </span>
                  </div>
                )}
                {data.paidAmount != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      <T>Paid</T>
                    </span>
                    <span className="font-semibold">
                      {data.currency ? `${data.currency} ` : ""}
                      {Number(data.paidAmount).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {data.createdAt && (
              <p className="pt-2 text-center text-xs text-gray-400">
                <T>Created</T>{" "}
                {new Date(data.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
