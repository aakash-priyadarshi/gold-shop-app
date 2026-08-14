"use client";

import { MobileFeatureGate } from "@/components/mobile/MobileFeatureGate";
import { T } from "@/components/ui/T";
import { useAuth } from "@/hooks/useAuth";
import { invoicesApi } from "@/lib/api";
import { formatCurrencyAmount, getCurrencyForCountry } from "@/lib/currency";
import { FilePlus2, Loader2, Receipt, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Invoice = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  currency: string;
  status: string;
  paymentStatus: string;
  issuedAt?: string | null;
};

function InvoiceListPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await invoicesApi.getAll({ search: search.trim() || undefined, limit: 100 });
      setInvoices(response.data?.invoices ?? response.data?.data?.invoices ?? []);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  const fallbackCurrency = getCurrencyForCountry(user?.shop?.country);
  return (
    <div className="px-4 py-4 space-y-4 text-gray-900 dark:text-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold"><T>Invoices</T></h1>
          <p className="text-xs text-gray-500"><T>Counter, quote, and manual bills</T></p>
        </div>
        <Link
          href="/m/invoices/create"
          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-sm font-bold text-white"
        >
          <FilePlus2 className="h-4 w-4" /> <T>New</T>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Invoice number or customer"
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 py-2.5 pl-9 pr-3 text-sm text-gray-900 dark:text-gray-100"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>
      ) : invoices.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-500"><T>No invoices found</T></div>
      ) : (
        <div className="space-y-2">
          {invoices.map((invoice) => {
            const currency = invoice.currency || fallbackCurrency;
            return (
              <Link
                key={invoice.id}
                href={`/m/invoices/${invoice.id}`}
                className="flex items-center gap-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 shadow-sm"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Receipt className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">#{invoice.invoiceNumber}</span>
                  <span className="block truncate text-xs text-gray-500">{invoice.customerName || "Walk-in customer"}</span>
                </span>
                <span className="text-right">
                  <span className="block text-sm font-bold text-amber-700">{formatCurrencyAmount(Number(invoice.totalAmount || 0), currency as any)}</span>
                  <span className={`text-[11px] font-semibold ${Number(invoice.balanceDue || 0) > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {Number(invoice.balanceDue || 0) > 0 ? <T>Due</T> : <T>Paid</T>}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function MobileInvoicesPage() {
  return (
    <MobileFeatureGate feature="mobileInvoices" featureName="Invoices">
      <InvoiceListPage />
    </MobileFeatureGate>
  );
}
