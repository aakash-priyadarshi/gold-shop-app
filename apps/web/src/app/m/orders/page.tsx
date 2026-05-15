"use client";

import { MobileFeatureGate } from "@/components/mobile/MobileFeatureGate";
import { MobileHelpButton } from "@/components/mobile/MobileHelpButton";
import { T } from "@/components/ui/T";
import { useAuth } from "@/hooks/useAuth";
import { ordersApi } from "@/lib/api";
import {
    CheckCircle,
    ChevronRight,
    Clock,
    Loader2,
    Package,
    RefreshCw,
    Truck,
    XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface Order {
  id: string;
  orderNumber?: string;
  status: string;
  totalNpr?: number;
  totalAmount?: number;
  customer?: { firstName?: string; lastName?: string; phone?: string };
  createdAt: string;
  items?: any[];
  customRequirements?: string;
  type?: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  PENDING: { label: "Pending", color: "text-yellow-700", bg: "bg-yellow-50", icon: Clock },
  CONFIRMED: { label: "Confirmed", color: "text-blue-700", bg: "bg-blue-50", icon: Package },
  PROCESSING: { label: "Processing", color: "text-purple-700", bg: "bg-purple-50", icon: Package },
  READY: { label: "Ready", color: "text-green-700", bg: "bg-green-50", icon: CheckCircle },
  SHIPPED: { label: "Shipped", color: "text-indigo-700", bg: "bg-indigo-50", icon: Truck },
  DELIVERED: { label: "Delivered", color: "text-green-700", bg: "bg-green-50", icon: CheckCircle },
  CANCELLED: { label: "Cancelled", color: "text-red-700", bg: "bg-red-50", icon: XCircle },
};

function OrderCard({ order }: { order: Order }) {
  const s = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING;
  const Icon = s.icon;
  const name = [order.customer?.firstName, order.customer?.lastName]
    .filter(Boolean)
    .join(" ") || "Walk-in";
  const amount = order.totalNpr ?? order.totalAmount ?? 0;
  const time = new Date(order.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Link
      href={`/dashboard/shop/orders/${order.id}`}
      className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 px-4 py-3.5 active:bg-gray-50 transition-colors"
    >
      <div className={`h-10 w-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`h-5 w-5 ${s.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
          <p className="text-sm font-bold text-amber-700 flex-shrink-0 ml-2">
            NPR {amount.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}
          >
            {s.label}
          </span>
          <span className="text-xs text-gray-400">{time}</span>
        </div>
        {order.orderNumber && (
          <p className="text-[10px] text-gray-400 mt-0.5">#{order.orderNumber}</p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
    </Link>
  );
}

const TAB_FILTERS = [
  { label: "All", status: undefined },
  { label: "Pending", status: "PENDING" },
  { label: "Processing", status: "PROCESSING" },
  { label: "Ready", status: "READY" },
];

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | undefined>(undefined);
  const shopId = user?.shop?.id;

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      // Load today's orders
      const today = new Date().toISOString().split("T")[0];
      const res = await ordersApi.getShopOrders(shopId, {
        dateFrom: today,
        dateTo: today,
        limit: 50,
        status: activeFilter,
      });
      setOrders(res.data?.orders ?? res.data?.items ?? res.data ?? []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [shopId, activeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const displayOrders = activeFilter
    ? orders.filter((o) => o.status === activeFilter)
    : orders;

  return (
    <MobileFeatureGate feature="mobileOrders" featureName="Orders">
      <div className="flex flex-col h-full">
      {/* Header + tabs */}
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-base font-bold text-gray-900"><T>Today&apos;s Orders</T></h1>
            <p className="text-xs text-gray-400">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <MobileHelpButton
              title="Today's Orders"
              description="Every bill you create today appears here in real time."
              tips={[
                "Tap any order to see the itemised invoice",
                "Use the Reprint or Share buttons to send the bill on WhatsApp again",
                "Filter by Pending / Paid to chase pending payments",
                "Pull-to-refresh or tap the refresh icon for the latest data",
              ]}
            />
            <button
              onClick={load}
              disabled={loading}
              className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 active:bg-gray-200"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-amber-500" : ""}`} />
            </button>
          </div>
        </div>
        {/* Status tabs */}
        <div data-tour="m-orders-filter" className="flex gap-3 overflow-x-auto scrollbar-none pb-3">
          {TAB_FILTERS.map((t) => (
            <button
              key={t.label}
              onClick={() => setActiveFilter(t.status)}
              className={`flex-shrink-0 text-xs px-4 py-1.5 rounded-full font-semibold transition-colors ${
                activeFilter === t.status
                  ? "bg-amber-500 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <T>{t.label}</T>
            </button>
          ))}
        </div>
      </div>

      {/* Orders list */}
      <div data-tour="m-orders-list" className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
          </div>
        ) : displayOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
            <Package className="h-10 w-10" />
            <p className="text-sm font-medium"><T>No orders today</T></p>
            <p className="text-xs text-center text-gray-300">
              <T>Orders placed today will appear here</T>
            </p>
          </div>
        ) : (
          displayOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))
        )}
      </div>
    </div>
    </MobileFeatureGate>
  );
}
