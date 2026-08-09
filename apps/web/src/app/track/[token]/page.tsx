"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { T } from "@/components/ui/T";
import { shopQuotesApi } from "@/lib/api";
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    Gem,
    Receipt,
    Store,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type TrackData = {
  quoteNumber: string;
  invoiceNumber: string | null;
  jewelleryType: string;
  status: string;
  estimatedDays: number | null;
  createdAt: string;
  confirmedAt: string | null;
  startedAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  shop: { shopName: string; city: string | null; country: string } | null;
  customerName: string;
  totalAmount: number | null;
  paidAmount: number;
  balanceDue: number | null;
  currency: string;
};

const STATUS_STEPS = [
  { key: "QUOTED", label: "Quote sent" },
  { key: "CONFIRMED", label: "Order confirmed" },
  { key: "IN_PROGRESS", label: "Being crafted" },
  { key: "READY", label: "Ready for pickup" },
  { key: "COMPLETED", label: "Completed" },
];

export default function TrackQuotePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<TrackData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    shopQuotesApi
      .trackByToken(token)
      .then((r: any) => setData(r.data))
      .catch(() => setError("invalid"))
      .finally(() => setLoading(false));
  }, [token]);

  const activeIdx = data
    ? STATUS_STEPS.findIndex((s) => s.key === data.status)
    : -1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-gray-950 dark:to-gray-900 py-10 px-4">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="text-center">
          <Gem className="h-10 w-10 text-amber-600 mx-auto" />
          <h1 className="text-2xl font-bold mt-2">
            <T>Track your order</T>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            <T>Live status of your custom jewellery order</T>
          </p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-6 space-y-3">
              <div className="h-6 w-1/3 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
              <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
              <div className="h-20 w-full rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
            </CardContent>
          </Card>
        ) : error || !data ? (
          <Card className="border-red-200">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
              <p className="mt-3 font-medium text-red-700">
                <T>Tracking link is invalid or has expired</T>
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-lg">
                    {data.jewelleryType.replace(/_/g, " ")}
                  </CardTitle>
                  <Badge
                    className={
                      data.status === "CANCELLED"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }
                  >
                    {data.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {data.quoteNumber}
                  {data.invoiceNumber && (
                    <>
                      {" · "}
                      <Receipt className="inline h-3.5 w-3.5 -mt-0.5" />{" "}
                      {data.invoiceNumber}
                    </>
                  )}
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Timeline */}
                {data.status !== "CANCELLED" && (
                  <ol className="relative border-l border-amber-200 ml-2 space-y-4">
                    {STATUS_STEPS.map((step, i) => {
                      const done = i <= activeIdx;
                      const time =
                        i === 0
                          ? data.createdAt
                          : step.key === "CONFIRMED"
                            ? data.confirmedAt
                            : step.key === "IN_PROGRESS"
                              ? data.startedAt
                              : step.key === "READY"
                                ? data.readyAt
                                : data.completedAt;
                      return (
                        <li key={step.key} className="ml-4">
                          <span
                            className={`absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full ${
                              done ? "bg-amber-500" : "bg-gray-300"
                            }`}
                          >
                            {done && (
                              <CheckCircle2 className="h-3 w-3 text-white" />
                            )}
                          </span>
                          <p
                            className={`text-sm font-medium ${
                              done ? "text-gray-900 dark:text-gray-100" : "text-muted-foreground"
                            }`}
                          >
                            <T>{step.label}</T>
                          </p>
                          {time && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(time).toLocaleDateString()}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
                {data.status === "CANCELLED" && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    <T>Cancelled</T>
                    {data.cancelReason && `: ${data.cancelReason}`}
                  </div>
                )}

                {/* Amounts */}
                {data.totalAmount != null && (
                  <div className="rounded-lg border p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground"><T>Total</T></span>
                      <span className="font-semibold">
                        {data.currency} {data.totalAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground"><T>Paid</T></span>
                      <span className="text-emerald-600 font-medium">
                        {data.currency} {(data.paidAmount || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-muted-foreground"><T>Balance</T></span>
                      <span className="font-semibold">
                        {data.currency} {(data.balanceDue ?? 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {data.estimatedDays != null && data.status !== "COMPLETED" && data.status !== "CANCELLED" && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <T>Estimated completion</T>: {data.estimatedDays}{" "}
                    <T>days</T>
                  </p>
                )}

                {/* Shop */}
                {data.shop && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground border-t pt-3">
                    <Store className="h-4 w-4 text-amber-600" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {data.shop.shopName}
                    </span>
                    {data.shop.city && <span>· {data.shop.city}</span>}
                  </div>
                )}
              </CardContent>
            </Card>

            <p className="text-center text-xs text-muted-foreground">
              <T>Powered by</T> <span className="font-semibold text-amber-700">Orivraa</span>
            </p>
          </>
        )}
        {loading && (
          <p className="text-center text-xs text-muted-foreground">
            <T>Loading…</T>
          </p>
        )}
      </div>
    </div>
  );
}
