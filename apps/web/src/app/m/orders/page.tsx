"use client";

import { MobileFeatureGate } from "@/components/mobile/MobileFeatureGate";

import { T } from "@/components/ui/T";
import { useAuth } from "@/hooks/useAuth";
import { invoicesApi } from "@/lib/api";
import { shareBillOnWhatsApp } from "@/lib/billShare";
import {
    CheckCircle,
    Clock,
    FileText,
    Loader2,
    Receipt,
    RefreshCw,
    Share2,
    XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName?: string | null;
  customerPhone?: string | null;
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
  lineItems?: any;
}

interface StatusMeta {
  label: string;
  bg: string;
  color: string;
  Icon: React.ElementType;
}

const STATUS_META: Record<string, StatusMeta> = {
  DRAFT: { label: "Draft", bg: "bg-gray-100", color: "text-gray-600", Icon: FileText },
  ISSUED: { label: "Issued", bg: "bg-blue-100", color: "text-blue-700", Icon: Clock },
  PAID: { label: "Paid", bg: "bg-green-100", color: "text-green-700", Icon: CheckCircle },
  PARTIALLY_PAID: { label: "Partial", bg: "bg-amber-100", color: "text-amber-700", Icon: Clock },
  OVERDUE: { label: "Overdue", bg: "bg-red-100", color: "text-red-700", Icon: Clock },
  VOID: { label: "Void", bg: "bg-gray-100", color: "text-gray-500", Icon: XCircle },
  CANCELLED: { label: "Cancelled", bg: "bg-red-100", color: "text-red-600", Icon: XCircle },
};

function statusMeta(s?: string): StatusMeta {
  return STATUS_META[(s || "ISSUED").toUpperCase()] ?? STATUS_META.ISSUED;
}

const TAB_FILTERS = [
  { label: "All", status: undefined as string | undefined },
  { label: "Paid", status: "PAID" },
  { label: "Pending", status: "ISSUED" },
  { label: "Partial", status: "PARTIALLY_PAID" },
  { label: "Void", status: "VOID" },
];

function InvoiceCard({
  inv,
  shopName,
  shopPhone,
}: {
  inv: Invoice;
  shopName?: string;
  shopPhone?: string;
}) {
  const router = useRouter();
  const s = statusMeta(inv.status);
  const currency = inv.currency || "NPR";
  const amount = inv.totalAmount ?? 0;
  const dateRaw = inv.issuedAt || inv.createdAt;
  const date = dateRaw ? new Date(dateRaw) : null;
  const time =
    date?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) ?? "—";
  const dateStr = date?.toLocaleDateString() ?? "";
  const Icon = s.Icon;

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const lineItems = Array.isArray(inv.lineItems) ? inv.lineItems : [];
    shareBillOnWhatsApp(
      {
        shopName,
        shopPhone,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customerName,
        customerPhone: inv.customerPhone,
        currency,
        subtotal: inv.subtotal,
        taxAmount: inv.taxAmount,
        taxLabel: inv.taxLabel,
        discountAmount: inv.discountAmount,
        totalAmount: inv.totalAmount,
        paidAmount: inv.paidAmount,
        balanceDue: inv.balanceDue,
        lineItems,
        issuedAt: dateRaw,
      },
      inv.customerPhone,
    );
  };

  const openDetails = () => router.push(`/m/orders/${inv.id}`);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openDetails}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") openDetails();
      }}
      className="bg-white rounded-2xl border border-gray-100 px-4 py-3.5 active:bg-amber-50"
    >
      <div className="flex items-center gap-3">
        <div
          className={`h-10 w-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}
        >
          <Icon className={`h-5 w-5 ${s.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {inv.customerName || "Walk-in"}
            </p>
            <p className="text-sm font-bold text-amber-700 flex-shrink-0 ml-2">
              {currency} {amount.toLocaleString()}
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
          <div className="flex items-center justify-between mt-1">
            <p className="text-[11px] text-gray-400 truncate">
              #{inv.invoiceNumber} {dateStr && `· ${dateStr}`}
            </p>
            {inv.balanceDue && inv.balanceDue > 0 ? (
              <p className="text-[11px] text-red-500 font-medium ml-2 flex-shrink-0">
                Due {currency} {inv.balanceDue.toLocaleString()}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold active:bg-emerald-100"
        >
          <Share2 className="h-3.5 w-3.5" />
          <T>WhatsApp</T>
        </button>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | undefined>(undefined);
  const [scope, setScope] = useState<"today" | "all">("today");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (scope === "today") {
        params.dateFrom = new Date().toISOString().split("T")[0];
      }
      if (activeFilter) params.status = activeFilter;
      const res = await invoicesApi.getAll(params);
      const data: any =
        res.data?.invoices ?? res.data?.items ?? res.data?.data ?? res.data ?? [];
      setInvoices(Array.isArray(data) ? data : []);
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [scope, activeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const displayed = activeFilter
    ? invoices.filter((i) => (i.status || "").toUpperCase() === activeFilter)
    : invoices;

  return (
    <MobileFeatureGate feature="mobileOrders" featureName="Orders">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-base font-bold text-gray-900">
                <T>{scope === "today" ? "Today's Bills" : "All Bills"}</T>
              </h1>
              <p className="text-xs text-gray-400">
                {new Date().toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
            </div>
            <div className="flex items-center gap-1">

              <button
                onClick={load}
                disabled={loading}
                className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 active:bg-gray-200"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin text-amber-500" : ""}`}
                />
              </button>
            </div>
          </div>

          {/* Scope toggle */}
          <div className="flex gap-2 mb-2">
            {(["today", "all"] as const).map((sc) => (
              <button
                key={sc}
                onClick={() => setScope(sc)}
                className={`flex-1 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  scope === sc
                    ? "bg-amber-100 text-amber-800"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                <T>{sc === "today" ? "Today" : "All time"}</T>
              </button>
            ))}
          </div>

          {/* Status tabs */}
          <div
            data-tour="m-orders-filter"
            className="flex gap-3 overflow-x-auto scrollbar-none pb-3"
          >
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

        {/* List */}
        <div
          data-tour="m-orders-list"
          className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        >
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
              <Receipt className="h-10 w-10" />
              <p className="text-sm font-medium">
                <T>{scope === "today" ? "No bills today" : "No bills yet"}</T>
              </p>
              <p className="text-xs text-center text-gray-300">
                <T>Bills you create from POS will appear here</T>
              </p>
            </div>
          ) : (
            displayed.map((inv) => (
              <InvoiceCard
                key={inv.id}
                inv={inv}
                shopName={user?.shop?.shopName}
                shopPhone={(user?.shop as any)?.contactPhone}
              />
            ))
          )}
        </div>
      </div>
    </MobileFeatureGate>
  );
}
