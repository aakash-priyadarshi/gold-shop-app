"use client";

import { T } from "@/components/ui/T";
import { Button } from "@/components/ui/button";
import { ordersApi } from "@/lib/api";
import { formatCurrencyAmount } from "@/lib/currency";
import { Loader2, Package, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface CustomerOrder {
  id: string;
  orderNumber: string;
  orderType: string;
  status: string;
  detailedStatus?: string;
  totalNpr: number;
  displayCurrency?: string;
  createdAt: string;
  shop?: { shopName: string };
}

export default function MobileCustomerOrdersPage() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ordersApi.getMyOrders({ limit: 50 });
      const data = res.data?.orders ?? res.data ?? [];
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          <T>My orders</T>
        </h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/rfq/create">
            <T>New request</T>
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p>
            <T>No marketplace orders yet.</T>
          </p>
          <Button className="mt-4" asChild>
            <Link href="/rfq/create">
              <T>Request a custom piece</T>
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/dashboard/customer/orders/${o.id}`}
              className="block rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">#{o.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.shop?.shopName || "Shop"} ·{" "}
                    {new Date(o.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Package className="h-5 w-5 text-amber-500 shrink-0" />
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {(o.detailedStatus || o.status).replace(/_/g, " ")}
                </span>
                <span className="font-medium">
                  {formatCurrencyAmount(
                    o.totalNpr,
                    (o.displayCurrency || "NPR") as "NPR" | "INR",
                  )}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
