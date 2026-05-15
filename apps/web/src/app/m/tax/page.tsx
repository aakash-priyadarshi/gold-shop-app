"use client";

import { MobileFeatureGate } from "@/components/mobile/MobileFeatureGate";
import { T } from "@/components/ui/T";
import { useAuth } from "@/hooks/useAuth";
import { taxReportsApi } from "@/lib/api";
import {
    ChevronDown,
    Download,
    FileSpreadsheet,
    FileText,
    Loader2,
    Receipt,
    TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Country = "INDIA" | "NEPAL";

function getMonthOptions() {
  const opts: { label: string; value: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    opts.push({
      label: d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
      value,
    });
  }
  return opts;
}

interface TaxSummary {
  totalSales: number;
  taxCollected: number;
  taxableAmount: number;
  invoiceCount: number;
  currency: string;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-1">
      <p className="text-xs text-gray-500"><T>{label}</T></p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export default function TaxPage() {
  const { user } = useAuth();
  const [country, setCountry] = useState<Country>("NEPAL");
  const monthOptions = getMonthOptions();
  const [period, setPeriod] = useState(monthOptions[0].value);
  const [summary, setSummary] = useState<TaxSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await taxReportsApi.summary(country, period);
      setSummary(res.data);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [country, period]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownload = async (type: string) => {
    setDownloading(type);
    try {
      if (country === "INDIA") {
        if (type === "gstr1-csv") {
          const res = await taxReportsApi.indiaGstr1(period, "csv");
          downloadBlob(res.data, `GSTR1_${period}.csv`);
        } else if (type === "gstr3b") {
          const res = await taxReportsApi.indiaGstr3b(period);
          const text = JSON.stringify(res.data, null, 2);
          downloadBlob(new Blob([text], { type: "application/json" }), `GSTR3B_${period}.json`);
        } else if (type === "tally") {
          const res = await taxReportsApi.indiaTallyXml(period);
          downloadBlob(res.data, `Tally_${period}.xml`);
        }
      } else if (country === "NEPAL") {
        const res = await taxReportsApi.nepalVat(period);
        const text = JSON.stringify(res.data, null, 2);
        downloadBlob(new Blob([text], { type: "application/json" }), `VAT_${period}.json`);
      }
    } catch {
      // pass
    } finally {
      setDownloading(null);
    }
  };

  const cur = summary?.currency ?? (country === "INDIA" ? "INR" : "NPR");
  const fmt = (n: number) => `${cur} ${n.toLocaleString("en-IN")}`;

  return (
    <MobileFeatureGate feature="mobileTaxReports" featureName="Mobile Tax Reports">
      <div className="px-4 py-5 space-y-5">
      {/* Filters */}
      <div className="grid grid-cols-2 gap-3">
        {/* Country */}
        <div data-tour="m-tax-country" className="relative">
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value as Country)}
            className="w-full appearance-none px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl pr-8 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
          >
            <option value="NEPAL">🇳🇵 Nepal (VAT)</option>
            <option value="INDIA">🇮🇳 India (GST)</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
        {/* Period */}
        <div data-tour="m-tax-period" className="relative">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full appearance-none px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl pr-8 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {monthOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Summary */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
        </div>
      ) : summary ? (
        <div data-tour="m-tax-stats" className="grid grid-cols-2 gap-3">
          <StatCard label="Total Sales" value={fmt(summary.totalSales)} />
          <StatCard label="Tax Collected" value={fmt(summary.taxCollected)} />
          <StatCard label="Taxable Amount" value={fmt(summary.taxableAmount)} />
          <StatCard
            label="Invoices"
            value={String(summary.invoiceCount)}
            sub={monthOptions.find((o) => o.value === period)?.label}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
          <TrendingUp className="h-8 w-8" />
          <p className="text-sm"><T>No data for this period</T></p>
        </div>
      )}

      {/* Download buttons */}
      <div data-tour="m-tax-download" className="space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          <T>Download Reports</T>
        </p>

        {country === "INDIA" && (
          <>
            <DownloadRow
              label="GSTR-1 (CSV)"
              desc="B2B & B2C sales for GST portal"
              icon={FileSpreadsheet}
              loading={downloading === "gstr1-csv"}
              onPress={() => handleDownload("gstr1-csv")}
            />
            <DownloadRow
              label="GSTR-3B (JSON)"
              desc="Monthly summary return"
              icon={FileText}
              loading={downloading === "gstr3b"}
              onPress={() => handleDownload("gstr3b")}
            />
            <DownloadRow
              label="Tally XML"
              desc="Import into Tally ERP"
              icon={Download}
              loading={downloading === "tally"}
              onPress={() => handleDownload("tally")}
            />
          </>
        )}

        {country === "NEPAL" && (
          <DownloadRow
            label="VAT Return (JSON)"
            desc="Nepal IRD VAT data"
            icon={Receipt}
            loading={downloading === "nepal-vat"}
            onPress={() => handleDownload("nepal-vat")}
          />
        )}
      </div>
    </div>
    </MobileFeatureGate>
  );
}

function DownloadRow({
  label,
  desc,
  icon: Icon,
  loading,
  onPress,
}: {
  label: string;
  desc: string;
  icon: React.ElementType;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <button
      onClick={onPress}
      disabled={loading}
      className="w-full flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl border border-gray-100 active:bg-gray-50 text-left disabled:opacity-50"
    >
      <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
        {loading ? (
          <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
        ) : (
          <Icon className="h-5 w-5 text-amber-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900"><T>{label}</T></p>
        <p className="text-xs text-gray-500"><T>{desc}</T></p>
      </div>
      <Download className="h-4 w-4 text-gray-300 flex-shrink-0" />
    </button>
  );
}
