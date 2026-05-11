"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { T } from "@/components/ui/T";
import { shopQuotesApi } from "@/lib/api";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Hammer,
  Loader2,
  Package,
  PackageCheck,
  RefreshCw,
  Store,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface TrackingData {
  quoteNumber: string;
  invoiceNumber: string | null;
  jewelleryType: string;
  status: string;
  estimatedDays: number | null;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  startedAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  shop: { shopName: string; city: string; country: string };
  customerName: string;
}

const STATUS_STEPS = [
  { key: "QUOTED", label: "Quote Ready", icon: Clock, color: "text-amber-500" },
  {
    key: "CONFIRMED",
    label: "Confirmed",
    icon: CheckCircle2,
    color: "text-blue-500",
  },
  {
    key: "IN_PROGRESS",
    label: "Being Made",
    icon: Hammer,
    color: "text-purple-500",
  },
  {
    key: "READY",
    label: "Ready for Pickup",
    icon: Package,
    color: "text-green-500",
  },
  {
    key: "COMPLETED",
    label: "Delivered",
    icon: PackageCheck,
    color: "text-green-600",
  },
];

const STATUS_ORDER = [
  "QUOTED",
  "CONFIRMED",
  "IN_PROGRESS",
  "READY",
  "COMPLETED",
];

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatJewelleryType(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function TrackOrderPage() {
  const params = useParams();
  const token = params?.token as string;

  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchTracking = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await shopQuotesApi.trackByToken(token);
      setData(res.data);
      setLastRefreshed(new Date());
    } catch (err: unknown) {
      const axiosErr = err as any;
      const msg = axiosErr?.response?.data?.message;
      setError(
        typeof msg === "string"
          ? msg
          : "Invalid or expired tracking link.",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTracking();
  }, [fetchTracking]);

  const currentStatusIndex = data
    ? STATUS_ORDER.indexOf(data.status)
    : -1;
  const isCancelled = data?.status === "CANCELLED";

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b border-amber-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-amber-600 font-bold text-lg">
            ✨ Orivraa
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchTracking}
            disabled={loading}
            className="text-muted-foreground"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-1 hidden sm:inline"><T>Refresh</T></span>
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            <p><T>Loading order status...</T></p>
          </div>
        )}

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6 flex flex-col items-center gap-3 text-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <h2 className="font-semibold text-lg"><T>Tracking Not Found</T></h2>
              <p className="text-muted-foreground text-sm">{error}</p>
              <Link href="/">
                <Button variant="outline" size="sm">
                  <T>Go to Homepage</T>
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {data && (
          <>
            {/* Order Header */}
            <Card className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0">
              <CardContent className="pt-6 pb-4">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-amber-100 text-sm uppercase tracking-wide font-medium">
                      <T>Order Reference</T>
                    </p>
                    <p className="font-mono font-bold text-xl mt-0.5">
                      {data.quoteNumber}
                    </p>
                    {data.invoiceNumber && (
                      <p className="text-amber-100 text-xs mt-1">
                        Invoice: {data.invoiceNumber}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-amber-100 text-sm">
                      {formatJewelleryType(data.jewelleryType)}
                    </p>
                    <p className="text-amber-100 text-xs mt-0.5">
                      {t_str("for")} {data.customerName}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shop info */}
            <Card>
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <Store className="h-5 w-5 text-amber-500 shrink-0" />
                <div>
                  <p className="font-medium">{data.shop.shopName}</p>
                  <p className="text-sm text-muted-foreground">
                    {data.shop.city}, {data.shop.country}
                  </p>
                </div>
                {data.estimatedDays && (
                  <Badge variant="secondary" className="ml-auto">
                    ~{data.estimatedDays} days
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Status tracker */}
            {isCancelled ? (
              <Card className="border-destructive/40">
                <CardContent className="pt-6 flex flex-col items-center gap-3 text-center">
                  <XCircle className="h-10 w-10 text-destructive" />
                  <h3 className="font-semibold text-lg"><T>Order Cancelled</T></h3>
                  {data.cancelReason && (
                    <p className="text-muted-foreground text-sm">{data.cancelReason}</p>
                  )}
                  {data.cancelledAt && (
                    <p className="text-xs text-muted-foreground">
                      {formatDate(data.cancelledAt)}
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base"><T>Order Progress</T></CardTitle>
                  <CardDescription>
                    <T>Live status of your custom jewellery order</T>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-0">
                    {STATUS_STEPS.map((step, idx) => {
                      const isDone = idx <= currentStatusIndex;
                      const isCurrent = idx === currentStatusIndex;
                      const Icon = step.icon;

                      const timestamps: Record<string, string | null> = {
                        QUOTED: data.createdAt,
                        CONFIRMED: data.confirmedAt,
                        IN_PROGRESS: data.startedAt,
                        READY: data.readyAt,
                        COMPLETED: data.completedAt,
                      };

                      return (
                        <div key={step.key} className="flex gap-4">
                          {/* Icon + line */}
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                                isDone
                                  ? "bg-green-500 border-green-500 text-white"
                                  : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-400"
                              } ${isCurrent ? "ring-2 ring-offset-2 ring-green-400" : ""}`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            {idx < STATUS_STEPS.length - 1 && (
                              <div
                                className={`w-0.5 h-8 mt-1 ${
                                  idx < currentStatusIndex
                                    ? "bg-green-400"
                                    : "bg-gray-200 dark:bg-gray-700"
                                }`}
                              />
                            )}
                          </div>

                          {/* Label */}
                          <div className="pb-8 pt-1.5">
                            <p
                              className={`font-medium text-sm ${
                                isCurrent
                                  ? "text-green-600 dark:text-green-400"
                                  : isDone
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                              }`}
                            >
                              <T>{step.label}</T>
                              {isCurrent && (
                                <Badge
                                  variant="default"
                                  className="ml-2 bg-green-500 text-white text-xs"
                                >
                                  <T>Current</T>
                                </Badge>
                              )}
                            </p>
                            {timestamps[step.key] && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {formatDate(timestamps[step.key])}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Last refreshed */}
            <p className="text-center text-xs text-muted-foreground">
              <T>Last updated</T>:{" "}
              {lastRefreshed.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </>
        )}
      </main>
    </div>
  );
}

// Small utility since we're not in a component with useT
function t_str(s: string) {
  return s;
}
