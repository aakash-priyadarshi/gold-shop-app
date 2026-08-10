"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { T } from "@/components/ui/T";
import { shopQuotesApi } from "@/lib/api";
import { formatCurrencyAmount } from "@/lib/currency";
import {
  CheckCircle2,
  Circle,
  Loader2,
  MapPin,
  Store,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface TrackPayload {
  quoteNumber: string;
  invoiceNumber?: string | null;
  jewelleryType?: string;
  status: string;
  estimatedDays?: number | null;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string | null;
  startedAt?: string | null;
  readyAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  shop?: {
    shopName: string;
    city?: string | null;
    country?: string | null;
  };
  customerName?: string;
  totalAmount?: number;
  paidAmount?: number;
  balanceDue?: number;
  currency?: string;
}

const STEPS = [
  { key: "QUOTED", label: "Quote sent" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "READY", label: "Ready for pickup" },
  { key: "COMPLETED", label: "Completed" },
] as const;

function stepIndex(status: string): number {
  const idx = STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

export default function PublicTrackPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<TrackPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await shopQuotesApi.trackByToken(token);
      setData(res.data as TrackPayload);
    } catch {
      setError("This tracking link is invalid or has expired.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const currency = (data?.currency || "NPR") as "NPR" | "INR";
  const activeIdx =
    data?.status === "CANCELLED" ? -1 : stepIndex(data?.status || "QUOTED");

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <header className="border-b bg-white/80 backdrop-blur dark:bg-gray-900/80">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/brand/orivraa-icon.svg"
              alt="Orivraa"
              width={28}
              height={28}
              unoptimized
            />
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              Orivraa
            </span>
          </Link>
          <Badge variant="outline" className="text-xs">
            <T>Order tracking</T>
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-8">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            <T>Loading your order status…</T>
          </div>
        ) : error || !data ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <XCircle className="h-10 w-10 text-red-400" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <p className="text-sm text-muted-foreground">
                {data.invoiceNumber ? (
                  <T>Invoice</T>
                ) : (
                  <T>Quote</T>
                )}{" "}
                #
                {data.invoiceNumber || data.quoteNumber}
              </p>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {data.jewelleryType?.replace(/_/g, " ") || (
                  <T>Custom jewellery</T>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">
                <T>Hi</T> {data.customerName}
              </p>
            </div>

            {data.shop && (
              <Card>
                <CardContent className="flex items-center gap-3 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <Store className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{data.shop.shopName}</p>
                    {(data.shop.city || data.shop.country) && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {[data.shop.city, data.shop.country]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  <T>Status</T>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.status === "CANCELLED" ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                    <p className="font-medium">
                      <T>Cancelled</T>
                    </p>
                    {data.cancelReason && (
                      <p className="mt-1">{data.cancelReason}</p>
                    )}
                  </div>
                ) : (
                  <ol className="space-y-4">
                    {STEPS.map((step, idx) => {
                      const done = idx < activeIdx;
                      const current = idx === activeIdx;
                      return (
                        <li key={step.key} className="flex items-start gap-3">
                          {done ? (
                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                          ) : current ? (
                            <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-amber-500 ring-4 ring-amber-100" />
                          ) : (
                            <Circle className="mt-0.5 h-5 w-5 shrink-0 text-gray-300" />
                          )}
                          <div>
                            <p
                              className={`text-sm font-medium ${
                                current
                                  ? "text-amber-700 dark:text-amber-400"
                                  : done
                                    ? "text-gray-900 dark:text-gray-100"
                                    : "text-muted-foreground"
                              }`}
                            >
                              <T>{step.label}</T>
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
                {data.estimatedDays != null && data.status !== "COMPLETED" && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    <T>Estimated turnaround</T>: {data.estimatedDays}{" "}
                    <T>days</T>
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  <T>Payment summary</T>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    <T>Total</T>
                  </span>
                  <span className="font-medium">
                    {formatCurrencyAmount(data.totalAmount ?? 0, currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    <T>Paid</T>
                  </span>
                  <span className="font-medium text-green-600">
                    {formatCurrencyAmount(data.paidAmount ?? 0, currency)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">
                    <T>Balance due</T>
                  </span>
                  <span className="font-bold text-amber-700">
                    {formatCurrencyAmount(data.balanceDue ?? 0, currency)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <p className="text-center text-xs text-muted-foreground">
              <T>Questions? Contact the shop directly with your quote number.</T>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
