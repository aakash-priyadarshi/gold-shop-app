"use client";

import { MobileFeatureGate } from "@/components/mobile/MobileFeatureGate";

import { T } from "@/components/ui/T";
import { useAuth } from "@/hooks/useAuth";
import { shopQuotesApi } from "@/lib/api";
import {
  formatCurrencyAmount,
  getCurrencyForCountry,
  type SupportedCurrencyCode,
} from "@/lib/currency";
import {
    CheckCircle,
    Clock,
    FileText,
    Loader2,
    Receipt,
    RefreshCw,
    Search,
    XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface ShopQuote {
  id: string;
  quoteNumber: string;
  invoiceNumber?: string | null;
  jewelleryType?: string;
  status: string;
  totalPriceNpr?: number | null;
  advancePaidNpr?: number;
  balanceDueNpr?: number | null;
  createdAt: string;
  invoicedAt?: string | null;
  walkInCustomer: {
    id: string;
    name: string;
    phone?: string;
  };
}

interface StatusMeta {
  label: string;
  bg: string;
  color: string;
  Icon: React.ElementType;
}

// Payment-aware status display
function quoteStatusMeta(q: ShopQuote): StatusMeta {
  const hasInvoice = !!q.invoiceNumber;
  const balance = q.balanceDueNpr ?? 0;
  if (hasInvoice && balance <= 0) {
    return { label: "Paid", bg: "bg-green-100", color: "text-green-700", Icon: CheckCircle };
  }
  if (hasInvoice && balance > 0) {
    return { label: "Partial", bg: "bg-amber-100", color: "text-amber-700", Icon: Clock };
  }
  const map: Record<string, StatusMeta> = {
    QUOTED:      { label: "Quote sent",  bg: "bg-blue-100",  color: "text-blue-700",   Icon: FileText },
    CONFIRMED:   { label: "Confirmed",   bg: "bg-purple-100",color: "text-purple-700", Icon: Clock },
    IN_PROGRESS: { label: "In Progress", bg: "bg-orange-100",color: "text-orange-700", Icon: Clock },
    READY:       { label: "Ready",       bg: "bg-cyan-100",  color: "text-cyan-700",   Icon: CheckCircle },
    COMPLETED:   { label: "Completed",   bg: "bg-green-100", color: "text-green-700",  Icon: CheckCircle },
    CANCELLED:   { label: "Cancelled",   bg: "bg-red-100",   color: "text-red-600",    Icon: XCircle },
  };
  return map[(q.status || "QUOTED").toUpperCase()] ?? map.QUOTED;
}

const TAB_FILTERS = [
  { label: "All",         filterFn: (_q: ShopQuote) => true },
  { label: "Paid",        filterFn: (q: ShopQuote) => !!q.invoiceNumber && (q.balanceDueNpr ?? 0) <= 0 },
  { label: "Partial",     filterFn: (q: ShopQuote) => !!q.invoiceNumber && (q.balanceDueNpr ?? 0) > 0 },
  { label: "In Progress", filterFn: (q: ShopQuote) => q.status === "IN_PROGRESS" },
  { label: "Quote",       filterFn: (q: ShopQuote) => q.status === "QUOTED" },
  { label: "Cancelled",   filterFn: (q: ShopQuote) => q.status === "CANCELLED" },
];

function QuoteCard({ q, currency }: { q: ShopQuote; currency: SupportedCurrencyCode }) {
  const router = useRouter();
  const s = quoteStatusMeta(q);
  const total = q.totalPriceNpr ?? 0;
  const balance = q.balanceDueNpr ?? 0;
  const date = q.createdAt ? new Date(q.createdAt) : null;
  const time = date?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) ?? "—";
  const dateStr = date?.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) ?? "";
  const Icon = s.Icon;
  const label = q.invoiceNumber ? `#${q.invoiceNumber}` : `#${q.quoteNumber}`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/m/orders/${q.id}`)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/m/orders/${q.id}`); }}
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-4 py-3.5 active:bg-amber-50 dark:active:bg-amber-900/10"
    >
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`h-5 w-5 ${s.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {q.walkInCustomer?.name || "Walk-in"}
            </p>
            <p className="text-sm font-bold text-amber-700 flex-shrink-0 ml-2">
              {formatCurrencyAmount(total, currency)}
            </p>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}>
              {s.label}
            </span>
            <span className="text-xs text-gray-400">{time}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[11px] text-gray-400 truncate">
              {label}{dateStr && ` · ${dateStr}`}{q.jewelleryType && ` · ${q.jewelleryType.replace(/_/g, " ")}`}
            </p>
            {balance > 0 ? (
              <p className="text-[11px] text-amber-600 font-medium ml-2 flex-shrink-0">
                Due {formatCurrencyAmount(balance, currency)}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<ShopQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilterIdx, setActiveFilterIdx] = useState(0);
  const [scope, setScope] = useState<"today" | "all">("today");
  const [searchQuery, setSearchQuery] = useState("");
  // Derive the shop's local currency from its country setting (single source of truth).
  // *Npr DB fields store amounts in this local currency — no FX conversion needed.
  const currency = getCurrencyForCountry(user?.shop?.country) as SupportedCurrencyCode;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await shopQuotesApi.getAll();
      const data: any = res.data ?? [];
      setQuotes(Array.isArray(data) ? data : []);
    } catch {
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Scope filter: today vs all
  const today = new Date().toISOString().split("T")[0];
  const scopeFiltered = scope === "today"
    ? quotes.filter((q) => q.createdAt?.startsWith(today))
    : quotes;

  // Search filter (by customer name, invoice or quote number)
  const searchFiltered = searchQuery.trim()
    ? scopeFiltered.filter((q) => {
        const q2 = searchQuery.toLowerCase();
        return (
          q.walkInCustomer?.name?.toLowerCase().includes(q2) ||
          q.invoiceNumber?.toLowerCase().includes(q2) ||
          q.quoteNumber?.toLowerCase().includes(q2)
        );
      })
    : scopeFiltered;

  const displayed = searchFiltered.filter(TAB_FILTERS[activeFilterIdx].filterFn);

  return (
    <MobileFeatureGate feature="mobileOrders" featureName="Orders">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 pt-4 pb-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-base font-bold text-gray-900 dark:text-gray-100">
                <T>{scope === "today" ? "Today's Quotes & Bills" : "All Quotes & Bills"}</T>
              </h1>
              <p className="text-xs text-gray-400">
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-amber-500" : ""}`} />
            </button>
          </div>

          {/* Scope toggle */}
          <div className="flex gap-2 mb-2">
            {(["today", "all"] as const).map((sc) => (
              <button
                key={sc}
                onClick={() => setScope(sc)}
                className={`flex-1 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  scope === sc ? "bg-amber-100 text-amber-800" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                }`}
              >
                <T>{sc === "today" ? "Today" : "All time"}</T>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or bill #"
              className="w-full pl-8 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 rounded-xl border-0 outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Status tabs */}
          <div data-tour="m-orders-filter" className="flex gap-2 overflow-x-auto scrollbar-none pb-3">
            {TAB_FILTERS.map((t, i) => (
              <button
                key={t.label}
                onClick={() => setActiveFilterIdx(i)}
                className={`flex-shrink-0 text-xs px-4 py-1.5 rounded-full font-semibold transition-colors ${
                  activeFilterIdx === i ? "bg-amber-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                }`}
              >
                <T>{t.label}</T>
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div data-tour="m-orders-list" className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
              <Receipt className="h-10 w-10" />
              <p className="text-sm font-medium">
                <T>{scope === "today" ? "No quotes/bills today" : "No quotes or bills yet"}</T>
              </p>
              <p className="text-xs text-center text-gray-300 dark:text-gray-600">
                <T>Quotes you create will appear here once billed</T>
              </p>
            </div>
          ) : (
            displayed.map((q) => <QuoteCard key={q.id} q={q} currency={currency} />)
          )}
        </div>
      </div>
    </MobileFeatureGate>
  );
}
